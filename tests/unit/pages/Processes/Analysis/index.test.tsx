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
}));

jest.mock('@/services/lca', () => ({
  __esModule: true,
  queryLcaResults: jest.fn(),
  isLcaFunctionInvokeError: jest.fn(() => false),
}));

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessTableAll: jest.fn(),
  getProcessTablePgroongaSearch: jest.fn(),
}));

jest.mock('@/services/lciaMethods/util', () => ({
  __esModule: true,
  cacheAndDecompressMethod: jest.fn(),
  getDecompressedMethod: jest.fn(),
}));

const { queryLcaResults } = jest.requireMock('@/services/lca');
const { getProcessTableAll } = jest.requireMock('@/services/processes/api');
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

describe('LcaAnalysisPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetUmiMocks();
    setUmiLocation({ pathname: '/mydata/processes/analysis', search: '' });

    getProcessTableAll.mockResolvedValue({
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
  });

  it('loads a process profile and renders the chart summary', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process options are currently available for analysis.'),
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
      await screen.findByText('3 process options are currently available for analysis.'),
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
      await screen.findByText('3 process options are currently available for analysis.'),
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

  it('switches data scope and uses the selected scope for option loading and hotspot queries', async () => {
    render(<LcaAnalysisPage />);

    expect(
      await screen.findByText('3 process options are currently available for analysis.'),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Data scope'), {
      target: { value: 'all_data' },
    });

    await waitFor(() =>
      expect(getProcessTableAll).toHaveBeenLastCalledWith(
        {
          current: 1,
          pageSize: 50,
        },
        {},
        'en',
        '',
        '',
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
