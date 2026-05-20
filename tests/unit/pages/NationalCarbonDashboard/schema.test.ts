import rawSnapshot from '@/pages/NationalCarbonDashboard/data/mockDashboardSnapshot.json';
import {
  dashboardStatusKeys,
  dashboardStatusLabels,
  getRegionStatusValue,
  getRegionTotal,
  parseDashboardSnapshot,
} from '@/pages/NationalCarbonDashboard/data/schema';

describe('NationalCarbonDashboard schema', () => {
  const snapshot = parseDashboardSnapshot(rawSnapshot);

  it('parses the dashboard fixture and exposes the expected wallboard metrics', () => {
    expect(snapshot.schemaVersion).toBe('dashboard_snapshot_v1');
    expect(snapshot.title).toBe('国家碳数据平台建设进展');
    expect(snapshot.summary).toMatchObject({
      coveredRegions: 29,
      totalRegions: 31,
    });
    expect(snapshot.regions).toHaveLength(34);
    expect(snapshot.connectivity.closure).toMatchObject({
      inputEdgesTotal: 70262,
      noProviderEdges: 27748,
      providerPresentResolvedPct: 100,
      writePct: 60.51,
      writtenEdges: 42514,
    });
    expect(snapshot.connectivity.gaps.topFlows[0]).toMatchObject({
      category: '基础材料',
      count: 807,
      flow: '石灰石',
      sampleHits: 5,
    });
  });

  it('aggregates region totals and reads individual status values', () => {
    const [beijing] = snapshot.regions;

    expect(dashboardStatusKeys).toEqual([
      'filling',
      'submitted',
      'reviewing',
      'sampleAccepted',
      'postProcessing',
      'pendingPublish',
      'published',
    ]);
    expect(dashboardStatusLabels.published).toBe('已发布');
    expect(getRegionStatusValue(beijing, 'published')).toBe(63);
    expect(getRegionStatusValue(beijing, 'all')).toBe(getRegionTotal(beijing));
    expect(getRegionTotal(beijing)).toBe(
      dashboardStatusKeys.reduce((total, statusKey) => {
        return total + beijing.statusCounts[statusKey];
      }, 0),
    );
  });

  it('rejects invalid snapshot payloads', () => {
    expect(() => parseDashboardSnapshot({ schemaVersion: 'wrong' })).toThrow();
  });
});
