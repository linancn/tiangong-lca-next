import {
  applyLcaContributionPathProcessMeta,
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
  it('returns null for invalid artifacts and for missing required identifiers', () => {
    expect(buildLcaContributionPathModel(null)).toBeNull();
    expect(buildLcaContributionPathModel([])).toBeNull();
    expect(
      buildLcaContributionPathModel({
        ...contributionPathArtifact,
        summary: null,
      }),
    ).toBeNull();
    expect(
      buildLcaContributionPathModel({
        ...contributionPathArtifact,
        root: { process_id: ' ', label: 'missing root id' },
      }),
    ).toBeNull();
    expect(
      buildLcaContributionPathModel({
        ...contributionPathArtifact,
        impact: { impact_id: ' ', label: 'missing impact id', unit: 'kg CO2-eq' },
      }),
    ).toBeNull();
  });

  it('builds a normalized model from malformed solver artifacts', () => {
    const model = buildLcaContributionPathModel({
      version: 'bad',
      format: ' ',
      snapshot_id: 123,
      job_id: null,
      process_id: ' ',
      impact_id: ' ',
      amount: 'bad',
      options: {
        max_depth: 'bad',
        top_k_children: '',
        cutoff_share: 'bad',
        max_nodes: undefined,
      },
      summary: {
        total_impact: 'bad',
        unit: ' ',
        coverage_ratio: 4,
        expanded_node_count: 'bad',
        truncated_node_count: null,
        computed_at: 42,
      },
      root: {
        process_id: 'root-1',
        label: ' ',
      },
      impact: {
        impact_id: 'impact-x',
        label: ' ',
        unit: ' ',
      },
      process_contributions: [
        null,
        { process_id: ' ', label: 'ignored' },
        {
          process_id: 'branch-only',
          process_index: '3',
          label: ' ',
          location: ' ',
          direct_impact: -2,
          share_of_total: '0.2',
          is_root: false,
          depth_min: null,
        },
        {
          process_id: 'zero',
          process_index: 'bad',
          label: 'Zero',
          location: 'CN',
          direct_impact: 0,
          share_of_total: 'bad',
          is_root: true,
          depth_min: 'bad',
        },
      ],
      branches: [
        null,
        {
          rank: '2',
          path_process_ids: ['branch-only', 'ghost-id'],
          path_labels: ['Branch Label', 'Ghost Branch'],
          path_score: 'bad',
          terminal_reason: '',
        },
        {
          rank: '1',
          path_process_ids: ['zero', ' '],
          path_labels: ['Zero', 'ignored'],
          path_score: '1.5',
          terminal_reason: ' ',
        },
      ],
      links: [
        null,
        {
          source_process_id: ' ',
          target_process_id: 'ignored',
          depth_from_root: 1,
          direct_impact: 1,
        },
        {
          source_process_id: 'branch-only',
          target_process_id: 'ghost-id',
          depth_from_root: 'bad',
          cycle_cut: true,
          direct_impact: -2,
          share_of_total: 'bad',
        },
        {
          source_process_id: 'zero',
          target_process_id: 'branch-only',
          depth_from_root: '2',
          cycle_cut: false,
          direct_impact: 0,
          share_of_total: '0.3',
        },
      ],
      meta: {
        source: ' ',
        snapshot_index_version: 'bad',
      },
    });

    expect(model).toMatchObject({
      version: 1,
      format: 'contribution-path:v1',
      snapshotId: '',
      jobId: '',
      processId: 'root-1',
      impactId: 'impact-x',
      amount: 1,
      options: {
        maxDepth: 4,
        topKChildren: 0,
        cutoffShare: 0.01,
        maxNodes: 200,
      },
      summary: {
        totalImpact: 0,
        unit: '-',
        coverageRatio: 1,
        expandedNodeCount: 0,
        truncatedNodeCount: 0,
        computedAt: '',
      },
      root: {
        processId: 'root-1',
        label: 'root-1',
      },
      impact: {
        impactId: 'impact-x',
        label: 'impact-x',
        unit: '-',
      },
      source: 'solve_one_path_analysis',
      snapshotIndexVersion: 1,
      topContributor: expect.objectContaining({
        processId: 'branch-only',
        direction: 'negative',
      }),
    });
    expect(model?.contributors).toEqual([
      expect.objectContaining({
        processId: 'branch-only',
        processIndex: 3,
        label: 'branch-only',
        location: undefined,
        shareOfTotal: 0.2,
        isRoot: false,
        depthMin: null,
        direction: 'negative',
      }),
      expect.objectContaining({
        processId: 'zero',
        processIndex: 0,
        label: 'Zero',
        location: 'CN',
        shareOfTotal: 0,
        isRoot: true,
        depthMin: 0,
        direction: 'neutral',
      }),
    ]);
    expect(model?.branches).toEqual([
      expect.objectContaining({
        rank: 1,
        pathProcessIds: ['zero'],
        pathLabels: ['Zero', 'ignored'],
        pathLabel: 'Zero > ignored',
        pathScore: 1.5,
        terminalReason: 'unknown',
      }),
      expect.objectContaining({
        rank: 2,
        pathProcessIds: ['branch-only', 'ghost-id'],
        pathLabels: ['Branch Label', 'Ghost Branch'],
        pathLabel: 'Branch Label > Ghost Branch',
        pathScore: 0,
        terminalReason: 'unknown',
      }),
    ]);
    expect(model?.links).toEqual([
      expect.objectContaining({
        sourceProcessId: 'branch-only',
        targetProcessId: 'ghost-id',
        sourceLabel: 'branch-only',
        targetLabel: 'Ghost Branch',
        depthFromRoot: 0,
        cycleCut: true,
        directImpact: -2,
        shareOfTotal: 0,
        direction: 'negative',
      }),
      expect.objectContaining({
        sourceProcessId: 'zero',
        targetProcessId: 'branch-only',
        sourceLabel: 'Zero',
        targetLabel: 'branch-only',
        depthFromRoot: 2,
        cycleCut: false,
        directImpact: 0,
        shareOfTotal: 0.3,
        direction: 'neutral',
      }),
    ]);
  });

  it('uses empty arrays, null topContributor, and alphabetical tie-breakers when metadata is sparse', () => {
    const emptyCollectionsModel = buildLcaContributionPathModel({
      ...contributionPathArtifact,
      root: { process_id: 'root-only', label: '' },
      impact: { impact_id: 'impact-only', label: '', unit: '' },
      process_contributions: {},
      branches: {},
      links: {},
    });

    expect(emptyCollectionsModel).toMatchObject({
      root: { processId: 'root-only', label: 'root-only' },
      impact: { impactId: 'impact-only', label: 'impact-only', unit: '-' },
      contributors: [],
      branches: [],
      links: [],
      topContributor: null,
    });

    const sortedModel = buildLcaContributionPathModel({
      ...contributionPathArtifact,
      process_contributions: [
        {
          process_id: 'beta',
          process_index: 2,
          label: 'Beta',
          direct_impact: 1,
          share_of_total: 0.1,
          is_root: false,
          depth_min: 1,
        },
        {
          process_id: 'alpha',
          process_index: 1,
          label: 'Alpha',
          direct_impact: -1,
          share_of_total: 0.1,
          is_root: false,
          depth_min: 1,
        },
      ],
      branches: [],
      links: [
        {
          source_process_id: 'source-only',
          target_process_id: 'target-only',
          depth_from_root: 1,
          cycle_cut: false,
          direct_impact: 1,
          share_of_total: 0.1,
        },
      ],
    });

    expect(sortedModel?.contributors.map((item) => item.label)).toEqual(['Alpha', 'Beta']);
    expect(sortedModel?.links[0]).toMatchObject({
      sourceLabel: 'source-only',
      targetLabel: 'target-only',
    });
  });

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

  it('reapplies process metadata and returns the original model when the metadata map is empty', () => {
    const model = {
      version: 1,
      format: 'contribution-path:v1',
      snapshotId: 'snapshot',
      jobId: 'job',
      processId: 'root',
      impactId: 'impact',
      amount: 1,
      options: {
        maxDepth: 4,
        topKChildren: 5,
        cutoffShare: 0.01,
        maxNodes: 200,
      },
      summary: {
        totalImpact: 10,
        unit: 'kg',
        coverageRatio: 1,
        expandedNodeCount: 1,
        truncatedNodeCount: 0,
        computedAt: '2026-03-19T00:00:00Z',
      },
      root: {
        processId: 'root',
        label: 'Root fallback',
      },
      impact: {
        impactId: 'impact',
        label: 'Impact',
        unit: 'kg',
      },
      source: 'solve_one_path_analysis',
      snapshotIndexVersion: 1,
      contributors: [
        {
          key: 'root',
          processId: 'root',
          processIndex: 0,
          label: 'Root fallback',
          directImpact: 1,
          shareOfTotal: 1,
          isRoot: true,
          depthMin: 0,
          direction: 'positive' as const,
        },
        {
          key: 'branch',
          processId: 'branch',
          processIndex: 1,
          label: '',
          directImpact: -0.2,
          shareOfTotal: 0.2,
          isRoot: false,
          depthMin: 1,
          direction: 'negative' as const,
        },
      ],
      topContributors: [],
      branches: [
        {
          key: '1:branch>ghost',
          rank: 1,
          pathProcessIds: ['branch', 'ghost'],
          pathLabels: ['', ' '],
          pathLabel: '',
          pathScore: 1,
          terminalReason: 'cutoff',
        },
      ],
      links: [
        {
          key: 'branch:ghost:1',
          sourceProcessId: 'branch',
          targetProcessId: 'ghost',
          sourceLabel: '',
          targetLabel: ' ',
          depthFromRoot: 1,
          cycleCut: false,
          directImpact: -0.2,
          shareOfTotal: 0.2,
          direction: 'negative' as const,
        },
      ],
      topContributor: null,
    };

    const unchanged = applyLcaContributionPathProcessMeta(model, new Map());
    expect(unchanged).toBe(model);

    const updated = applyLcaContributionPathProcessMeta(
      {
        ...model,
        topContributors: model.contributors,
        topContributor: model.contributors[0],
      },
      new Map([
        ['root', { label: 'Mapped Root' }],
        ['branch', { label: 'Mapped Branch' }],
        ['ghost', { label: '' }],
      ]),
    );

    expect(updated.root.label).toBe('Mapped Root');
    expect(updated.contributors[0].label).toBe('Mapped Root');
    expect(updated.contributors[1].label).toBe('Mapped Branch');
    expect(updated.branches[0]).toMatchObject({
      pathLabels: ['Mapped Branch', 'ghost'],
      pathLabel: 'Mapped Branch > ghost',
    });
    expect(updated.links[0]).toMatchObject({
      sourceLabel: 'Mapped Branch',
      targetLabel: 'ghost',
    });
    expect(updated.topContributor).toEqual(expect.objectContaining({ label: 'Mapped Root' }));

    const noContributorModel = {
      ...model,
      contributors: [],
      topContributors: [],
      branches: [
        {
          key: '1:ghost-a>ghost-b',
          rank: 1,
          pathProcessIds: ['ghost-a', 'ghost-b'],
          pathLabels: [],
          pathLabel: '',
          pathScore: 1,
          terminalReason: 'cutoff',
        },
      ],
      links: [
        {
          key: 'ghost-a:ghost-b:1',
          sourceProcessId: 'ghost-a',
          targetProcessId: 'ghost-b',
          sourceLabel: '',
          targetLabel: '',
          depthFromRoot: 1,
          cycleCut: false,
          directImpact: 0.1,
          shareOfTotal: 0.1,
          direction: 'positive' as const,
        },
      ],
      topContributor: null,
    };

    const updatedNoContributorModel = applyLcaContributionPathProcessMeta(
      noContributorModel,
      new Map([['ghost-b', { label: 'Mapped Ghost B' }]]),
    );

    expect(updatedNoContributorModel.root.label).toBe('Root fallback');
    expect(updatedNoContributorModel.branches[0]).toMatchObject({
      pathLabels: ['ghost-a', 'Mapped Ghost B'],
      pathLabel: 'ghost-a > Mapped Ghost B',
    });
    expect(updatedNoContributorModel.links[0]).toMatchObject({
      sourceLabel: 'ghost-a',
      targetLabel: 'Mapped Ghost B',
    });
    expect(updatedNoContributorModel.topContributor).toBeNull();
  });

  it('builds sankey data with zero-impact filtering, depth fallback, and label fallback', () => {
    const sankeyData = buildLcaContributionPathSankeyData({
      version: 1,
      format: 'contribution-path:v1',
      snapshotId: 'snapshot',
      jobId: 'job',
      processId: 'root',
      impactId: 'impact',
      amount: 1,
      options: {
        maxDepth: 4,
        topKChildren: 5,
        cutoffShare: 0.01,
        maxNodes: 200,
      },
      summary: {
        totalImpact: 10,
        unit: 'kg',
        coverageRatio: 1,
        expandedNodeCount: 1,
        truncatedNodeCount: 0,
        computedAt: '2026-03-19T00:00:00Z',
      },
      root: {
        processId: 'root',
        label: '',
      },
      impact: {
        impactId: 'impact',
        label: 'Impact',
        unit: 'kg',
      },
      source: 'solve_one_path_analysis',
      snapshotIndexVersion: 1,
      contributors: [
        {
          key: 'child',
          processId: 'child',
          processIndex: 1,
          label: '',
          directImpact: 1,
          shareOfTotal: 0.5,
          isRoot: false,
          depthMin: null,
          direction: 'positive',
        },
        {
          key: 'repeat',
          processId: 'repeat',
          processIndex: 2,
          label: 'Repeat',
          directImpact: 0.4,
          shareOfTotal: 0.2,
          isRoot: false,
          depthMin: 1.9,
          direction: 'positive',
        },
      ],
      topContributors: [],
      branches: [],
      links: [
        {
          key: 'root:child:1',
          sourceProcessId: 'root',
          targetProcessId: 'child',
          sourceLabel: '',
          targetLabel: '',
          depthFromRoot: 1,
          cycleCut: false,
          directImpact: 1,
          shareOfTotal: 0.5,
          direction: 'positive',
        },
        {
          key: 'orphan:child:4',
          sourceProcessId: 'orphan',
          targetProcessId: 'child',
          sourceLabel: '',
          targetLabel: '',
          depthFromRoot: 3.7,
          cycleCut: false,
          directImpact: 0.5,
          shareOfTotal: 0.1,
          direction: 'positive',
        },
        {
          key: 'repeat:repeat:2',
          sourceProcessId: 'repeat',
          targetProcessId: 'repeat',
          sourceLabel: '',
          targetLabel: '',
          depthFromRoot: 2,
          cycleCut: true,
          directImpact: 0.4,
          shareOfTotal: 0.04,
          direction: 'positive',
        },
        {
          key: 'child:leaf:4',
          sourceProcessId: 'child',
          targetProcessId: 'leaf',
          sourceLabel: '',
          targetLabel: '',
          depthFromRoot: 4.2,
          cycleCut: false,
          directImpact: 0.3,
          shareOfTotal: 0.03,
          direction: 'positive',
        },
        {
          key: 'skip-zero',
          sourceProcessId: 'root',
          targetProcessId: 'skipped',
          sourceLabel: 'Root',
          targetLabel: 'Skipped',
          depthFromRoot: 2,
          cycleCut: false,
          directImpact: 0,
          shareOfTotal: 0,
          direction: 'neutral',
        },
      ],
      topContributor: null,
    });

    expect(sankeyData.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'root::0',
          target: 'child::1',
          sourceLabel: 'root',
          targetLabel: 'child',
          value: 1,
        }),
        expect.objectContaining({
          source: 'orphan::2',
          target: 'child::3',
          sourceLabel: 'orphan',
          targetLabel: 'child',
          sourceDepth: 2,
          targetDepth: 3,
          value: 0.5,
        }),
        expect.objectContaining({
          source: 'repeat::1',
          target: 'repeat::2',
          sourceLabel: 'repeat',
          targetLabel: 'repeat',
        }),
        expect.objectContaining({
          source: 'child::3',
          target: 'leaf::4',
          sourceDepth: 3,
          targetDepth: 4,
          sourceLabel: 'child',
          targetLabel: 'leaf',
        }),
      ]),
    );
    expect(sankeyData.links).toHaveLength(4);
    expect(sankeyData.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'root::0', label: 'root' }),
        expect.objectContaining({ key: 'child::1', label: 'child' }),
        expect.objectContaining({ key: 'child::3', label: 'child' }),
        expect.objectContaining({ key: 'leaf::4', label: 'leaf' }),
        expect.objectContaining({ key: 'orphan::2', label: 'orphan' }),
      ]),
    );
    expect(sankeyData.repeatedNodeCount).toBe(2);
    expect(sankeyData.cycleCutLinkCount).toBe(1);
    expect(sankeyData.selfLoopLinkCount).toBe(1);
  });
});
