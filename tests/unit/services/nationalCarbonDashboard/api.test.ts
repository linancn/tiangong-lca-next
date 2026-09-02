const mockRpc = jest.fn();
const mockSchema = jest.fn((schema: string) => {
  void schema;
  return { rpc: mockRpc };
});

jest.mock('@/services/supabase', () => ({
  __esModule: true,
  supabase: { schema: (schema: string) => mockSchema(schema) },
}));

import {
  clearOrganizationContributionSnapshotCache,
  getOrganizationContributionSnapshot,
  organizationContributionSnapshotSchema,
} from '@/services/nationalCarbonDashboard/api';

const makeScope = (datasetScope: 'process' | 'model' | 'all', publishedDatasetCount: number) => ({
  datasetScope,
  metric: 'latest_published_dataset_count',
  summary: {
    organizationCount: publishedDatasetCount > 0 ? 1 : 0,
    publishedDatasetCount,
    pendingReviewDatasetCount: 2,
    publishedLast30DaysCount: 1,
  },
  rankings:
    publishedDatasetCount > 0
      ? [
          {
            rank: 1,
            organizationKey: 'example organization',
            organizationName: 'Example Organization',
            publishedDatasetCount,
            assignedReviewerDatasetCount: 1,
            unassignedReviewerDatasetCount: 1,
          },
        ]
      : [],
});

const dailyCreationDays = Array.from({ length: 366 }, (_, index) => {
  const date = new Date(Date.UTC(2025, 8, 1 + index)).toISOString().slice(0, 10);
  const processCount = index === 0 ? 1 : 0;
  const modelCount = index === 365 ? 2 : 0;
  return { allCount: processCount + modelCount, date, modelCount, processCount };
});

const validSnapshot = {
  schemaVersion: 'national_carbon_organization_contribution_v3',
  attributionMode: 'current_user_profile',
  generatedAt: '2026-09-01T09:00:00+08:00',
  dataAsOf: '2026-09-01T08:00:00+08:00',
  defaultScope: 'all',
  dailyCreation: {
    metric: 'dataset_version_created_count',
    deduplicationKey: ['datasetType', 'datasetId', 'version'],
    timezone: 'Asia/Shanghai',
    startDate: '2025-09-01',
    endDate: '2026-09-01',
    days: dailyCreationDays,
  },
  scopes: {
    process: makeScope('process', 3),
    model: makeScope('model', 2),
    all: makeScope('all', 5),
  },
};

describe('nationalCarbonDashboard organization contribution service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearOrganizationContributionSnapshotCache();
    mockRpc.mockResolvedValue({ data: validSnapshot, error: null });
  });

  it('reads the fixed API profile and caches a validated snapshot', async () => {
    await expect(getOrganizationContributionSnapshot()).resolves.toEqual(validSnapshot);
    await expect(getOrganizationContributionSnapshot()).resolves.toEqual(validSnapshot);

    expect(mockSchema).toHaveBeenCalledWith('api');
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('qry_national_carbon_organization_contributions', {
      p_limit: 10,
    });
  });

  it('coalesces concurrent reads and lets manual refresh bypass the success cache', async () => {
    let resolveRequest!: (result: unknown) => void;
    mockRpc.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const first = getOrganizationContributionSnapshot();
    const second = getOrganizationContributionSnapshot();
    expect(mockRpc).toHaveBeenCalledTimes(1);
    resolveRequest({ data: validSnapshot, error: null });
    await expect(Promise.all([first, second])).resolves.toEqual([validSnapshot, validSnapshot]);

    await getOrganizationContributionSnapshot({ forceRefresh: true });
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid limits before calling the database', async () => {
    await expect(getOrganizationContributionSnapshot({ limit: 0 })).rejects.toMatchObject({
      code: 'INVALID_LIMIT',
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('preserves known database error codes and bounds unknown failures', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'SYSTEM_MANAGER_REQUIRED' } });
    await expect(getOrganizationContributionSnapshot()).rejects.toMatchObject({
      code: 'SYSTEM_MANAGER_REQUIRED',
    });

    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'connection unavailable' } });
    await expect(getOrganizationContributionSnapshot()).rejects.toMatchObject({
      code: 'DATABASE_ERROR',
    });
  });

  it('rejects malformed or incomplete three-scope snapshots', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { ...validSnapshot, scopes: { process: validSnapshot.scopes.process } },
      error: null,
    });

    await expect(getOrganizationContributionSnapshot()).rejects.toMatchObject({
      code: 'INVALID_SNAPSHOT',
    });
    expect(organizationContributionSnapshotSchema.safeParse(validSnapshot).success).toBe(true);
  });

  it('rejects inconsistent or non-consecutive daily version counts', () => {
    const inconsistent = {
      ...validSnapshot,
      dailyCreation: {
        ...validSnapshot.dailyCreation,
        days: validSnapshot.dailyCreation.days.map((day, index) =>
          index === 10 ? { ...day, allCount: 9 } : day,
        ),
      },
    };
    const nonConsecutive = {
      ...validSnapshot,
      dailyCreation: {
        ...validSnapshot.dailyCreation,
        days: validSnapshot.dailyCreation.days.map((day, index) =>
          index === 10 ? { ...day, date: '2025-09-12' } : day,
        ),
      },
    };

    expect(organizationContributionSnapshotSchema.safeParse(inconsistent).success).toBe(false);
    expect(organizationContributionSnapshotSchema.safeParse(nonConsecutive).success).toBe(false);
  });

  it('rejects daily version ranges whose boundary dates do not match their day series', () => {
    const mismatchedStart = {
      ...validSnapshot,
      dailyCreation: {
        ...validSnapshot.dailyCreation,
        startDate: '2025-08-31',
      },
    };
    const mismatchedEnd = {
      ...validSnapshot,
      dailyCreation: {
        ...validSnapshot.dailyCreation,
        endDate: '2026-09-02',
      },
    };

    expect(organizationContributionSnapshotSchema.safeParse(mismatchedStart).success).toBe(false);
    expect(organizationContributionSnapshotSchema.safeParse(mismatchedEnd).success).toBe(false);
  });
});
