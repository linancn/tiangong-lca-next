import { supabase } from '@/services/supabase';
import { z } from 'zod';

const nonnegativeInteger = z.number().int().nonnegative();
const isoCalendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const dailyActivityDaySchema = z
  .object({
    date: isoCalendarDate,
    processCount: nonnegativeInteger,
  })
  .strict();

const dailyActivitySchema = z
  .object({
    metric: z.literal('dataset_version_activity_count'),
    deduplicationKey: z.tuple([
      z.literal('datasetType'),
      z.literal('datasetId'),
      z.literal('version'),
      z.literal('date'),
    ]),
    timezone: z.literal('Asia/Shanghai'),
    startDate: isoCalendarDate,
    endDate: isoCalendarDate,
    days: z.array(dailyActivityDaySchema).min(365).max(371),
  })
  .strict()
  .superRefine((dailyActivity, context) => {
    const { days } = dailyActivity;
    if (days[0]?.date !== dailyActivity.startDate) {
      context.addIssue({
        code: 'custom',
        message: 'days must start at startDate',
        path: ['days', 0, 'date'],
      });
    }
    if (days[days.length - 1]?.date !== dailyActivity.endDate) {
      context.addIssue({
        code: 'custom',
        message: 'days must end at endDate',
        path: ['days', Math.max(days.length - 1, 0), 'date'],
      });
    }
    for (let index = 1; index < days.length; index += 1) {
      const previous = Date.parse(`${days[index - 1].date}T00:00:00Z`);
      const current = Date.parse(`${days[index].date}T00:00:00Z`);
      if (current - previous !== 86_400_000) {
        context.addIssue({
          code: 'custom',
          message: 'days must be unique and consecutive',
          path: ['days', index, 'date'],
        });
        break;
      }
    }
  });

const organizationContributionRankingSchema = z
  .object({
    rank: z.number().int().positive(),
    organizationKey: z.string().trim().min(1),
    organizationName: z.string().trim().min(1),
    publishedDatasetCount: nonnegativeInteger,
    assignedReviewerDatasetCount: nonnegativeInteger,
    unassignedReviewerDatasetCount: nonnegativeInteger,
  })
  .strict();

export const organizationContributionSnapshotSchema = z
  .object({
    schemaVersion: z.literal('national_carbon_organization_contribution_v5'),
    datasetScope: z.literal('process'),
    attributionMode: z.literal('current_user_profile'),
    generatedAt: z.iso.datetime({ offset: true }),
    dataAsOf: z.iso.datetime({ offset: true }),
    dailyActivity: dailyActivitySchema,
    summary: z
      .object({
        organizationCount: nonnegativeInteger,
        publishedDatasetCount: nonnegativeInteger,
        pendingReviewDatasetCount: nonnegativeInteger,
        reviewerCount: nonnegativeInteger,
      })
      .strict(),
    rankings: z.array(organizationContributionRankingSchema).max(50),
    organizations: z.array(organizationContributionRankingSchema),
    regions: z
      .object({
        metric: z.literal('latest_open_process_count'),
        totalProcessCount: nonnegativeInteger,
        items: z.array(
          z
            .object({
              locationCode: z.string().trim().min(1),
              processCount: nonnegativeInteger,
            })
            .strict(),
        ),
        globalProcessCount: nonnegativeInteger,
        unassignedProcessCount: nonnegativeInteger,
      })
      .strict(),
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (snapshot.organizations.length !== snapshot.summary.organizationCount) {
      context.addIssue({
        code: 'custom',
        message: 'All organizations must be returned',
        path: ['organizations'],
      });
    }
    const { regions } = snapshot;
    const regionTotal =
      regions.items.reduce((sum, item) => sum + item.processCount, 0) +
      regions.globalProcessCount +
      regions.unassignedProcessCount;
    if (regionTotal !== regions.totalProcessCount) {
      context.addIssue({
        code: 'custom',
        message: 'Regional counts must reconcile',
        path: ['regions'],
      });
    }
  });

export type OrganizationContributionSnapshot = z.infer<
  typeof organizationContributionSnapshotSchema
>;

export type OrganizationContributionErrorCode =
  | 'AUTH_REQUIRED'
  | 'SYSTEM_MANAGER_REQUIRED'
  | 'INVALID_LIMIT'
  | 'INVALID_SNAPSHOT'
  | 'DATABASE_ERROR';

export class OrganizationContributionError extends Error {
  readonly code: OrganizationContributionErrorCode;

  constructor(code: OrganizationContributionErrorCode, cause?: unknown) {
    super(code);
    this.name = 'OrganizationContributionError';
    this.code = code;
    if (cause !== undefined) {
      Object.defineProperty(this, 'cause', { configurable: true, value: cause });
    }
  }
}

type CacheEntry = {
  expiresAt: number;
  snapshot: OrganizationContributionSnapshot;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const snapshotCache = new Map<number, CacheEntry>();
const inFlightRequests = new Map<number, Promise<OrganizationContributionSnapshot>>();
const knownDatabaseErrorCodes = new Set<OrganizationContributionErrorCode>([
  'AUTH_REQUIRED',
  'SYSTEM_MANAGER_REQUIRED',
  'INVALID_LIMIT',
]);

function getDatabaseErrorCode(error: {
  code?: string;
  message?: string;
}): OrganizationContributionErrorCode {
  const candidate = error.message?.trim() as OrganizationContributionErrorCode | undefined;
  return candidate && knownDatabaseErrorCodes.has(candidate) ? candidate : 'DATABASE_ERROR';
}

async function requestOrganizationContributionSnapshot(
  limit: number,
): Promise<OrganizationContributionSnapshot> {
  const { data, error } = await supabase
    .schema('api')
    .rpc('qry_national_carbon_organization_contributions', { p_limit: limit });

  if (error) {
    throw new OrganizationContributionError(getDatabaseErrorCode(error), error);
  }

  const parsed = organizationContributionSnapshotSchema.safeParse(data);
  if (!parsed.success) {
    throw new OrganizationContributionError('INVALID_SNAPSHOT', parsed.error);
  }

  return parsed.data;
}

export async function getOrganizationContributionSnapshot(options?: {
  forceRefresh?: boolean;
  limit?: number;
}): Promise<OrganizationContributionSnapshot> {
  const limit = options?.limit ?? 10;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new OrganizationContributionError('INVALID_LIMIT');
  }

  const now = Date.now();
  const cached = snapshotCache.get(limit);
  if (!options?.forceRefresh && cached && cached.expiresAt > now) {
    return cached.snapshot;
  }

  const existingRequest = inFlightRequests.get(limit);
  if (existingRequest) {
    return existingRequest;
  }

  const request = requestOrganizationContributionSnapshot(limit)
    .then((snapshot) => {
      snapshotCache.set(limit, { expiresAt: Date.now() + CACHE_TTL_MS, snapshot });
      return snapshot;
    })
    .finally(() => {
      inFlightRequests.delete(limit);
    });

  inFlightRequests.set(limit, request);
  return request;
}

export function clearOrganizationContributionSnapshotCache(): void {
  snapshotCache.clear();
  inFlightRequests.clear();
}
