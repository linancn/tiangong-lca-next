import LcaAnalysisPage from '@/pages/Processes/Analysis';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { resetUmiMocks, setUmiLocation } from '../../../../mocks/umi';

jest.mock('umi', () => require('@/tests/mocks/umi').createUmiMock());
jest.mock('antd', () => require('@/tests/mocks/antd').createAntdMock());
jest.mock('@ant-design/icons', () =>
  require('@/tests/mocks/antDesignIcons').createAntDesignIconsMock(),
);
jest.mock('@ant-design/pro-components', () =>
  require('@/tests/mocks/proComponents').createProComponentsMock(),
);
jest.mock('@ant-design/charts', () => ({
  __esModule: true,
  Bar: ({ data }: { data?: unknown[] }) => (
    <div data-testid='bar-chart' data-count={Array.isArray(data) ? data.length : 0} />
  ),
  Sankey: ({ data }: { data?: { nodes?: unknown[]; links?: unknown[] } }) => (
    <div
      data-testid='sankey-chart'
      data-node-count={Array.isArray(data?.nodes) ? data.nodes.length : 0}
      data-link-count={Array.isArray(data?.links) ? data.links.length : 0}
    />
  ),
}));

jest.mock('@/pages/Processes/Components/view', () => ({
  __esModule: true,
  default: ({ triggerLabel, id }: { triggerLabel?: string; id: string }) => (
    <button type='button' data-testid={`process-view-link-${id}`}>
      {triggerLabel ?? id}
    </button>
  ),
}));

jest.mock('@/services/lca', () => ({
  __esModule: true,
  queryLcaResults: jest.fn(),
  submitLcaContributionPath: jest.fn(),
  getLcaContributionPathResult: jest.fn(),
  pollLcaJobUntilTerminal: jest.fn(),
  isLcaFunctionInvokeError: jest.fn(() => false),
}));

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  listProcessesForLcaAnalysis: jest.fn(),
  getProcessDetail: jest.fn(),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeams: jest.fn(),
}));

jest.mock('@/services/lciaMethods/util', () => ({
  __esModule: true,
  cacheAndDecompressMethod: jest.fn(),
  getDecompressedMethod: jest.fn(),
}));

const {
  queryLcaResults,
  submitLcaContributionPath,
  getLcaContributionPathResult,
  pollLcaJobUntilTerminal,
} = jest.requireMock('@/services/lca');
const { getProcessDetail, listProcessesForLcaAnalysis } = jest.requireMock(
  '@/services/processes/api',
);
const { getTeams } = jest.requireMock('@/services/teams/api');
const { cacheAndDecompressMethod, getDecompressedMethod } = jest.requireMock(
  '@/services/lciaMethods/util',
);

const buildProcess = (id: string, name: string, version: string) => ({
  key: `${id}-${version}`,
  id,
  version,
  lang: 'en',
  name,
  generalComment: '',
  classification: 'Energy',
  referenceYear: '2024',
  location: 'CN',
  modifiedAt: new Date('2026-03-12T00:00:00Z'),
  teamId: '',
  modelId: '',
  typeOfDataSet: 'unitProcessesBlackBox',
});

const contributionPathArtifact = {
  version: 1,
  format: 'contribution-path:v1',
  snapshot_id: 'snapshot-path',
  job_id: 'job-path',
  process_id: 'process-1',
  impact_id: 'impact-1',
  amount: 1,
  options: {
    max_depth: 4,
    top_k_children: 5,
    cutoff_share: 0.01,
    max_nodes: 200,
  },
  summary: {
    total_impact: 12.5,
    unit: 'kg CO2-eq',
    coverage_ratio: 0.82,
    expanded_node_count: 3,
    truncated_node_count: 1,
    computed_at: '2026-03-12T14:00:00Z',
  },
  root: {
    process_id: 'process-1',
    label: 'Solar panel manufacturing',
  },
  impact: {
    impact_id: 'impact-1',
    label: 'Climate change',
    unit: 'kg CO2-eq',
  },
  process_contributions: [
    {
      process_id: 'process-1',
      process_index: 1,
      label: 'Solar panel manufacturing',
      location: 'CN',
      direct_impact: 12.5,
      share_of_total: 0.61,
      is_root: true,
      depth_min: 0,
    },
    {
      process_id: 'process-2',
      process_index: 2,
      label: 'Wind turbine maintenance',
      location: 'CN',
      direct_impact: -3.2,
      share_of_total: 0.16,
      is_root: false,
      depth_min: 1,
    },
  ],
  branches: [
    {
      rank: 1,
      path_process_ids: ['process-1', 'process-2'],
      path_labels: ['Solar panel manufacturing', 'Wind turbine maintenance'],
      path_score: 3.2,
      terminal_reason: 'leaf',
    },
  ],
  links: [
    {
      source_process_id: 'process-1',
      target_process_id: 'process-2',
      depth_from_root: 1,
      cycle_cut: false,
      direct_impact: -3.2,
      share_of_total: 0.16,
    },
  ],
  meta: {
    source: 'solve_one_path_analysis',
    snapshot_index_version: 1,
  },
};

describe('LcaAnalysisPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetUmiMocks();
    setUmiLocation({ pathname: '/mydata/processes/analysis', search: '' });

    listProcessesForLcaAnalysis.mockResolvedValue({
      data: [
        buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
        buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
        buildProcess('process-3', 'Battery pack assembly', '01.00.000'),
      ],
      success: true,
      total: 3,
    });

    getDecompressedMethod.mockResolvedValue({
      files: [
        {
          id: 'impact-1',
          description: [
            {
              '@xml:lang': 'en',
              '#text': 'Climate change',
            },
          ],
          referenceQuantity: {
            'common:shortDescription': [
              {
                '@xml:lang': 'en',
                '#text': 'kg CO2-eq',
              },
            ],
          },
        },
      ],
    });
    cacheAndDecompressMethod.mockResolvedValue(true);
    getTeams.mockResolvedValue({
      data: [
        {
          id: 'team-1',
          json: {
            title: [
              {
                '@xml:lang': 'en',
                '#text': 'Operations',
              },
            ],
          },
        },
      ],
      success: true,
    });
    getProcessDetail.mockResolvedValue({
      data: null,
      success: true,
    });

    queryLcaResults.mockImplementation(async (request: Record<string, unknown>) => {
      if (request.mode === 'process_all_impacts') {
        return {
          snapshot_id: 'snapshot-profile',
          result_id: 'result-profile',
          source: 'all_unit',
          mode: 'process_all_impacts',
          data: {
            values: [
              {
                impact_id: 'impact-1',
                impact_index: 1,
                impact_name: 'Climate change',
                unit: 'kg CO2-eq',
                value: 12.5,
              },
              {
                impact_id: 'impact-2',
                impact_index: 2,
                impact_name: 'Acidification',
                unit: 'mol H+-eq',
                value: -3.2,
              },
            ],
          },
          meta: {
            cache_hit: false,
            computed_at: '2026-03-12T12:00:00Z',
          },
        };
      }

      if (Array.isArray(request.process_ids)) {
        return {
          snapshot_id: 'snapshot-compare',
          result_id: 'result-compare',
          source: 'all_unit',
          mode: 'processes_one_impact',
          data: {
            impact_id: 'impact-1',
            values: {
              'process-1': 12.5,
              'process-2': -3.2,
              'process-3': 8,
            },
          },
          meta: {
            cache_hit: false,
            computed_at: '2026-03-12T12:30:00Z',
          },
        };
      }

      return Promise.reject(new Error('unexpected_query'));
    });

    submitLcaContributionPath.mockResolvedValue({
      mode: 'cache_hit',
      snapshot_id: 'snapshot-path',
      cache_key: 'path-cache',
      result_id: 'result-path',
    });
    getLcaContributionPathResult.mockResolvedValue({
      result_id: 'result-path',
      snapshot_id: 'snapshot-path',
      created_at: '2026-03-12T14:00:00Z',
      diagnostics: null,
      artifact: {
        artifact_url: null,
        artifact_format: 'contribution-path:v1',
        artifact_byte_size: 1024,
        artifact_sha256: 'sha',
      },
      job: {
        job_id: 'job-path',
        job_type: 'analyze_contribution_path',
        status: 'completed',
        timestamps: {
          created_at: '2026-03-12T13:59:00Z',
          started_at: '2026-03-12T13:59:10Z',
          finished_at: '2026-03-12T14:00:00Z',
          updated_at: '2026-03-12T14:00:00Z',
        },
      },
      data: contributionPathArtifact,
    });
    pollLcaJobUntilTerminal.mockResolvedValue({
      job_id: 'job-path',
      snapshot_id: 'snapshot-path',
      job_type: 'analyze_contribution_path',
      status: 'completed',
      timestamps: {
        created_at: '2026-03-12T13:59:00Z',
        started_at: '2026-03-12T13:59:10Z',
        finished_at: '2026-03-12T14:00:00Z',
        updated_at: '2026-03-12T14:00:00Z',
      },
      payload: null,
      diagnostics: null,
      result: {
        result_id: 'result-path',
        created_at: '2026-03-12T14:00:00Z',
        artifact_url: null,
        artifact_format: 'contribution-path:v1',
        artifact_byte_size: 1024,
        artifact_sha256: 'sha',
        diagnostics: null,
      },
    });
  });

  it('loads a process profile and renders the chart summary', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Back to processes' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Refresh options' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Load profile' }));

    await waitFor(() =>
      expect(queryLcaResults).toHaveBeenCalledWith({
        scope: 'dev-v1',
        data_scope: 'current_user',
        mode: 'process_all_impacts',
        process_id: 'process-1',
        process_version: '01.00.000',
        allow_fallback: false,
      }),
    );

    expect(await screen.findByText('snapshot-profile')).toBeInTheDocument();
    expect(screen.getByText('Selected process')).toBeInTheDocument();
    expect(screen.getAllByText('Climate change').length).toBeGreaterThan(0);
    expect(screen.getAllByText('kg CO2-eq').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('bar-chart').length).toBeGreaterThan(0);
  });

  it('runs selected-process compare from the independent page', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-compare'));
    fireEvent.click(await screen.findByRole('button', { name: 'Run analysis' }));

    await waitFor(() =>
      expect(queryLcaResults).toHaveBeenCalledWith({
        scope: 'dev-v1',
        data_scope: 'current_user',
        mode: 'processes_one_impact',
        process_ids: ['process-1', 'process-2', 'process-3'],
        impact_id: 'impact-1',
        allow_fallback: false,
      }),
    );

    expect(await screen.findByText('snapshot-compare')).toBeInTheDocument();
    expect(screen.getByText('Top contributor')).toBeInTheDocument();
  });

  it('runs hotspot analysis against selected processes on the independent page', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    queryLcaResults.mockResolvedValueOnce({
      snapshot_id: 'snapshot-hotspot',
      result_id: 'result-hotspot',
      source: 'all_unit',
      mode: 'processes_one_impact',
      data: {
        impact_id: 'impact-1',
        values: {
          'process-1': 12.5,
          'process-2': -3.5,
          'process-3': 4,
        },
      },
      meta: {
        cache_hit: false,
        computed_at: '2026-03-12T13:00:00Z',
      },
    });

    fireEvent.click(screen.getByTestId('tab-hotspots'));
    fireEvent.click(await screen.findByRole('button', { name: 'Run hotspot analysis' }));

    await waitFor(() =>
      expect(queryLcaResults).toHaveBeenCalledWith({
        scope: 'dev-v1',
        data_scope: 'current_user',
        mode: 'processes_one_impact',
        process_ids: ['process-1', 'process-2', 'process-3'],
        impact_id: 'impact-1',
        allow_fallback: false,
      }),
    );

    expect(await screen.findByText('snapshot-hotspot')).toBeInTheDocument();
    expect(screen.getByText('Hotspot ranking chart')).toBeInTheDocument();
    expect(screen.getAllByText('Solar panel manufacturing').length).toBeGreaterThan(0);
  });

  it('runs grouped analysis and renders grouped results', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-grouped'));
    fireEvent.click(await screen.findByRole('button', { name: 'Run grouped analysis' }));

    await waitFor(() =>
      expect(queryLcaResults).toHaveBeenCalledWith({
        scope: 'dev-v1',
        data_scope: 'current_user',
        mode: 'processes_one_impact',
        process_ids: ['process-1', 'process-2', 'process-3'],
        impact_id: 'impact-1',
        allow_fallback: false,
      }),
    );

    expect(await screen.findByText('Grouped ranking chart')).toBeInTheDocument();
    expect(screen.getByText('Top group')).toBeInTheDocument();
    expect(screen.getAllByText('CN').length).toBeGreaterThan(0);
  });

  it('runs contribution path analysis and renders contribution path results', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-path'));
    fireEvent.click(await screen.findByRole('button', { name: 'Run contribution path' }));

    await waitFor(() =>
      expect(submitLcaContributionPath).toHaveBeenCalledWith({
        scope: 'dev-v1',
        data_scope: 'current_user',
        process_id: 'process-1',
        process_version: '01.00.000',
        impact_id: 'impact-1',
        amount: 1,
        options: {
          max_depth: 4,
          top_k_children: 5,
          cutoff_share: 0.01,
          max_nodes: 200,
        },
      }),
    );

    expect(await screen.findByText('snapshot-path')).toBeInTheDocument();
    expect(screen.getByText('Top direct contributors')).toBeInTheDocument();
    expect(screen.getAllByText('Solar panel manufacturing').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('bar-chart').length).toBeGreaterThan(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('sankey-chart')).toBeInTheDocument();
  });

  it('keeps sankey visible when the contribution path revisits processes', async () => {
    getLcaContributionPathResult.mockResolvedValueOnce({
      result_id: 'result-path-rich',
      snapshot_id: 'snapshot-path-rich',
      created_at: '2026-03-12T14:20:00Z',
      diagnostics: null,
      artifact: {
        artifact_url: null,
        artifact_format: 'contribution-path:v1',
        artifact_byte_size: 1024,
        artifact_sha256: 'sha',
      },
      job: {
        job_id: 'job-path-rich',
        job_type: 'analyze_contribution_path',
        status: 'completed',
        timestamps: {
          created_at: '2026-03-12T14:19:00Z',
          started_at: '2026-03-12T14:19:10Z',
          finished_at: '2026-03-12T14:20:00Z',
          updated_at: '2026-03-12T14:20:00Z',
        },
      },
      data: {
        ...contributionPathArtifact,
        process_contributions: [
          ...contributionPathArtifact.process_contributions,
          {
            process_id: 'process-3',
            process_index: 3,
            label: 'Battery pack assembly',
            location: 'CN',
            direct_impact: 2.4,
            share_of_total: 0.11,
            is_root: false,
            depth_min: 2,
          },
          {
            process_id: 'process-4',
            process_index: 4,
            label: 'Recycled aluminum',
            location: 'CN',
            direct_impact: 1.2,
            share_of_total: 0.06,
            is_root: false,
            depth_min: 3,
          },
        ],
        links: [
          ...contributionPathArtifact.links,
          {
            source_process_id: 'process-2',
            target_process_id: 'process-3',
            depth_from_root: 2,
            cycle_cut: false,
            direct_impact: 2.4,
            share_of_total: 0.11,
          },
          {
            source_process_id: 'process-3',
            target_process_id: 'process-1',
            depth_from_root: 3,
            cycle_cut: false,
            direct_impact: 1.2,
            share_of_total: 0.06,
          },
          {
            source_process_id: 'process-3',
            target_process_id: 'process-2',
            depth_from_root: 3,
            cycle_cut: true,
            direct_impact: 0.4,
            share_of_total: 0.02,
          },
        ],
      },
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-path'));
    fireEvent.click(await screen.findByRole('button', { name: 'Run contribution path' }));

    expect(await screen.findByText('snapshot-path-rich')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/split by depth/i);
    expect(screen.getByTestId('sankey-chart')).toBeInTheDocument();
  });

  it('resolves path process ids to names and keeps process links clickable', async () => {
    const upstreamProcessId = '123e4567-e89b-12d3-a456-426614174000';
    getProcessDetail.mockResolvedValueOnce({
      data: {
        id: upstreamProcessId,
        version: '03.00.000',
        json: {
          processDataSet: {
            processInformation: {
              dataSetInformation: {
                name: {
                  baseName: [
                    {
                      '@xml:lang': 'en',
                      '#text': 'Upstream silicon purification',
                    },
                  ],
                },
              },
            },
          },
        },
      },
      success: true,
    });
    getLcaContributionPathResult.mockResolvedValueOnce({
      result_id: 'result-path-ids',
      snapshot_id: 'snapshot-path-ids',
      created_at: '2026-03-12T14:30:00Z',
      diagnostics: null,
      artifact: {
        artifact_url: null,
        artifact_format: 'contribution-path:v1',
        artifact_byte_size: 1024,
        artifact_sha256: 'sha',
      },
      job: {
        job_id: 'job-path-ids',
        job_type: 'analyze_contribution_path',
        status: 'completed',
        timestamps: {
          created_at: '2026-03-12T14:20:00Z',
          started_at: '2026-03-12T14:21:00Z',
          finished_at: '2026-03-12T14:30:00Z',
          updated_at: '2026-03-12T14:30:00Z',
        },
      },
      data: {
        ...contributionPathArtifact,
        impact: {
          impact_id: 'impact-1',
          label: 'LCIA Method impact-1',
          unit: 'unknown',
        },
        summary: {
          ...contributionPathArtifact.summary,
          unit: 'unknown',
        },
        process_contributions: [
          {
            process_id: 'process-1',
            process_index: 1,
            label: 'process-1',
            location: 'CN',
            direct_impact: 12.5,
            share_of_total: 0.61,
            is_root: true,
            depth_min: 0,
          },
          {
            process_id: upstreamProcessId,
            process_index: 2,
            label: upstreamProcessId,
            location: 'CN',
            direct_impact: -3.2,
            share_of_total: 0.16,
            is_root: false,
            depth_min: 1,
          },
        ],
        branches: [
          {
            rank: 1,
            path_process_ids: ['process-1', upstreamProcessId],
            path_labels: ['process-1', upstreamProcessId],
            path_score: 3.2,
            terminal_reason: 'leaf',
          },
        ],
        links: [
          {
            source_process_id: 'process-1',
            target_process_id: upstreamProcessId,
            depth_from_root: 1,
            cycle_cut: false,
            direct_impact: -3.2,
            share_of_total: 0.16,
          },
        ],
      },
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-path'));
    fireEvent.click(await screen.findByRole('button', { name: 'Run contribution path' }));

    expect((await screen.findAllByText('Upstream silicon purification')).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId(`process-view-link-${upstreamProcessId}`).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText('kg CO2-eq').length).toBeGreaterThan(0);
  });

  it('requests the next process page from the server when paging forward', async () => {
    listProcessesForLcaAnalysis.mockImplementation(async (params: { current?: number }) => ({
      data: [
        buildProcess(`process-page-${params.current ?? 1}`, 'Paged process', '01.00.000'),
        buildProcess(`process-page-${params.current ?? 1}-2`, 'Paged process 2', '01.00.000'),
      ],
      success: true,
      total: 120,
    }));

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('120 process rows are currently available for analysis.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Showing 1-50 on page 1 of 3.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() =>
      expect(listProcessesForLcaAnalysis).toHaveBeenLastCalledWith(
        {
          current: 2,
          pageSize: 50,
        },
        'en',
        'current_user',
        '',
        {},
        {},
        'all',
        'all',
      ),
    );
    expect(await screen.findByText('Showing 51-100 on page 2 of 3.')).toBeInTheDocument();
  });

  it('switches data scope and uses the selected scope for option loading and hotspot queries', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Data scope'), {
      target: { value: 'all_data' },
    });

    await waitFor(() =>
      expect(listProcessesForLcaAnalysis).toHaveBeenLastCalledWith(
        {
          current: 1,
          pageSize: 50,
        },
        'en',
        'all_data',
        '',
        {},
        {},
        'all',
        'all',
      ),
    );

    queryLcaResults.mockResolvedValueOnce({
      snapshot_id: 'snapshot-hotspot',
      result_id: 'result-hotspot',
      source: 'all_unit',
      mode: 'processes_one_impact',
      data: {
        impact_id: 'impact-1',
        values: {
          'process-1': 12.5,
          'process-2': -3.5,
          'process-3': 4,
        },
      },
      meta: {
        cache_hit: false,
        computed_at: '2026-03-12T13:00:00Z',
      },
    });

    fireEvent.click(screen.getByTestId('tab-hotspots'));
    fireEvent.click(await screen.findByRole('button', { name: 'Run hotspot analysis' }));

    await waitFor(() =>
      expect(queryLcaResults).toHaveBeenCalledWith({
        scope: 'dev-v1',
        data_scope: 'all_data',
        mode: 'processes_one_impact',
        process_ids: ['process-1', 'process-2', 'process-3'],
        impact_id: 'impact-1',
        allow_fallback: false,
      }),
    );
  });
});
