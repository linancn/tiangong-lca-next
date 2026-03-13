import {
  buildLcaContributionPathModel,
  buildLcaContributionPathSankeyData,
} from '@/pages/Processes/Components/lcaContributionPath';

const contributionPathArtifact = {
  version: 1,
  format: 'contribution-path:v1',
  snapshot_id: 'snapshot-path',
  job_id: 'job-path',
  process_id: 'process-a',
  impact_id: 'impact-1',
  amount: 1,
  options: {
    max_depth: 4,
    top_k_children: 5,
    cutoff_share: 0.01,
    max_nodes: 200,
  },
  summary: {
    total_impact: 10,
    unit: 'kg CO2-eq',
    coverage_ratio: 0.9,
    expanded_node_count: 4,
    truncated_node_count: 1,
    computed_at: '2026-03-13T10:00:00Z',
  },
  root: {
    process_id: 'process-a',
    label: 'Process A',
  },
  impact: {
    impact_id: 'impact-1',
    label: 'Climate change',
    unit: 'kg CO2-eq',
  },
  process_contributions: [
    {
      process_id: 'process-a',
      process_index: 1,
      label: 'Process A',
      direct_impact: 5,
      share_of_total: 0.5,
      is_root: true,
      depth_min: 0,
    },
    {
      process_id: 'process-b',
      process_index: 2,
      label: 'Process B',
      direct_impact: 3,
      share_of_total: 0.3,
      is_root: false,
      depth_min: 1,
    },
    {
      process_id: 'process-c',
      process_index: 3,
      label: 'Process C',
      direct_impact: 2,
      share_of_total: 0.2,
      is_root: false,
      depth_min: 2,
    },
  ],
  branches: [],
  links: [
    {
      source_process_id: 'process-a',
      target_process_id: 'process-b',
      depth_from_root: 1,
      cycle_cut: false,
      direct_impact: 3,
      share_of_total: 0.3,
    },
    {
      source_process_id: 'process-b',
      target_process_id: 'process-c',
      depth_from_root: 2,
      cycle_cut: false,
      direct_impact: 2,
      share_of_total: 0.2,
    },
    {
      source_process_id: 'process-c',
      target_process_id: 'process-a',
      depth_from_root: 3,
      cycle_cut: false,
      direct_impact: 1,
      share_of_total: 0.1,
    },
    {
      source_process_id: 'process-b',
      target_process_id: 'process-b',
      depth_from_root: 2,
      cycle_cut: false,
      direct_impact: 0.5,
      share_of_total: 0.05,
    },
    {
      source_process_id: 'process-c',
      target_process_id: 'process-b',
      depth_from_root: 3,
      cycle_cut: true,
      direct_impact: 0.2,
      share_of_total: 0.02,
    },
  ],
  meta: {
    source: 'solve_one_path_analysis',
    snapshot_index_version: 1,
  },
};

describe('lcaContributionPath', () => {
  it('builds a layered sankey graph that keeps revisits and cycle-related links visible', () => {
    const model = buildLcaContributionPathModel(contributionPathArtifact);
    expect(model).not.toBeNull();

    const sankeyData = buildLcaContributionPathSankeyData(model!);
    expect(sankeyData.links).toHaveLength(5);
    expect(sankeyData.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'process-a::0',
          target: 'process-b::1',
        }),
        expect.objectContaining({
          source: 'process-b::1',
          target: 'process-c::2',
        }),
        expect.objectContaining({
          source: 'process-c::2',
          target: 'process-a::3',
        }),
        expect.objectContaining({
          source: 'process-b::1',
          target: 'process-b::2',
        }),
        expect.objectContaining({
          source: 'process-c::2',
          target: 'process-b::3',
        }),
      ]),
    );
    expect(sankeyData.repeatedNodeCount).toBe(3);
    expect(sankeyData.selfLoopLinkCount).toBe(1);
    expect(sankeyData.cycleCutLinkCount).toBe(1);
  });
});
