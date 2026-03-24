import LcaAnalysisPage from '@/pages/Processes/Analysis';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { resetAntdToken, setAntdToken } from '../../../../mocks/antd';
import { resetUmiMocks, setUmiLocation, umiMocks } from '../../../../mocks/umi';

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
  Bar: ({ data, theme }: { data?: unknown[]; theme?: { axis?: { gridStroke?: string } } }) => (
    <div
      data-testid='bar-chart'
      data-count={Array.isArray(data) ? data.length : 0}
      data-border-color={theme?.axis?.gridStroke ?? ''}
    />
  ),
  Sankey: ({
    data,
    encode,
    tooltip,
  }: {
    data?: { nodes?: unknown[]; links?: unknown[] };
    encode?: {
      nodeColor?: (datum: unknown) => unknown;
      linkColor?: (datum: unknown) => unknown;
    };
    tooltip?: {
      nodeTitle?: (datum: any) => unknown;
      nodeItems?: Array<{ name?: string; field?: string }>;
      linkItems?: Array<(datum: any) => { name?: string; value?: unknown }>;
    };
  }) => {
    const firstNode = Array.isArray(data?.nodes) ? data.nodes[0] : undefined;
    const firstLink = Array.isArray(data?.links) ? data.links[0] : undefined;
    const objectLink =
      firstLink && typeof firstLink === 'object'
        ? {
            ...(firstLink as Record<string, unknown>),
            source: {
              key: String((firstLink as Record<string, unknown>).source ?? ''),
            },
            target: {
              key: String((firstLink as Record<string, unknown>).target ?? ''),
            },
          }
        : undefined;
    const fallbackKeyLink =
      firstLink && typeof firstLink === 'object'
        ? {
            ...(firstLink as Record<string, unknown>),
            source: 'fallback-source',
            target: 'fallback-target',
            value: Number((firstLink as Record<string, unknown>).value ?? 0) + 1,
          }
        : undefined;
    const missingKeyLink =
      firstLink && typeof firstLink === 'object'
        ? {
            ...(firstLink as Record<string, unknown>),
            source: {},
            target: {},
          }
        : undefined;
    const nodeTitle =
      typeof tooltip?.nodeTitle === 'function' && firstNode ? tooltip.nodeTitle(firstNode) : '';
    const depthNodeTitle =
      typeof tooltip?.nodeTitle === 'function' ? tooltip.nodeTitle({ depth: 2 }) : '';
    const fallbackNodeTitle = typeof tooltip?.nodeTitle === 'function' ? tooltip.nodeTitle({}) : '';
    const nodeItems = Array.isArray(tooltip?.nodeItems)
      ? tooltip.nodeItems.map((item) => ({
          name: item?.name ?? '',
          value:
            item?.field && firstNode && typeof firstNode === 'object'
              ? (firstNode as Record<string, unknown>)[item.field]
              : undefined,
        }))
      : [];
    const linkItems = Array.isArray(tooltip?.linkItems)
      ? [firstLink, objectLink, fallbackKeyLink, missingKeyLink]
          .filter(Boolean)
          .flatMap((datum) => tooltip.linkItems!.map((item) => item(datum)))
      : [];
    const linkColors = [firstLink, fallbackKeyLink, missingKeyLink]
      .filter(Boolean)
      .map((datum) =>
        typeof encode?.linkColor === 'function' ? String(encode.linkColor(datum)) : '',
      );

    return (
      <div
        data-testid='sankey-chart'
        data-node-count={Array.isArray(data?.nodes) ? data.nodes.length : 0}
        data-link-count={Array.isArray(data?.links) ? data.links.length : 0}
        data-node-color={
          typeof encode?.nodeColor === 'function' && firstNode
            ? String(encode.nodeColor(firstNode))
            : ''
        }
        data-link-color={linkColors.join('|')}
      >
        <div data-testid='sankey-node-title'>{String(nodeTitle ?? '')}</div>
        <div data-testid='sankey-node-title-depth'>{String(depthNodeTitle ?? '')}</div>
        <div data-testid='sankey-node-title-fallback'>{String(fallbackNodeTitle ?? '')}</div>
        {nodeItems.map((item, index) => (
          <div key={`node-item-${index}`} data-testid='sankey-node-item'>
            {`${String(item.name ?? '')}:${String(item.value ?? '')}`}
          </div>
        ))}
        {linkItems.map((item, index) => (
          <div key={`link-item-${index}`} data-testid='sankey-link-item'>
            {`${String(item?.name ?? '')}:${String(item?.value ?? '')}`}
          </div>
        ))}
      </div>
    );
  },
}));

jest.mock('@/pages/Processes/Components/view', () => ({
  __esModule: true,
  default: ({ triggerLabel, id }: { triggerLabel?: string; id: string }) => (
    <button type='button' data-testid={`process-view-link-${id}`}>
      {triggerLabel ?? id}
    </button>
  ),
}));

jest.mock('@/pages/Processes/Components/lcaProcessSelectionTable', () => ({
  __esModule: true,
  default: ({
    processOptions = [],
    selectedProcessIds = [],
    selectionType = 'checkbox',
    onSelectionChange,
    titleMessage,
  }: {
    processOptions?: Array<{ value?: string; selectionKey?: string }>;
    selectedProcessIds?: string[];
    selectionType?: 'checkbox' | 'radio';
    onSelectionChange?: (selectedProcessIds: string[]) => void;
    titleMessage?: { defaultMessage?: string };
  }) => {
    const allIds = processOptions
      .map((item) => String(item?.selectionKey ?? item?.value ?? ''))
      .filter(Boolean);
    const primarySelection = selectionType === 'radio' ? allIds.slice(0, 1) : allIds;
    const alternateSelection =
      selectionType === 'radio'
        ? allIds.length > 1
          ? [allIds[1]]
          : primarySelection
        : allIds.slice(0, 2);

    return (
      <div data-testid={`mock-process-selection-${titleMessage?.defaultMessage ?? 'selection'}`}>
        <div>{titleMessage?.defaultMessage ?? 'Process selection'}</div>
        <div data-testid='mock-selected-process-ids'>{selectedProcessIds.join(',')}</div>
        <button type='button' onClick={() => onSelectionChange?.(primarySelection)}>
          Mock select primary process
        </button>
        <button type='button' onClick={() => onSelectionChange?.(alternateSelection)}>
          Mock select alternate process
        </button>
        <button type='button' onClick={() => onSelectionChange?.([])}>
          Mock clear selected processes
        </button>
      </div>
    );
  },
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
  isLcaFunctionInvokeError,
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

const methodListFiles = [
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
  {
    id: 'impact-2',
    description: [
      {
        '@xml:lang': 'en',
        '#text': 'Acidification',
      },
    ],
    referenceQuantity: {
      'common:shortDescription': [
        {
          '@xml:lang': 'en',
          '#text': 'mol H+-eq',
        },
      ],
    },
  },
];

const defaultMethodListFiles = [methodListFiles[0]];

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const appendSelectOption = (select: HTMLSelectElement, value: string, label = value) => {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
};

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
    resetAntdToken();
    resetUmiMocks();
    setUmiLocation({ pathname: '/mydata/processes/analysis', search: '' });
    isLcaFunctionInvokeError.mockImplementation(() => false);

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
      files: defaultMethodListFiles,
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

  it('falls back to colorSplit when the secondary border token is unavailable', async () => {
    setAntdToken({
      colorBorderSecondary: undefined,
      colorSplit: '#abc123',
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load profile' }));

    await waitFor(() =>
      expect(screen.getAllByTestId('bar-chart')[0]).toHaveAttribute('data-border-color', '#abc123'),
    );
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

  it('keeps impact comparison as the only process-set ranking tab', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('tab-compare')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-hotspots')).not.toBeInTheDocument();
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

  it('falls back to empty value maps and placeholder units when impact metadata is missing', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    queryLcaResults.mockResolvedValueOnce({
      snapshot_id: 'snapshot-compare-fallback',
      result_id: 'result-compare-fallback',
      source: 'all_unit',
      mode: 'processes_one_impact',
      data: {
        impact_id: 'impact-missing',
        values: [],
      },
      meta: {
        cache_hit: false,
        computed_at: '2026-03-12T12:35:00Z',
      },
    });

    fireEvent.click(screen.getByTestId('tab-compare'));
    const compareSelect = screen
      .getByTestId('tab-panel-compare')
      .querySelector('select[aria-label="Impact category"]') as HTMLSelectElement;
    appendSelectOption(compareSelect, 'impact-missing', 'Missing impact');
    fireEvent.change(compareSelect, {
      target: { value: 'impact-missing' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run analysis' }));

    expect(await screen.findByText('snapshot-compare-fallback')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);

    queryLcaResults.mockResolvedValueOnce({
      snapshot_id: 'snapshot-grouped-fallback',
      result_id: 'result-grouped-fallback',
      source: 'all_unit',
      mode: 'processes_one_impact',
      data: {
        impact_id: 'impact-missing',
        values: [],
      },
      meta: {
        cache_hit: false,
        computed_at: '2026-03-12T13:35:00Z',
      },
    });

    fireEvent.click(screen.getByTestId('tab-grouped'));
    const groupedSelect = screen
      .getByTestId('tab-panel-grouped')
      .querySelector('select[aria-label="Impact category"]') as HTMLSelectElement;
    appendSelectOption(groupedSelect, 'impact-missing', 'Missing impact');
    fireEvent.change(groupedSelect, {
      target: { value: 'impact-missing' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run grouped analysis' }));

    expect(await screen.findByText('snapshot-grouped-fallback')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('preserves selected impact categories when impact options refresh', async () => {
    getDecompressedMethod.mockResolvedValue({
      files: methodListFiles,
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-compare'));
    fireEvent.change(
      screen
        .getByTestId('tab-panel-compare')
        .querySelector('select[aria-label="Impact category"]')!,
      {
        target: { value: 'impact-2' },
      },
    );

    fireEvent.click(screen.getByTestId('tab-grouped'));
    fireEvent.change(
      screen
        .getByTestId('tab-panel-grouped')
        .querySelector('select[aria-label="Impact category"]')!,
      {
        target: { value: 'impact-2' },
      },
    );

    fireEvent.click(screen.getByTestId('tab-path'));
    fireEvent.change(
      screen.getByTestId('tab-panel-path').querySelector('select[aria-label="Impact category"]')!,
      {
        target: { value: 'impact-2' },
      },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh options' }));

    await waitFor(() =>
      expect(
        (
          screen
            .getByTestId('tab-panel-path')
            .querySelector('select[aria-label="Impact category"]') as HTMLSelectElement
        ).value,
      ).toBe('impact-2'),
    );

    fireEvent.click(screen.getByTestId('tab-compare'));
    expect(
      (
        screen
          .getByTestId('tab-panel-compare')
          .querySelector('select[aria-label="Impact category"]') as HTMLSelectElement
      ).value,
    ).toBe('impact-2');

    fireEvent.click(screen.getByTestId('tab-grouped'));
    expect(
      (
        screen
          .getByTestId('tab-panel-grouped')
          .querySelector('select[aria-label="Impact category"]') as HTMLSelectElement
      ).value,
    ).toBe('impact-2');
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

  it('submits contribution path without a process version when the selected process has no version', async () => {
    listProcessesForLcaAnalysis.mockResolvedValue({
      data: [buildProcess('process-blank-version', 'Blank version process', '')],
      success: true,
      total: 1,
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('1 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-path'));
    fireEvent.click(await screen.findByRole('button', { name: 'Run contribution path' }));

    await waitFor(() =>
      expect(submitLcaContributionPath).toHaveBeenCalledWith({
        scope: 'dev-v1',
        data_scope: 'current_user',
        process_id: 'process-blank-version',
        process_version: undefined,
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
  });

  it('requests the next process page from the server when paging forward', async () => {
    listProcessesForLcaAnalysis.mockImplementation(async (params: { current?: number }) => ({
      data:
        params.current === 2
          ? [
              buildProcess(`process-page-${params.current ?? 1}`, 'Paged process', '01.00.000'),
              {
                ...buildProcess('process-invalid', 'Invalid process row', '01.00.000'),
                id: undefined,
                version: undefined,
                key: 'invalid-page-row',
              },
            ]
          : [
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

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));

    await waitFor(() =>
      expect(listProcessesForLcaAnalysis).toHaveBeenLastCalledWith(
        {
          current: 1,
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
    expect(await screen.findByText('Showing 1-50 on page 1 of 3.')).toBeInTheDocument();
  });

  it('preserves the original process version selection after paging to a different version of the same id', async () => {
    listProcessesForLcaAnalysis.mockImplementation(async (params: { current?: number }) => ({
      data:
        params.current === 2
          ? [
              buildProcess('process-shared', 'Paged process v2', '02.00.000'),
              buildProcess('process-3', 'Battery pack assembly', '01.00.000'),
            ]
          : [
              buildProcess('process-shared', 'Paged process v1', '01.00.000'),
              buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
            ],
      success: true,
      total: 120,
    }));

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('120 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

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

    fireEvent.click(screen.getByTestId('tab-path'));
    const pathPanel = screen.getByTestId('tab-panel-path');
    expect(within(pathPanel).getByTestId('mock-selected-process-ids')).toHaveTextContent(
      'process-shared:01.00.000',
    );

    fireEvent.click(within(pathPanel).getByRole('button', { name: 'Run contribution path' }));

    await waitFor(() =>
      expect(submitLcaContributionPath).toHaveBeenCalledWith({
        scope: 'dev-v1',
        data_scope: 'current_user',
        process_id: 'process-shared',
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
  });

  it('switches data scope and uses the selected scope for option loading and compare queries', async () => {
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

    fireEvent.click(screen.getByTestId('tab-compare'));
    fireEvent.click(await screen.findByRole('button', { name: 'Run analysis' }));

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

  it('shows empty-state alerts when no processes or impact categories are available', async () => {
    listProcessesForLcaAnalysis.mockResolvedValueOnce({
      data: [],
      success: true,
      total: 0,
    });
    getDecompressedMethod.mockResolvedValueOnce({
      files: [
        {
          id: '',
          description: [],
          referenceQuantity: {
            'common:shortDescription': [],
          },
        },
      ],
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('0 process rows are currently available for analysis.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('No processes are available for the selected data scope.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('No impact categories are available.')).toBeInTheDocument();
  });

  it('treats non-array process payloads and missing totals as an empty process result', async () => {
    listProcessesForLcaAnalysis.mockResolvedValue({
      data: null,
      success: true,
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('0 process rows are currently available for analysis.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No processes are available for the selected data scope.'),
    ).toBeInTheDocument();
  });

  it('shows process and impact load failures when loaders fail', async () => {
    listProcessesForLcaAnalysis.mockResolvedValueOnce({
      data: [],
      success: false,
      total: 0,
    });
    getDecompressedMethod.mockResolvedValueOnce(null);
    cacheAndDecompressMethod.mockResolvedValueOnce(false);

    render(<LcaAnalysisPage />);

    expect(await screen.findByText('Failed to load processes for analysis.')).toBeInTheDocument();
    expect(await screen.findByText('Failed to load impact categories.')).toBeInTheDocument();
  });

  it('renders the profile empty state when valid LCIA rows are absent', async () => {
    queryLcaResults.mockResolvedValueOnce({
      snapshot_id: 'snapshot-profile-empty',
      result_id: 'result-profile-empty',
      source: 'all_unit',
      mode: 'process_all_impacts',
      data: {
        values: [
          {
            impact_id: '',
            value: 0,
          },
        ],
      },
      meta: {
        cache_hit: false,
        computed_at: '2026-03-12T12:05:00Z',
      },
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load profile' }));

    const profilePanel = screen.getByTestId('tab-panel-profile');
    expect(await screen.findByText('snapshot-profile-empty')).toBeInTheDocument();
    expect(
      within(profilePanel).getAllByText('No LCIA results available for profile analysis.').length,
    ).toBeGreaterThan(0);
    expect(within(profilePanel).queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('normalizes sparse LCIA profile rows before rendering chart data', async () => {
    queryLcaResults.mockResolvedValueOnce({
      snapshot_id: 'snapshot-profile-sparse',
      result_id: 'result-profile-sparse',
      source: 'all_unit',
      mode: 'process_all_impacts',
      data: {
        values: [
          {
            impact_id: undefined,
            impact_name: undefined,
            unit: undefined,
            value: 1,
            impact_index: undefined,
          },
          {
            impact_id: 'impact-1',
            impact_name: undefined,
            unit: undefined,
            value: 1,
            impact_index: undefined,
          },
        ],
      },
      meta: {
        cache_hit: false,
        computed_at: '2026-03-12T12:10:00Z',
      },
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load profile' }));

    expect(await screen.findByText('snapshot-profile-sparse')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-count', '1');
  });

  it('treats non-array profile solver payloads as empty chart data', async () => {
    queryLcaResults.mockResolvedValueOnce({
      snapshot_id: 'snapshot-profile-non-array',
      result_id: 'result-profile-non-array',
      source: 'all_unit',
      mode: 'process_all_impacts',
      data: {
        values: {},
      },
      meta: {
        cache_hit: false,
        computed_at: '2026-03-12T12:15:00Z',
      },
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load profile' }));

    const profilePanel = screen.getByTestId('tab-panel-profile');
    expect(await screen.findByText('snapshot-profile-non-array')).toBeInTheDocument();
    expect(
      within(profilePanel).getAllByText('No LCIA results available for profile analysis.').length,
    ).toBeGreaterThan(0);
  });

  it('searches, refreshes, and navigates back to the process list', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load profile' }));
    expect(await screen.findByText('snapshot-profile')).toBeInTheDocument();

    const searchInput = within(screen.getByTestId('search-input'));
    fireEvent.change(searchInput.getByRole('textbox'), {
      target: { value: 'battery' },
    });
    fireEvent.click(searchInput.getByRole('button', { name: 'Search' }));

    await waitFor(() =>
      expect(listProcessesForLcaAnalysis).toHaveBeenLastCalledWith(
        {
          current: 1,
          pageSize: 50,
        },
        'en',
        'current_user',
        'battery',
        {},
        {},
        'all',
        'all',
      ),
    );
    expect(screen.queryByText('snapshot-profile')).not.toBeInTheDocument();

    const previousMethodCallCount = getDecompressedMethod.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh options' }));

    await waitFor(() =>
      expect(listProcessesForLcaAnalysis).toHaveBeenLastCalledWith(
        {
          current: 1,
          pageSize: 50,
        },
        'en',
        'current_user',
        'battery',
        {},
        {},
        'all',
        'all',
      ),
    );
    await waitFor(() =>
      expect(getDecompressedMethod.mock.calls.length).toBeGreaterThan(previousMethodCallCount),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to processes' }));
    expect(umiMocks.historyPush).toHaveBeenCalledWith('/mydata/processes');
  });

  it('renders queued snapshot error states for profile, compare, and grouped analyses', async () => {
    isLcaFunctionInvokeError.mockImplementation((error: { code?: string } | undefined) =>
      Boolean(error?.code),
    );
    getDecompressedMethod.mockResolvedValue({
      files: methodListFiles,
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    queryLcaResults.mockRejectedValueOnce({ code: 'no_ready_snapshot' });
    fireEvent.click(screen.getByRole('button', { name: 'Load profile' }));
    expect(
      await screen.findByText('No ready snapshot is available for the selected data scope.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-compare'));
    const comparePanel = screen.getByTestId('tab-panel-compare');
    fireEvent.change(within(comparePanel).getByLabelText('Impact category'), {
      target: { value: 'impact-2' },
    });
    fireEvent.click(
      within(comparePanel).getByRole('button', { name: 'Mock select alternate process' }),
    );

    queryLcaResults.mockRejectedValueOnce({
      code: 'snapshot_build_queued',
      body: { build_job_id: 'build-42' },
    });
    fireEvent.click(within(comparePanel).getByRole('button', { name: 'Run analysis' }));

    expect(
      await screen.findByText(
        'Snapshot build is still running{jobSuffix}. Wait for it to finish, then rerun the analysis.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-grouped'));
    queryLcaResults.mockRejectedValueOnce({
      code: 'snapshot_build_queued',
      body: {},
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Run grouped analysis' }));
    expect(
      await screen.findByText(
        'Snapshot build is still running{jobSuffix}. Wait for it to finish, then rerun the analysis.',
      ),
    ).toBeInTheDocument();
  });

  it('renders stale-snapshot and generic fallback errors for analysis actions', async () => {
    const staleError = { code: 'snapshot_stale_rebuild_required' };

    isLcaFunctionInvokeError.mockImplementation(
      (error: { code?: string } | undefined) => error === staleError,
    );

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    queryLcaResults.mockRejectedValueOnce(staleError);
    fireEvent.click(screen.getByRole('button', { name: 'Load profile' }));
    expect(
      await screen.findByText(
        'The ready snapshot for the selected data scope is stale. Rebuild it before rerunning the analysis.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-compare'));
    queryLcaResults.mockRejectedValueOnce('unexpected-compare-failure');
    fireEvent.click(await screen.findByRole('button', { name: 'Run analysis' }));
    expect(await screen.findByText('Failed to run impact analysis.')).toBeInTheDocument();
  });

  it('resets compare and grouped results when filters or selections change', async () => {
    getDecompressedMethod.mockResolvedValue({
      files: methodListFiles,
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-compare'));
    fireEvent.click(await screen.findByRole('button', { name: 'Run analysis' }));
    expect(await screen.findByText('snapshot-compare')).toBeInTheDocument();

    let activePanel = screen.getByTestId('tab-panel-compare');
    fireEvent.change(within(activePanel).getByLabelText('Impact category'), {
      target: { value: 'impact-2' },
    });
    expect(screen.queryByText('snapshot-compare')).not.toBeInTheDocument();
    fireEvent.click(
      within(activePanel).getByRole('button', { name: 'Mock select alternate process' }),
    );
    fireEvent.click(within(activePanel).getByRole('button', { name: 'Clear selection' }));
    expect(within(activePanel).getByRole('button', { name: 'Run analysis' })).toBeDisabled();

    fireEvent.click(screen.getByTestId('tab-grouped'));
    activePanel = screen.getByTestId('tab-panel-grouped');
    fireEvent.change(within(activePanel).getByLabelText('Group by'), {
      target: { value: 'team' },
    });
    fireEvent.change(within(activePanel).getByLabelText('Impact category'), {
      target: { value: 'impact-2' },
    });
    fireEvent.click(
      within(activePanel).getByRole('button', { name: 'Mock select alternate process' }),
    );
    fireEvent.click(within(activePanel).getByRole('button', { name: 'Clear selection' }));
    expect(
      within(activePanel).getByRole('button', { name: 'Run grouped analysis' }),
    ).toBeDisabled();
  });

  it('shows grouped analysis failure alerts', async () => {
    isLcaFunctionInvokeError.mockImplementation((error: { code?: string } | undefined) =>
      Boolean(error?.code),
    );

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-grouped'));
    queryLcaResults.mockRejectedValueOnce({ code: 'snapshot_stale_rebuild_required' });
    fireEvent.click(await screen.findByRole('button', { name: 'Run grouped analysis' }));
    expect(
      await screen.findByText(
        'The ready snapshot for the selected data scope is stale. Rebuild it before rerunning the analysis.',
      ),
    ).toBeInTheDocument();

    queryLcaResults.mockRejectedValueOnce(new Error('grouped failed'));
    fireEvent.click(await screen.findByRole('button', { name: 'Run grouped analysis' }));
    expect(await screen.findByText('grouped failed')).toBeInTheDocument();
  });

  it('resets path results when path inputs change and validates non-zero amounts', async () => {
    getDecompressedMethod.mockResolvedValue({
      files: methodListFiles,
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-path'));
    fireEvent.click(await screen.findByRole('button', { name: 'Run contribution path' }));
    expect(await screen.findByText('snapshot-path')).toBeInTheDocument();

    const pathPanel = screen.getByTestId('tab-panel-path');
    const pathNumberInputs = within(pathPanel).getAllByRole('spinbutton');
    fireEvent.change(within(pathPanel).getByLabelText('Impact category'), {
      target: { value: 'impact-2' },
    });
    expect(screen.queryByText('snapshot-path')).not.toBeInTheDocument();

    fireEvent.change(pathNumberInputs[0], {
      target: { value: '2' },
    });
    fireEvent.change(pathNumberInputs[1], {
      target: { value: '5' },
    });
    fireEvent.change(pathNumberInputs[2], {
      target: { value: '6' },
    });
    fireEvent.change(pathNumberInputs[3], {
      target: { value: '0.05' },
    });
    fireEvent.change(pathNumberInputs[4], {
      target: { value: '240' },
    });
    fireEvent.click(
      within(pathPanel).getByRole('button', { name: 'Mock select alternate process' }),
    );
    fireEvent.click(within(pathPanel).getByRole('button', { name: 'Clear selection' }));
    expect(within(pathPanel).getByRole('button', { name: 'Run contribution path' })).toBeDisabled();

    fireEvent.click(within(pathPanel).getByRole('button', { name: 'Mock select primary process' }));
    fireEvent.change(within(pathPanel).getByLabelText('Impact category'), {
      target: { value: 'impact-1' },
    });
    fireEvent.change(pathNumberInputs[0], {
      target: { value: '0' },
    });
    fireEvent.click(within(pathPanel).getByRole('button', { name: 'Run contribution path' }));
    expect(await screen.findByText('Please enter a non-zero amount.')).toBeInTheDocument();
  });

  it('restores default contribution-path numeric inputs when cleared', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-path'));

    const pathPanel = screen.getByTestId('tab-panel-path');
    const pathNumberInputs = within(pathPanel).getAllByRole('spinbutton') as HTMLInputElement[];

    pathNumberInputs.forEach((input) => {
      fireEvent.change(input, {
        target: { value: '' },
      });
    });

    await waitFor(() => {
      expect(pathNumberInputs[0].value).toBe('1');
      expect(pathNumberInputs[1].value).toBe('4');
      expect(pathNumberInputs[2].value).toBe('5');
      expect(pathNumberInputs[3].value).toBe('0.01');
      expect(pathNumberInputs[4].value).toBe('200');
    });
  });

  it('clears the selected root process when the path selection table is reset', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-path'));

    const pathPanel = screen.getByTestId('tab-panel-path');
    expect(within(pathPanel).getByTestId('mock-selected-process-ids')).toHaveTextContent(
      'process-1:01.00.000',
    );

    fireEvent.click(
      within(pathPanel).getByRole('button', { name: 'Mock clear selected processes' }),
    );

    await waitFor(() =>
      expect(within(pathPanel).getByTestId('mock-selected-process-ids')).toHaveTextContent(''),
    );
    expect(within(pathPanel).getByRole('button', { name: 'Run contribution path' })).toBeDisabled();
  });

  it('handles contribution path snapshot-building and failed async job states', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-path'));

    submitLcaContributionPath.mockResolvedValueOnce({
      mode: 'snapshot_building',
      build_job_id: 'build-7',
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Run contribution path' }));
    expect(
      await screen.findByText(
        'Snapshot build is still running{jobSuffix}. Wait for it to finish, then rerun the analysis.',
      ),
    ).toBeInTheDocument();

    submitLcaContributionPath.mockResolvedValueOnce({
      mode: 'snapshot_building',
      build_job_id: '',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run contribution path' }));
    expect(
      await screen.findByText(
        'Snapshot build is still running{jobSuffix}. Wait for it to finish, then rerun the analysis.',
      ),
    ).toBeInTheDocument();

    submitLcaContributionPath.mockResolvedValueOnce({
      mode: 'submitted',
      job_id: 'job-1',
    });
    pollLcaJobUntilTerminal.mockResolvedValueOnce({
      status: 'failed',
      result: null,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run contribution path' }));
    expect(await screen.findByText('Contribution path analysis failed.')).toBeInTheDocument();

    submitLcaContributionPath.mockResolvedValueOnce({
      mode: 'submitted',
      job_id: 'job-2',
    });
    pollLcaJobUntilTerminal.mockResolvedValueOnce({
      status: 'completed',
      result: {
        result_id: '   ',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run contribution path' }));
    expect(
      await screen.findByText('Contribution path analysis finished without a result.'),
    ).toBeInTheDocument();

    submitLcaContributionPath.mockResolvedValueOnce({
      mode: 'submitted',
      job_id: 'job-3',
    });
    pollLcaJobUntilTerminal.mockResolvedValueOnce({
      status: 'completed',
      result: null,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run contribution path' }));
    expect(
      await screen.findByText('Contribution path analysis finished without a result.'),
    ).toBeInTheDocument();
  });

  it('renders contribution path fallbacks for invalid payloads, empty charts, and terminal reasons', async () => {
    getDecompressedMethod.mockResolvedValueOnce({
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
                '#text': 'unknown',
              },
            ],
          },
        },
      ],
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-path'));

    getLcaContributionPathResult.mockResolvedValueOnce({
      result_id: 'result-path-invalid',
      snapshot_id: 'snapshot-path-invalid',
      created_at: '2026-03-12T14:40:00Z',
      diagnostics: null,
      artifact: {
        artifact_url: null,
        artifact_format: 'contribution-path:v1',
        artifact_byte_size: 1024,
        artifact_sha256: 'sha',
      },
      job: {
        job_id: 'job-path-invalid',
        job_type: 'analyze_contribution_path',
        status: 'completed',
        timestamps: {
          created_at: '2026-03-12T14:39:00Z',
          started_at: '2026-03-12T14:39:10Z',
          finished_at: '2026-03-12T14:40:00Z',
          updated_at: '2026-03-12T14:40:00Z',
        },
      },
      data: null,
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Run contribution path' }));
    expect(
      await screen.findByText(
        'Unexpected contribution path payload returned from the analysis API.',
      ),
    ).toBeInTheDocument();

    getLcaContributionPathResult.mockResolvedValueOnce({
      result_id: 'result-path-empty',
      snapshot_id: 'snapshot-path-empty',
      created_at: '2026-03-12T14:50:00Z',
      diagnostics: null,
      artifact: {
        artifact_url: null,
        artifact_format: 'contribution-path:v1',
        artifact_byte_size: 1024,
        artifact_sha256: 'sha',
      },
      job: {
        job_id: 'job-path-empty',
        job_type: 'analyze_contribution_path',
        status: 'completed',
        timestamps: {
          created_at: '2026-03-12T14:49:00Z',
          started_at: '2026-03-12T14:49:10Z',
          finished_at: '2026-03-12T14:50:00Z',
          updated_at: '2026-03-12T14:50:00Z',
        },
      },
      data: {
        ...contributionPathArtifact,
        impact: {
          impact_id: 'impact-1',
          label: 'Fallback impact',
          unit: 'MJ',
        },
        summary: {
          ...contributionPathArtifact.summary,
          unit: 'unknown',
        },
        process_contributions: [],
        branches: [
          {
            rank: 1,
            path_process_ids: [],
            path_labels: ['Fallback root'],
            path_score: 1.2,
            terminal_reason: 'cutoff',
          },
          {
            rank: 2,
            path_process_ids: ['process-1'],
            path_labels: ['Solar panel manufacturing'],
            path_score: 1.1,
            terminal_reason: 'max_depth',
          },
          {
            rank: 3,
            path_process_ids: ['process-1'],
            path_labels: ['Solar panel manufacturing'],
            path_score: 1.0,
            terminal_reason: 'max_nodes',
          },
          {
            rank: 4,
            path_process_ids: ['process-1'],
            path_labels: ['Solar panel manufacturing'],
            path_score: 0.9,
            terminal_reason: 'cycle_cut',
          },
          {
            rank: 5,
            path_process_ids: ['process-1'],
            path_labels: ['Solar panel manufacturing'],
            path_score: 0.8,
            terminal_reason: 'top_k',
          },
          {
            rank: 6,
            path_process_ids: ['process-1'],
            path_labels: ['Solar panel manufacturing'],
            path_score: 0.7,
            terminal_reason: 'custom_reason',
          },
        ],
        links: [],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run contribution path' }));

    expect(await screen.findByText('snapshot-path-empty')).toBeInTheDocument();
    expect(screen.getAllByText('MJ').length).toBeGreaterThan(0);
    expect(
      screen.getByText('No direct contributors are available for charting.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('sankey-chart')).not.toBeInTheDocument();
    expect(screen.getByText('Cut off by share threshold')).toBeInTheDocument();
    expect(screen.getByText('Stopped at max depth')).toBeInTheDocument();
    expect(screen.getByText('Stopped at max node limit')).toBeInTheDocument();
    expect(screen.getAllByText('Cycle cut').length).toBeGreaterThan(0);
    expect(screen.getByText('Stopped by top-k child limit')).toBeInTheDocument();
    expect(screen.getByText('custom_reason')).toBeInTheDocument();
  });

  it('renders contribution-path row and sankey fallbacks for missing labels and empty terminal reasons', async () => {
    getLcaContributionPathResult.mockResolvedValueOnce({
      result_id: 'result-path-fallback-rows',
      snapshot_id: 'snapshot-path-fallback-rows',
      created_at: '2026-03-12T15:40:00Z',
      diagnostics: null,
      artifact: {
        artifact_url: null,
        artifact_format: 'contribution-path:v1',
        artifact_byte_size: 1024,
        artifact_sha256: 'sha',
      },
      job: {
        job_id: 'job-path-fallback-rows',
        job_type: 'analyze_contribution_path',
        status: 'completed',
        timestamps: {
          created_at: '2026-03-12T15:39:00Z',
          started_at: '2026-03-12T15:39:10Z',
          finished_at: '2026-03-12T15:40:00Z',
          updated_at: '2026-03-12T15:40:00Z',
        },
      },
      data: {
        ...contributionPathArtifact,
        root: {
          process_id: 'process-1',
          label: '',
        },
        process_contributions: [
          {
            process_id: 'process-1',
            process_index: 1,
            label: '',
            location: '',
            direct_impact: 12.5,
            share_of_total: 0.61,
            is_root: true,
            depth_min: null,
          },
          {
            process_id: 'process-fallback',
            process_index: 2,
            label: '',
            location: '',
            direct_impact: 2.4,
            share_of_total: 0.11,
            is_root: false,
            depth_min: 1,
          },
        ],
        branches: [
          {
            rank: 1,
            path_process_ids: ['process-1', 'process-fallback'],
            path_labels: ['', ''],
            path_score: 2.4,
            terminal_reason: '',
          },
          {
            rank: 2,
            path_process_ids: [],
            path_labels: [],
            path_score: 0.5,
            terminal_reason: 'leaf',
          },
        ],
        links: [
          {
            source_process_id: 'process-1',
            target_process_id: 'process-fallback',
            depth_from_root: 1,
            cycle_cut: false,
            direct_impact: 2.4,
            share_of_total: 0.11,
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

    expect(await screen.findByText('snapshot-path-fallback-rows')).toBeInTheDocument();
    expect(screen.getAllByText('process-fallback').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    expect(screen.getByTestId('sankey-node-title-depth')).toHaveTextContent('- · depth 2');
    expect(screen.getByTestId('sankey-node-title-fallback')).toHaveTextContent('-');
    expect(screen.getByText('Source:fallback-source')).toBeInTheDocument();
    expect(screen.getByText('Target:fallback-target')).toBeInTheDocument();
  });

  it('uses branch labels when path metadata is unavailable', async () => {
    getLcaContributionPathResult.mockResolvedValueOnce({
      result_id: 'result-path-branch-label',
      snapshot_id: 'snapshot-path-branch-label',
      created_at: '2026-03-12T15:42:00Z',
      diagnostics: null,
      artifact: {
        artifact_url: null,
        artifact_format: 'contribution-path:v1',
        artifact_byte_size: 1024,
        artifact_sha256: 'sha',
      },
      job: {
        job_id: 'job-path-branch-label',
        job_type: 'analyze_contribution_path',
        status: 'completed',
        timestamps: {
          created_at: '2026-03-12T15:41:00Z',
          started_at: '2026-03-12T15:41:10Z',
          finished_at: '2026-03-12T15:42:00Z',
          updated_at: '2026-03-12T15:42:00Z',
        },
      },
      data: {
        ...contributionPathArtifact,
        process_contributions: [
          contributionPathArtifact.process_contributions[0],
          {
            process_id: 'process-label-only',
            process_index: 2,
            label: '',
            location: '',
            direct_impact: 2.4,
            share_of_total: 0.11,
            is_root: false,
            depth_min: 1,
          },
        ],
        branches: [
          {
            rank: 1,
            path_process_ids: ['process-1', 'process-label-only'],
            path_labels: ['Solar panel manufacturing', 'Branch-only fallback'],
            path_score: 2.4,
            terminal_reason: 'leaf',
          },
        ],
        links: [
          {
            source_process_id: 'process-1',
            target_process_id: 'process-label-only',
            depth_from_root: 1,
            cycle_cut: false,
            direct_impact: 2.4,
            share_of_total: 0.11,
          },
        ],
      },
    });
    getProcessDetail.mockRejectedValueOnce(new Error('detail failed'));

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-path'));
    fireEvent.click(await screen.findByRole('button', { name: 'Run contribution path' }));

    expect(await screen.findByText('snapshot-path-branch-label')).toBeInTheDocument();
    expect(
      screen
        .getAllByTestId('process-view-link-process-label-only')
        .some((element) => element.textContent?.includes('Branch-only fallback')),
    ).toBe(true);
  });

  it('falls back to raw process ids when a branch-only process has no label or metadata', async () => {
    getLcaContributionPathResult.mockResolvedValueOnce({
      result_id: 'result-path-process-id-fallback',
      snapshot_id: 'snapshot-path-process-id-fallback',
      created_at: '2026-03-12T15:43:00Z',
      diagnostics: null,
      artifact: {
        artifact_url: null,
        artifact_format: 'contribution-path:v1',
        artifact_byte_size: 1024,
        artifact_sha256: 'sha',
      },
      job: {
        job_id: 'job-path-process-id-fallback',
        job_type: 'analyze_contribution_path',
        status: 'completed',
        timestamps: {
          created_at: '2026-03-12T15:42:00Z',
          started_at: '2026-03-12T15:42:10Z',
          finished_at: '2026-03-12T15:43:00Z',
          updated_at: '2026-03-12T15:43:00Z',
        },
      },
      data: {
        ...contributionPathArtifact,
        process_contributions: [contributionPathArtifact.process_contributions[0]],
        branches: [
          {
            rank: 1,
            path_process_ids: ['process-1', 'process-branch-only'],
            path_labels: ['Solar panel manufacturing', ''],
            path_score: 1.6,
            terminal_reason: 'leaf',
          },
        ],
        links: [],
      },
    });
    getProcessDetail.mockResolvedValueOnce({
      data: null,
      success: true,
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-path'));
    fireEvent.click(await screen.findByRole('button', { name: 'Run contribution path' }));

    expect(await screen.findByText('snapshot-path-process-id-fallback')).toBeInTheDocument();
    expect(
      screen
        .getAllByTestId('process-view-link-process-branch-only')
        .some((element) => element.textContent === 'process-branch-only'),
    ).toBe(true);
  });

  it('reloads missing contributor metadata after refresh and falls back to selected root names', async () => {
    getLcaContributionPathResult.mockResolvedValueOnce({
      result_id: 'result-path-refresh-meta',
      snapshot_id: 'snapshot-path-refresh-meta',
      created_at: '2026-03-12T15:45:00Z',
      diagnostics: null,
      artifact: {
        artifact_url: null,
        artifact_format: 'contribution-path:v1',
        artifact_byte_size: 1024,
        artifact_sha256: 'sha',
      },
      job: {
        job_id: 'job-path-refresh-meta',
        job_type: 'analyze_contribution_path',
        status: 'completed',
        timestamps: {
          created_at: '2026-03-12T15:44:00Z',
          started_at: '2026-03-12T15:44:10Z',
          finished_at: '2026-03-12T15:45:00Z',
          updated_at: '2026-03-12T15:45:00Z',
        },
      },
      data: {
        ...contributionPathArtifact,
        root: {
          process_id: 'process-1',
          label: '',
        },
        process_contributions: [
          contributionPathArtifact.process_contributions[0],
          {
            process_id: 'process-fallback',
            process_index: 2,
            label: '',
            location: '',
            direct_impact: 2.4,
            share_of_total: 0.11,
            is_root: false,
            depth_min: 1,
          },
        ],
        branches: [
          {
            rank: 1,
            path_process_ids: ['process-1', 'process-fallback'],
            path_labels: ['', ''],
            path_score: 2.4,
            terminal_reason: 'leaf',
          },
        ],
        links: [
          {
            source_process_id: 'process-1',
            target_process_id: 'process-fallback',
            depth_from_root: 1,
            cycle_cut: false,
            direct_impact: 2.4,
            share_of_total: 0.11,
          },
        ],
      },
    });
    getProcessDetail.mockResolvedValueOnce({
      data: {
        version: '',
        json: {
          processDataSet: {
            processInformation: {
              dataSetInformation: {
                name: {},
              },
            },
          },
        },
      },
      success: true,
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-path'));
    fireEvent.click(await screen.findByRole('button', { name: 'Run contribution path' }));
    expect(await screen.findByText('snapshot-path-refresh-meta')).toBeInTheDocument();
    await waitFor(() => expect(getProcessDetail).toHaveBeenCalledWith('process-fallback', ''));
    expect(screen.getAllByTestId('process-view-link-process-1').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('process-view-link-process-1')[0]).toHaveTextContent(
      'Solar panel manufacturing',
    );
    expect(screen.getAllByText('process-fallback').length).toBeGreaterThan(0);

    listProcessesForLcaAnalysis.mockResolvedValueOnce({
      data: [
        buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
        buildProcess('process-3', 'Battery pack assembly', '01.00.000'),
      ],
      success: true,
      total: 2,
    });
    getProcessDetail.mockResolvedValueOnce({
      data: {
        version: undefined,
        json: {
          processDataSet: {
            processInformation: {
              dataSetInformation: {
                name: {
                  baseName: [
                    {
                      '@xml:lang': 'en',
                      '#text': 'Resolved root process',
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

    fireEvent.click(screen.getByRole('button', { name: 'Refresh options' }));

    await waitFor(() =>
      expect(screen.getAllByTestId('process-view-link-process-fallback')[0]).toHaveTextContent(
        'Resolved root process',
      ),
    );
  });

  it('ignores stale process-option responses and stale loader errors', async () => {
    const initialRefresh = createDeferred<{
      data: ReturnType<typeof buildProcess>[];
      success: boolean;
      total: number;
    }>();
    const staleSearch = createDeferred<{
      data: ReturnType<typeof buildProcess>[];
      success: boolean;
      total: number;
    }>();

    listProcessesForLcaAnalysis
      .mockImplementationOnce(() => initialRefresh.promise)
      .mockResolvedValueOnce({
        data: [
          buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
          {
            ...buildProcess('process-invalid', 'Invalid process row', '01.00.000'),
            id: undefined,
            version: undefined,
            key: 'invalid-row',
          },
        ],
        success: true,
        total: 2,
      })
      .mockImplementationOnce(() => staleSearch.promise)
      .mockResolvedValueOnce({
        data: [buildProcess('process-4', 'Fresh process', '01.00.000')],
        success: true,
        total: 1,
      });

    render(<LcaAnalysisPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh options' }));
    expect(
      await screen.findByText('2 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    initialRefresh.resolve({
      data: [buildProcess('process-stale', 'Stale response', '01.00.000')],
      success: true,
      total: 1,
    });

    await waitFor(() =>
      expect(
        screen.getByText('2 process rows are currently available for analysis.'),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByText('1 process rows are currently available for analysis.'),
    ).not.toBeInTheDocument();

    const searchInput = within(screen.getByTestId('search-input'));
    fireEvent.change(searchInput.getByRole('textbox'), {
      target: { value: 'fresh' },
    });
    fireEvent.click(searchInput.getByRole('button', { name: 'Search' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh options' }));

    expect(
      await screen.findByText('1 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    staleSearch.reject(new Error('stale search failed'));
    await waitFor(() =>
      expect(screen.queryByText('Failed to load processes for analysis.')).not.toBeInTheDocument(),
    );
  });

  it('ignores delayed team metadata after unmount', async () => {
    const delayedTeams = createDeferred<{
      data: Array<{ id: string; json: Record<string, unknown> }>;
      success: boolean;
    }>();

    getTeams.mockImplementationOnce(() => delayedTeams.promise);

    const { unmount } = render(<LcaAnalysisPage />);
    await waitFor(() => expect(getTeams).toHaveBeenCalled());

    unmount();

    delayedTeams.resolve({
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
  });

  it('recomputes grouped team labels when team metadata arrives', async () => {
    const delayedTeams = createDeferred<{
      data: Array<{ id: string; json: Record<string, unknown> }>;
      success: boolean;
    }>();

    listProcessesForLcaAnalysis.mockResolvedValue({
      data: [
        {
          ...buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
          teamId: 'team-1',
        },
        {
          ...buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
          teamId: '',
        },
      ],
      success: true,
      total: 2,
    });
    getTeams.mockImplementationOnce(() => delayedTeams.promise);

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('2 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-grouped'));
    const groupedPanel = screen.getByTestId('tab-panel-grouped');
    fireEvent.change(within(groupedPanel).getByLabelText('Group by'), {
      target: { value: 'team' },
    });
    fireEvent.click(within(groupedPanel).getByRole('button', { name: 'Run grouped analysis' }));

    expect((await screen.findAllByText('team-1')).length).toBeGreaterThan(0);

    delayedTeams.resolve({
      data: [
        {
          id: '',
          json: {
            title: [],
          },
        },
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

    expect((await screen.findAllByText('Operations')).length).toBeGreaterThan(0);
  });

  it('falls back to raw team ids when team metadata loading fails', async () => {
    listProcessesForLcaAnalysis.mockResolvedValue({
      data: [
        {
          ...buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
          teamId: 'team-1',
        },
        {
          ...buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
          teamId: '',
        },
      ],
      success: true,
      total: 2,
    });
    getTeams.mockRejectedValueOnce(new Error('teams failed'));

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('2 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-grouped'));
    const groupedPanel = screen.getByTestId('tab-panel-grouped');
    fireEvent.change(within(groupedPanel).getByLabelText('Group by'), {
      target: { value: 'team' },
    });
    fireEvent.click(within(groupedPanel).getByRole('button', { name: 'Run grouped analysis' }));
    expect((await screen.findAllByText('team-1')).length).toBeGreaterThan(0);
  });

  it('falls back to raw team ids when team titles are missing', async () => {
    listProcessesForLcaAnalysis.mockResolvedValue({
      data: [
        {
          ...buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
          teamId: 'team-1',
        },
        {
          ...buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
          teamId: 'team-2',
        },
      ],
      success: true,
      total: 2,
    });
    getTeams.mockResolvedValueOnce({
      data: [
        {
          json: {},
        },
        {
          id: 'team-1',
          json: {
            title: [],
          },
        },
        {
          id: 'team-2',
        },
      ],
      success: true,
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('2 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-grouped'));
    const groupedPanel = screen.getByTestId('tab-panel-grouped');
    fireEvent.change(within(groupedPanel).getByLabelText('Group by'), {
      target: { value: 'team' },
    });
    fireEvent.click(within(groupedPanel).getByRole('button', { name: 'Run grouped analysis' }));

    expect((await screen.findAllByText('team-1')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('team-2')).length).toBeGreaterThan(0);
  });

  it('falls back to raw team ids when the team metadata payload is not an array', async () => {
    listProcessesForLcaAnalysis.mockResolvedValue({
      data: [
        {
          ...buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
          teamId: 'team-1',
        },
      ],
      success: true,
      total: 1,
    });
    getTeams.mockResolvedValueOnce({
      data: {},
      success: true,
    });

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('1 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-grouped'));
    const groupedPanel = screen.getByTestId('tab-panel-grouped');
    fireEvent.change(within(groupedPanel).getByLabelText('Group by'), {
      target: { value: 'team' },
    });
    fireEvent.click(within(groupedPanel).getByRole('button', { name: 'Run grouped analysis' }));

    expect((await screen.findAllByText('team-1')).length).toBeGreaterThan(0);
  });

  it('shows a profile validation error when the selected process is no longer available', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    const profilePanel = screen.getByTestId('tab-panel-profile');
    const profileSelect = within(profilePanel).getByLabelText('Process') as HTMLSelectElement;
    appendSelectOption(profileSelect, 'process-missing', 'Missing process');

    fireEvent.change(profileSelect, {
      target: { value: 'process-missing' },
    });
    fireEvent.click(within(profilePanel).getByRole('button', { name: 'Load profile' }));

    expect(await screen.findByText('Please select a process')).toBeInTheDocument();
    expect(queryLcaResults).not.toHaveBeenCalled();
  });

  it('clears profile state on process changes', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load profile' }));
    expect(await screen.findByText('snapshot-profile')).toBeInTheDocument();

    const profilePanel = screen.getByTestId('tab-panel-profile');
    fireEvent.change(within(profilePanel).getByLabelText('Process'), {
      target: { value: 'process-2:02.00.000' },
    });
    expect(screen.queryByText('snapshot-profile')).not.toBeInTheDocument();
  });

  it('handles contribution path jobs without a returned job id and falls back when process detail loading fails', async () => {
    getLcaContributionPathResult.mockResolvedValueOnce({
      result_id: 'result-path-fallback',
      snapshot_id: 'snapshot-path-fallback',
      created_at: '2026-03-12T15:00:00Z',
      diagnostics: null,
      artifact: {
        artifact_url: null,
        artifact_format: 'contribution-path:v1',
        artifact_byte_size: 1024,
        artifact_sha256: 'sha',
      },
      job: {
        job_id: 'job-path-fallback',
        job_type: 'analyze_contribution_path',
        status: 'completed',
        timestamps: {
          created_at: '2026-03-12T14:59:00Z',
          started_at: '2026-03-12T14:59:10Z',
          finished_at: '2026-03-12T15:00:00Z',
          updated_at: '2026-03-12T15:00:00Z',
        },
      },
      data: {
        ...contributionPathArtifact,
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
            process_id: 'process-missing',
            process_index: 2,
            label: 'process-missing',
            location: 'CN',
            direct_impact: 2.4,
            share_of_total: 0.11,
            is_root: false,
            depth_min: 1,
          },
        ],
        branches: [
          {
            rank: 1,
            path_process_ids: ['process-1', 'process-missing'],
            path_labels: ['Solar panel manufacturing', 'process-missing'],
            path_score: 2.4,
            terminal_reason: 'leaf',
          },
        ],
        links: [
          {
            source_process_id: 'process-1',
            target_process_id: 'process-missing',
            depth_from_root: 1,
            cycle_cut: false,
            direct_impact: 2.4,
            share_of_total: 0.11,
          },
        ],
      },
    });

    getProcessDetail.mockImplementationOnce(() => Promise.reject(new Error('detail failed')));

    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-path'));

    submitLcaContributionPath.mockResolvedValueOnce({
      mode: 'submitted',
      job_id: '',
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Run contribution path' }));
    expect(
      await screen.findByText('Contribution path analysis finished without a result.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Run contribution path' }));
    expect((await screen.findAllByText('process-missing')).length).toBeGreaterThan(0);
  });

  it('ignores delayed contribution-path process metadata after unmount', async () => {
    const unresolvedProcessDetail = createDeferred<{
      data: null;
      success: boolean;
    }>();

    getLcaContributionPathResult.mockResolvedValueOnce({
      result_id: 'result-path-cancelled',
      snapshot_id: 'snapshot-path-cancelled',
      created_at: '2026-03-12T15:10:00Z',
      diagnostics: null,
      artifact: {
        artifact_url: null,
        artifact_format: 'contribution-path:v1',
        artifact_byte_size: 1024,
        artifact_sha256: 'sha',
      },
      job: {
        job_id: 'job-path-cancelled',
        job_type: 'analyze_contribution_path',
        status: 'completed',
        timestamps: {
          created_at: '2026-03-12T15:09:00Z',
          started_at: '2026-03-12T15:09:10Z',
          finished_at: '2026-03-12T15:10:00Z',
          updated_at: '2026-03-12T15:10:00Z',
        },
      },
      data: {
        ...contributionPathArtifact,
        process_contributions: [
          ...contributionPathArtifact.process_contributions,
          {
            process_id: 'process-delayed',
            process_index: 3,
            label: 'process-delayed',
            location: 'CN',
            direct_impact: 1.1,
            share_of_total: 0.04,
            is_root: false,
            depth_min: 1,
          },
        ],
        links: [
          ...contributionPathArtifact.links,
          {
            source_process_id: 'process-1',
            target_process_id: 'process-delayed',
            depth_from_root: 1,
            cycle_cut: false,
            direct_impact: 1.1,
            share_of_total: 0.04,
          },
        ],
      },
    });
    getProcessDetail.mockImplementationOnce(() => unresolvedProcessDetail.promise);

    const { unmount } = render(<LcaAnalysisPage />);
    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tab-path'));
    fireEvent.click(screen.getByRole('button', { name: 'Run contribution path' }));
    await waitFor(() => expect(getProcessDetail).toHaveBeenCalled());
    unmount();

    unresolvedProcessDetail.resolve({
      data: null,
      success: true,
    });
  });

  it('uses summary or placeholder units when contribution-path impact metadata is unavailable', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process rows are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-path'));

    const pathPanel = screen.getByTestId('tab-panel-path');
    const impactSelect = within(pathPanel).getByLabelText('Impact category') as HTMLSelectElement;
    appendSelectOption(impactSelect, 'impact-summary-unit', 'Impact summary unit');
    fireEvent.change(impactSelect, {
      target: { value: 'impact-summary-unit' },
    });

    getLcaContributionPathResult.mockResolvedValueOnce({
      result_id: 'result-path-summary-unit',
      snapshot_id: 'snapshot-path-summary-unit',
      created_at: '2026-03-12T15:20:00Z',
      diagnostics: null,
      artifact: {
        artifact_url: null,
        artifact_format: 'contribution-path:v1',
        artifact_byte_size: 1024,
        artifact_sha256: 'sha',
      },
      job: {
        job_id: 'job-path-summary-unit',
        job_type: 'analyze_contribution_path',
        status: 'completed',
        timestamps: {
          created_at: '2026-03-12T15:19:00Z',
          started_at: '2026-03-12T15:19:10Z',
          finished_at: '2026-03-12T15:20:00Z',
          updated_at: '2026-03-12T15:20:00Z',
        },
      },
      data: {
        ...contributionPathArtifact,
        impact: {
          impact_id: 'impact-1',
          label: 'Summary fallback impact',
          unit: 'unknown',
        },
        summary: {
          ...contributionPathArtifact.summary,
          unit: 'kWh',
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run contribution path' }));
    expect((await screen.findAllByText('kWh')).length).toBeGreaterThan(0);

    appendSelectOption(impactSelect, 'impact-placeholder-unit', 'Impact placeholder unit');
    fireEvent.change(impactSelect, {
      target: { value: 'impact-placeholder-unit' },
    });

    getLcaContributionPathResult.mockResolvedValueOnce({
      result_id: 'result-path-placeholder-unit',
      snapshot_id: 'snapshot-path-placeholder-unit',
      created_at: '2026-03-12T15:30:00Z',
      diagnostics: null,
      artifact: {
        artifact_url: null,
        artifact_format: 'contribution-path:v1',
        artifact_byte_size: 1024,
        artifact_sha256: 'sha',
      },
      job: {
        job_id: 'job-path-placeholder-unit',
        job_type: 'analyze_contribution_path',
        status: 'completed',
        timestamps: {
          created_at: '2026-03-12T15:29:00Z',
          started_at: '2026-03-12T15:29:10Z',
          finished_at: '2026-03-12T15:30:00Z',
          updated_at: '2026-03-12T15:30:00Z',
        },
      },
      data: {
        ...contributionPathArtifact,
        impact: {
          impact_id: 'impact-1',
          label: 'Placeholder fallback impact',
          unit: '-',
        },
        summary: {
          ...contributionPathArtifact.summary,
          unit: 'unknown',
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run contribution path' }));
    expect(await screen.findByText('snapshot-path-placeholder-unit')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });
});
