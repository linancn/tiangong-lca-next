import { supabase } from '@/services/supabase';
import { z } from 'zod';

export const organizationContributionDatasetScopes = ['process', 'model', 'all'] as const;

export type OrganizationContributionDatasetScope =
  (typeof organizationContributionDatasetScopes)[number];

const nonnegativeInteger = z.number().int().nonnegative();
const isoCalendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const dailyCreationDaySchema = z
  .object({
    date: isoCalendarDate,
    processCount: nonnegativeInteger,
    modelCount: nonnegativeInteger,
    allCount: nonnegativeInteger,
  })
  .strict()
  .refine((day) => day.allCount === day.processCount + day.modelCount, {
    message: 'allCount must equal processCount + modelCount',
    path: ['allCount'],
  });

const dailyCreationSchema = z
  .object({
    metric: z.literal('dataset_version_created_count'),
    deduplicationKey: z.tuple([
      z.literal('datasetType'),
      z.literal('datasetId'),
      z.literal('version'),
    ]),
    timezone: z.literal('Asia/Shanghai'),
    startDate: isoCalendarDate,
    endDate: isoCalendarDate,
    days: z.array(dailyCreationDaySchema).min(365).max(371),
  })
  .strict()
  .superRefine((dailyCreation, context) => {
    const { days } = dailyCreation;
    if (days[0]?.date !== dailyCreation.startDate) {
      context.addIssue({
        code: 'custom',
        message: 'days must start at startDate',
        path: ['days', 0, 'date'],
      });
    }
    if (days[days.length - 1]?.date !== dailyCreation.endDate) {
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

const makeScopeSchema = (datasetScope: OrganizationContributionDatasetScope) =>
  z
    .object({
      datasetScope: z.literal(datasetScope),
      metric: z.literal('latest_published_dataset_count'),
      summary: z
        .object({
          organizationCount: nonnegativeInteger,
          publishedDatasetCount: nonnegativeInteger,
          pendingReviewDatasetCount: nonnegativeInteger,
          publishedLast30DaysCount: nonnegativeInteger,
        })
        .strict(),
      rankings: z.array(organizationContributionRankingSchema).max(50),
    })
    .strict();

export const organizationContributionSnapshotSchema = z
  .object({
    schemaVersion: z.literal('national_carbon_organization_contribution_v3'),
    attributionMode: z.literal('current_user_profile'),
    generatedAt: z.iso.datetime({ offset: true }),
    dataAsOf: z.iso.datetime({ offset: true }),
    defaultScope: z.literal('all'),
    dailyCreation: dailyCreationSchema,
    scopes: z
      .object({
        process: makeScopeSchema('process'),
        model: makeScopeSchema('model'),
        all: makeScopeSchema('all'),
      })
      .strict(),
  })
  .strict();

export type OrganizationContributionSnapshot = z.infer<
  typeof organizationContributionSnapshotSchema
>;
export type OrganizationContributionScopeSnapshot =
  OrganizationContributionSnapshot['scopes'][OrganizationContributionDatasetScope];

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
