import { z } from 'zod';

export const dashboardStatusKeys = [
  'filling',
  'submitted',
  'reviewing',
  'sampleAccepted',
  'postProcessing',
  'pendingPublish',
  'published',
] as const;

export type DashboardStatusKey = (typeof dashboardStatusKeys)[number];

export const dashboardStatusLabels: Record<DashboardStatusKey | 'all', string> = {
  all: '全部',
  filling: '填写中',
  submitted: '已提交',
  reviewing: '审核中',
  sampleAccepted: '样本库',
  postProcessing: '后处理中',
  pendingPublish: '待发布',
  published: '已发布',
};

const statusCountsSchema = z.object({
  filling: z.number(),
  submitted: z.number(),
  reviewing: z.number(),
  sampleAccepted: z.number(),
  postProcessing: z.number(),
  pendingPublish: z.number(),
  published: z.number(),
});

const metricSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  tone: z.enum(['blue', 'cyan', 'gold', 'amber']).optional(),
});

export const dashboardSnapshotSchema = z.object({
  schemaVersion: z.literal('dashboard_snapshot_v1'),
  snapshotId: z.string(),
  scopeKey: z.string(),
  title: z.string(),
  subtitle: z.string(),
  dataVersion: z.string(),
  generatedAt: z.string(),
  dataAsOf: z.string(),
  displayMode: z.enum(['internal_wall', 'public_showcase', 'offline_fixture']),
  summary: z.object({
    sampleDatasets: z.number(),
    coveredRegions: z.number(),
    totalRegions: z.number(),
    publishedDatasets: z.number(),
    connectivityRate: z.number(),
  }),
  narrativeStages: z.array(
    z.object({
      key: z.string(),
      index: z.string(),
      title: z.string(),
      description: z.string(),
      tone: z.enum(['blue', 'cyan', 'gold']),
    }),
  ),
  regions: z.array(
    z.object({
      adcode: z.number(),
      name: z.string(),
      shortName: z.string(),
      statusCounts: statusCountsSchema,
      latestPublishedAt: z.string().optional(),
    }),
  ),
  outcome: z.object({
    totalOutputs: z.number(),
    constructionMetrics: z.array(metricSchema),
    publicationMetrics: z.array(metricSchema),
    industries: z.array(
      z.object({
        key: z.string(),
        name: z.string(),
        icon: z.string(),
        sampleCount: z.number(),
        aggregationCount: z.number(),
        publicationCount: z.number(),
        completionRate: z.number(),
        qualityMark: z.string().optional(),
      }),
    ),
  }),
  connectivity: z.object({
    rate: z.number(),
    connectedProcesses: z.number(),
    unmatchedInputs: z.number(),
    productSystems: z.number(),
    closure: z.object({
      inputEdgesTotal: z.number(),
      noProviderEdges: z.number(),
      providerPresentResolvedPct: z.number(),
      writePct: z.number(),
      writtenEdges: z.number(),
    }),
    quality: z.object({
      localSubnationalPct: z.number(),
      sameCountryPct: z.number(),
      singularRiskLevel: z.enum(['low', 'medium', 'high']),
      splitByProcessVolumePct: z.number(),
      volumeFallbackToOnePct: z.number(),
    }),
    gaps: z.object({
      topFlows: z.array(
        z.object({
          category: z.string(),
          count: z.number(),
          flow: z.string(),
          sampleHits: z.number(),
        }),
      ),
    }),
    matrix: z.object({
      rows: z.number(),
      columns: z.number(),
      connectedRatio: z.number(),
      unmatchedCells: z.array(z.object({ row: z.number(), column: z.number() })),
      highlightedPaths: z.array(
        z.object({
          key: z.string(),
          tone: z.enum(['cyan', 'gold']),
          points: z.array(z.object({ row: z.number(), column: z.number() })),
        }),
      ),
    }),
  }),
});

export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>;
export type RegionSnapshot = DashboardSnapshot['regions'][number];
export type IndustrySnapshot = DashboardSnapshot['outcome']['industries'][number];
export type MatrixSnapshot = DashboardSnapshot['connectivity']['matrix'];

export function parseDashboardSnapshot(input: unknown): DashboardSnapshot {
  return dashboardSnapshotSchema.parse(input);
}

export function getRegionTotal(region: RegionSnapshot): number {
  return dashboardStatusKeys.reduce(
    (total, statusKey) => total + region.statusCounts[statusKey],
    0,
  );
}

export function getRegionStatusValue(
  region: RegionSnapshot,
  statusKey: DashboardStatusKey | 'all',
): number {
  return statusKey === 'all' ? getRegionTotal(region) : region.statusCounts[statusKey];
}
