import LcaImpactHotspotToolbar, {
  buildLcaImpactHotspotModel,
  buildSelectedProcessHotspotModel,
} from '@/pages/Processes/Components/lcaImpactHotspotToolbar';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { resetUmiMocks, setUmiIntl, setUmiLocation } from '../../../../mocks/umi';

type ReactNode = import('react').ReactNode;

jest.mock('umi', () => require('../../../../mocks/umi').createUmiMock());

jest.mock('@ant-design/icons', () =>
  require('@/tests/mocks/antDesignIcons').createAntDesignIconsMock(),
);

jest.mock('antd', () => require('@/tests/mocks/antd').createAntdMock());

jest.mock('@/components/ToolBarButton', () => ({
  __esModule: true,
  default: ({
    onClick,
    disabled,
    tooltip,
  }: {
    onClick?: () => void;
    disabled?: boolean;
    tooltip?: ReactNode;
  }) => (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      data-testid='impact-hotspot-trigger'
    >
      {tooltip}
    </button>
  ),
}));

jest.mock('@/services/lca', () => ({
  __esModule: true,
  queryLcaResults: jest.fn(),
  isLcaFunctionInvokeError: jest.fn(() => false),
}));

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessesByIdAndVersion: jest.fn(),
}));

jest.mock('@/services/lciaMethods/util', () => ({
  __esModule: true,
  cacheAndDecompressMethod: jest.fn(),
  getDecompressedMethod: jest.fn(),
}));

const { queryLcaResults } = jest.requireMock('@/services/lca');
const { getProcessesByIdAndVersion } = jest.requireMock('@/services/processes/api');
const { cacheAndDecompressMethod, getDecompressedMethod } = jest.requireMock(
  '@/services/lciaMethods/util',
);
const { isLcaFunctionInvokeError } = jest.requireMock('@/services/lca');

const renderToolbar = () => render(<LcaImpactHotspotToolbar lang='en' />);

const selectImpact = async (impactId = 'impact-1') => {
  await screen.findByText('Climate change (kg CO2-eq)');
  const impactSelect = screen.getByRole('combobox', { name: 'Impact category' });
  fireEvent.change(impactSelect, {
    target: { value: impactId },
  });
  await waitFor(() => expect(impactSelect).toHaveValue(impactId));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Run hotspot ranking' })).not.toBeDisabled(),
  );
};

describe('lcaImpactHotspotToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetUmiMocks();
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
    getProcessesByIdAndVersion.mockResolvedValue({
      data: [
        {
          id: 'process-1',
          version: '01.00.000',
          name: 'Solar panel manufacturing',
        },
        {
          id: 'process-2',
          version: '02.00.000',
          name: 'Wind turbine maintenance',
        },
      ],
      success: true,
    });
    queryLcaResults
      .mockResolvedValueOnce({
        snapshot_id: 'snapshot-1',
        result_id: 'result-1',
        source: 'all_unit',
        mode: 'processes_one_impact',
        data: {
          kind: 'ranked_processes',
          impact_id: 'impact-1',
          offset: 0,
          limit: 10,
          total_process_count: 12,
          total_absolute_value: 40,
          values: [
            {
              process_id: 'process-1',
              process_version: '01.00.000',
              process_index: 5,
              value: 12.5,
              absolute_value: 12.5,
            },
            {
              process_id: 'process-2',
              process_version: '02.00.000',
              process_index: 9,
              value: -3.5,
              absolute_value: 3.5,
            },
          ],
        },
        meta: {
          cache_hit: false,
          computed_at: '2026-03-12T12:00:00Z',
        },
      })
      .mockResolvedValueOnce({
        snapshot_id: 'snapshot-1',
        result_id: 'result-1',
        source: 'all_unit',
        mode: 'processes_one_impact',
        data: {
          kind: 'ranked_processes',
          impact_id: 'impact-1',
          offset: 10,
          limit: 10,
          total_process_count: 12,
          total_absolute_value: 40,
          values: [
            {
              process_id: 'process-2',
              process_version: '02.00.000',
              process_index: 9,
              value: -1.5,
              absolute_value: 1.5,
            },
          ],
        },
        meta: {
          cache_hit: false,
          computed_at: '2026-03-12T12:00:00Z',
        },
      });
  });

  it('builds a hotspot model using global shares and offset ranks', () => {
    const model = buildLcaImpactHotspotModel(
      [
        {
          process_id: 'p-1',
          process_version: '01.00.000',
          process_index: 2,
          value: 8,
          absolute_value: 8,
        },
        {
          process_id: 'p-2',
          process_version: '01.00.000',
          process_index: 5,
          value: -2,
          absolute_value: 2,
        },
      ],
      new Map([
        ['p-1:01.00.000', 'Process A'],
        ['p-2:01.00.000', 'Process B'],
      ]),
      {
        offset: 20,
        limit: 10,
        totalProcessCount: 120,
        totalAbsoluteValue: 20,
      },
    );

    expect(model.items.map((item) => item.globalRank)).toEqual([21, 22]);
    expect(model.items[0].share).toBeCloseTo(0.4, 5);
    expect(model.items[1].cumulativeShare).toBeCloseTo(0.5, 5);
    expect(model.coverageShare).toBeCloseTo(0.5, 5);
    expect(model.topPositiveItem?.processId).toBe('p-1');
    expect(model.topNegativeItem?.processId).toBe('p-2');
  });

  it('builds a hotspot model from an explicit selected process set', () => {
    const model = buildSelectedProcessHotspotModel(
      [
        {
          selectionKey: 'p-1:01.00.000',
          value: 'p-1',
          processId: 'p-1',
          name: 'Process A',
          version: '01.00.000',
          label: 'Process A (01.00.000)',
        },
        {
          selectionKey: 'p-2:02.00.000',
          value: 'p-2',
          processId: 'p-2',
          name: 'Process B',
          version: '02.00.000',
          label: 'Process B (02.00.000)',
        },
        {
          selectionKey: 'p-3:01.00.000',
          value: 'p-3',
          processId: 'p-3',
          name: 'Process C',
          version: '01.00.000',
          label: 'Process C (01.00.000)',
        },
      ],
      {
        'p-1': 8,
        'p-2': -2,
        'p-3': 1,
      },
      {
        limit: 2,
      },
    );

    expect(model.items.map((item) => item.processId)).toEqual(['p-1', 'p-2']);
    expect(model.items.map((item) => item.rank)).toEqual([1, 2]);
    expect(model.totalProcessCount).toBe(3);
    expect(model.totalAbsoluteValue).toBeCloseTo(11, 5);
    expect(model.coverageShare).toBeCloseTo(10 / 11, 5);
    expect(model.topPositiveItem?.processId).toBe('p-1');
    expect(model.topNegativeItem?.processId).toBe('p-2');
  });

  it('builds zeroed hotspot models when the absolute totals are empty', () => {
    const rankedModel = buildLcaImpactHotspotModel([], new Map(), {
      offset: 0,
      limit: 10,
      totalProcessCount: 0,
      totalAbsoluteValue: 0,
    });
    const selectedModel = buildSelectedProcessHotspotModel(
      [
        {
          selectionKey: 'p-2:02.00.000',
          value: 'p-2',
          processId: 'p-2',
          name: 'Process B',
          version: '02.00.000',
          label: 'Process B (02.00.000)',
        },
        {
          selectionKey: 'p-1:01.00.000',
          value: 'p-1',
          processId: 'p-1',
          name: 'Process A',
          version: '01.00.000',
          label: 'Process A (01.00.000)',
        },
      ],
      {
        'p-1': 0,
        'p-2': 0,
      },
    );

    expect(rankedModel.items).toEqual([]);
    expect(rankedModel.totalAbsoluteValue).toBe(0);
    expect(selectedModel.items.map((item) => item.processId)).toEqual(['p-1', 'p-2']);
    expect(selectedModel.items.map((item) => item.direction)).toEqual(['neutral', 'neutral']);
    expect(selectedModel.items.map((item) => item.normalizedValue)).toEqual([0, 0]);
    expect(selectedModel.coverageShare).toBe(0);
  });

  it('normalizes malformed hotspot rows and empty selected-process input', () => {
    const rankedModel = buildLcaImpactHotspotModel(
      [
        {
          process_id: 'p-0',
          process_version: '',
          process_index: Number.NaN,
          value: 0,
          absolute_value: 0,
        },
      ],
      new Map(),
      {
        offset: 0,
        limit: 10,
        totalProcessCount: 1,
        totalAbsoluteValue: 0,
      },
    );
    const selectedModel = buildSelectedProcessHotspotModel([], {}, { limit: 5 });

    expect(rankedModel.items[0]).toMatchObject({
      processName: 'p-0',
      version: '-',
      processIndex: -1,
      normalizedValue: 0,
      share: 0,
      cumulativeShare: 0,
      direction: 'neutral',
    });
    expect(selectedModel.items).toEqual([]);
    expect(selectedModel.limit).toBe(0);
    expect(selectedModel.totalAbsoluteValue).toBe(0);
    expect(selectedModel.topItem).toBeUndefined();
  });

  it('loads hotspot results and paginates to the next slice', async () => {
    renderToolbar();

    fireEvent.click(screen.getByTestId('impact-hotspot-trigger'));

    expect(await screen.findByText('Controls')).toBeInTheDocument();
    expect(await screen.findByText('Climate change (kg CO2-eq)')).toBeInTheDocument();

    const impactSelect = screen.getByRole('combobox', { name: 'Impact category' });
    fireEvent.change(impactSelect, {
      target: { value: 'impact-1' },
    });
    await waitFor(() => expect(impactSelect).toHaveValue('impact-1'));

    const rankWindowSelect = screen.getByRole('combobox', { name: 'Rank window' });
    fireEvent.change(rankWindowSelect, {
      target: { value: '10' },
    });
    await waitFor(() => expect(rankWindowSelect).toHaveValue('10'));

    fireEvent.click(screen.getByRole('button', { name: 'Run hotspot ranking' }));

    await waitFor(() =>
      expect(queryLcaResults).toHaveBeenCalledWith({
        scope: 'dev-v1',
        mode: 'processes_one_impact',
        impact_id: 'impact-1',
        top_n: 10,
        offset: 0,
        sort_by: 'absolute_value',
        sort_direction: 'desc',
        allow_fallback: false,
      }),
    );

    await waitFor(() =>
      expect(getProcessesByIdAndVersion).toHaveBeenCalledWith(
        [
          { id: 'process-1', version: '01.00.000' },
          { id: 'process-2', version: '02.00.000' },
        ],
        'en',
      ),
    );

    expect(await screen.findByText('snapshot-1')).toBeInTheDocument();
    expect(screen.getByText('#1 - #2')).toBeInTheDocument();
    expect(screen.getAllByText('40.0%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Solar panel manufacturing').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Next slice' }));

    await waitFor(() =>
      expect(queryLcaResults).toHaveBeenLastCalledWith({
        scope: 'dev-v1',
        mode: 'processes_one_impact',
        impact_id: 'impact-1',
        top_n: 10,
        offset: 10,
        sort_by: 'absolute_value',
        sort_direction: 'desc',
        allow_fallback: false,
      }),
    );

    expect(await screen.findByText('#11 - #11')).toBeInTheDocument();
  });

  it('uses open_data scope on the tgdata route', async () => {
    setUmiLocation({ pathname: '/tgdata/processes', search: '' });

    renderToolbar();

    fireEvent.click(screen.getByTestId('impact-hotspot-trigger'));
    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run hotspot ranking' }));

    await waitFor(() =>
      expect(queryLcaResults).toHaveBeenCalledWith({
        scope: 'dev-v1',
        data_scope: 'open_data',
        mode: 'processes_one_impact',
        impact_id: 'impact-1',
        top_n: 20,
        offset: 0,
        sort_by: 'absolute_value',
        sort_direction: 'desc',
        allow_fallback: false,
      }),
    );
  });

  it('shows a backend upgrade hint when hotspot ranking hits the legacy query function', async () => {
    queryLcaResults.mockReset();
    isLcaFunctionInvokeError.mockReturnValue(true);
    queryLcaResults.mockRejectedValue({
      name: 'LcaFunctionInvokeError',
      code: 'process_ids_required',
      message: 'process_ids_required',
    });

    renderToolbar();

    fireEvent.click(screen.getByTestId('impact-hotspot-trigger'));
    expect(await screen.findByText('Climate change (kg CO2-eq)')).toBeInTheDocument();

    const impactSelect = screen.getByRole('combobox', { name: 'Impact category' });
    fireEvent.change(impactSelect, {
      target: { value: 'impact-1' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run hotspot ranking' }));

    expect(
      await screen.findByText(
        'The current lca_query_results backend is still on the old compare-only version. Deploy or restart the updated edge function before using hotspot ranking.',
      ),
    ).toBeInTheDocument();
  });

  it('shows alerts when impact categories are empty or fail to load', async () => {
    getDecompressedMethod.mockResolvedValueOnce({
      files: [
        {
          referenceQuantity: {
            'common:shortDescription': [],
          },
        },
      ],
    });
    const { unmount } = renderToolbar();

    fireEvent.click(screen.getByTestId('impact-hotspot-trigger'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No impact categories are available.',
    );

    unmount();
    getDecompressedMethod.mockResolvedValueOnce(null);
    cacheAndDecompressMethod.mockResolvedValueOnce(false);

    renderToolbar();
    fireEvent.click(screen.getByTestId('impact-hotspot-trigger'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load impact categories.');
  });

  it('keeps the drawer open while analysis is loading and allows closing afterward', async () => {
    let resolveQuery: ((value: any) => void) | undefined;
    queryLcaResults.mockReset();
    queryLcaResults.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveQuery = resolve;
        }),
    );

    renderToolbar();

    fireEvent.click(screen.getByTestId('impact-hotspot-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run hotspot ranking' }));

    await waitFor(() =>
      expect(screen.getByTestId('spin')).toHaveAttribute('data-spinning', 'true'),
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[1]);
    expect(screen.getByRole('dialog', { name: 'LCA Impact Hotspots' })).toBeInTheDocument();

    resolveQuery?.({
      snapshot_id: 'snapshot-loading',
      result_id: 'result-loading',
      source: 'all_unit',
      mode: 'processes_one_impact',
      data: {
        kind: 'ranked_processes',
        impact_id: 'impact-1',
        offset: 0,
        limit: 20,
        total_process_count: 0,
        total_absolute_value: 0,
        values: [],
      },
      meta: {
        cache_hit: false,
        computed_at: '2026-03-12T12:00:00Z',
      },
    });

    expect(await screen.findByText('snapshot-loading')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'LCA Impact Hotspots' })).not.toBeInTheDocument(),
    );
  });

  it('handles empty hotspot slices, previous pagination, and lookup fallback paths', async () => {
    queryLcaResults.mockReset();
    getProcessesByIdAndVersion.mockResolvedValueOnce({
      data: [
        {
          id: 'process-1',
          version: '',
          name: '',
        },
      ],
      success: true,
    });
    queryLcaResults
      .mockResolvedValueOnce({
        snapshot_id: 'snapshot-empty',
        result_id: 'result-empty',
        source: 'all_unit',
        mode: 'processes_one_impact',
        data: {
          kind: 'ranked_processes',
          impact_id: 'impact-1',
          offset: 0,
          limit: 10,
          total_process_count: 0,
          total_absolute_value: 0,
          values: [],
        },
        meta: {
          cache_hit: false,
          computed_at: '2026-03-12T12:00:00Z',
        },
      })
      .mockResolvedValueOnce({
        snapshot_id: 'snapshot-page-2',
        result_id: 'result-page-2',
        source: 'all_unit',
        mode: 'processes_one_impact',
        data: {
          kind: 'ranked_processes',
          impact_id: 'impact-1',
          offset: 10,
          limit: 10,
          total_process_count: 12,
          total_absolute_value: 4,
          values: [
            {
              process_id: 'process-1',
              process_version: '01.00.000',
              process_index: 1,
              value: 4,
              absolute_value: 4,
            },
          ],
        },
        meta: {
          cache_hit: false,
          computed_at: '2026-03-12T12:01:00Z',
        },
      })
      .mockResolvedValueOnce({
        snapshot_id: 'snapshot-page-1',
        result_id: 'result-page-1',
        source: 'all_unit',
        mode: 'processes_one_impact',
        data: {
          kind: 'ranked_processes',
          impact_id: 'impact-1',
          offset: 0,
          limit: 10,
          total_process_count: 12,
          total_absolute_value: 4,
          values: [
            {
              process_id: 'process-1',
              process_version: '01.00.000',
              process_index: 1,
              value: 4,
              absolute_value: 4,
            },
          ],
        },
        meta: {
          cache_hit: false,
          computed_at: '2026-03-12T12:02:00Z',
        },
      });

    renderToolbar();

    fireEvent.click(screen.getByTestId('impact-hotspot-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run hotspot ranking' }));

    expect(await screen.findByText('snapshot-empty')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: 'Previous slice' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Run hotspot ranking' }));
    expect(await screen.findByText('snapshot-page-2')).toBeInTheDocument();
    expect(screen.getAllByText('process-1').length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getByRole('button', { name: 'Previous slice' }));
    await waitFor(() =>
      expect(queryLcaResults).toHaveBeenLastCalledWith({
        scope: 'dev-v1',
        mode: 'processes_one_impact',
        impact_id: 'impact-1',
        top_n: 20,
        offset: 0,
        sort_by: 'absolute_value',
        sort_direction: 'desc',
        allow_fallback: false,
      }),
    );
    expect(await screen.findByText('snapshot-page-1')).toBeInTheDocument();
  });

  it('normalizes malformed ranking payloads and ignores invalid lookup rows', async () => {
    queryLcaResults.mockReset();
    getProcessesByIdAndVersion.mockResolvedValueOnce({
      data: [
        {
          version: '01.00.000',
          name: 'ignored-empty-id',
        },
        {
          id: 'process-name-fallback',
          name: 'ignored-empty-version',
        },
        {
          id: 'process-name-fallback',
          version: '01.00.000',
        },
      ],
      success: true,
    });
    queryLcaResults.mockResolvedValueOnce({
      snapshot_id: 'snapshot-malformed',
      result_id: 'result-malformed',
      source: 'all_unit',
      mode: 'processes_one_impact',
      data: {
        kind: 'ranked_processes',
        impact_id: 'impact-1',
        offset: 'bad',
        limit: 0,
        total_process_count: -1,
        total_absolute_value: 0,
        values: [
          {
            process_id: 'process-name-fallback',
            process_version: '01.00.000',
            value: 0,
            absolute_value: 0,
          },
          {},
        ],
      },
      meta: {
        cache_hit: false,
        computed_at: '2026-03-12T12:00:00Z',
      },
    });

    renderToolbar();

    fireEvent.click(screen.getByTestId('impact-hotspot-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run hotspot ranking' }));

    expect(await screen.findByText('snapshot-malformed')).toBeInTheDocument();
    expect(screen.getByText('#1 - #2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next slice' })).toBeDisabled();
    expect(screen.getAllByText('process-name-fallback').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('-1').length).toBeGreaterThanOrEqual(1);
  });

  it('treats omitted hotspot metadata and values as an empty first slice', async () => {
    queryLcaResults.mockReset();
    queryLcaResults.mockResolvedValueOnce({
      snapshot_id: 'snapshot-metadata-fallback',
      result_id: 'result-metadata-fallback',
      source: 'all_unit',
      mode: 'processes_one_impact',
      data: {
        kind: 'ranked_processes',
        impact_id: 'impact-1',
      },
      meta: {
        cache_hit: false,
        computed_at: '2026-03-12T12:00:00Z',
      },
    });

    renderToolbar();

    fireEvent.click(screen.getByTestId('impact-hotspot-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run hotspot ranking' }));

    expect(await screen.findByText('snapshot-metadata-fallback')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: 'Previous slice' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next slice' })).toBeDisabled();
  });

  it('falls back to process ids when lookup rows are not returned as an array', async () => {
    queryLcaResults.mockReset();
    getProcessesByIdAndVersion.mockResolvedValueOnce({
      data: {
        id: 'process-non-array',
      },
      success: true,
    });
    queryLcaResults.mockResolvedValueOnce({
      snapshot_id: 'snapshot-non-array-lookup',
      result_id: 'result-non-array-lookup',
      source: 'all_unit',
      mode: 'processes_one_impact',
      data: {
        kind: 'ranked_processes',
        impact_id: 'impact-1',
        offset: 0,
        limit: 20,
        total_process_count: 1,
        total_absolute_value: 2,
        values: [
          {
            process_id: 'process-non-array',
            process_version: '01.00.000',
            process_index: 1,
            value: 2,
            absolute_value: 2,
          },
        ],
      },
      meta: {
        cache_hit: false,
        computed_at: '2026-03-12T12:00:00Z',
      },
    });

    renderToolbar();

    fireEvent.click(screen.getByTestId('impact-hotspot-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run hotspot ranking' }));

    expect(await screen.findByText('snapshot-non-array-lookup')).toBeInTheDocument();
    expect(screen.getAllByText('process-non-array').length).toBeGreaterThanOrEqual(2);
  });

  it('shows invalid payload, queued build, and generic fallback errors', async () => {
    setUmiIntl({
      locale: 'en-US',
      formatMessage: (
        { defaultMessage, id }: { defaultMessage?: string; id?: string },
        values?: Record<string, unknown>,
      ) =>
        String(defaultMessage ?? id ?? '').replace(/\{([^}]+)\}/g, (_match, key: string) =>
          String(values?.[key] ?? ''),
        ),
    } as any);
    queryLcaResults.mockReset();
    isLcaFunctionInvokeError.mockReset();
    isLcaFunctionInvokeError.mockImplementation(
      (error: any) => error?.code === 'snapshot_build_queued',
    );
    queryLcaResults
      .mockResolvedValueOnce({
        snapshot_id: 'snapshot-invalid',
        result_id: 'result-invalid',
        source: 'all_unit',
        mode: 'processes_one_impact',
        data: {
          kind: 'unsupported',
          impact_id: 'impact-1',
        },
        meta: {
          cache_hit: false,
          computed_at: '2026-03-12T12:00:00Z',
        },
      })
      .mockRejectedValueOnce({
        code: 'snapshot_build_queued',
        body: {
          build_job_id: '  job-7  ',
        },
      })
      .mockRejectedValueOnce({
        code: 'snapshot_build_queued',
        body: {},
      })
      .mockRejectedValueOnce('plain failure');

    renderToolbar();

    fireEvent.click(screen.getByTestId('impact-hotspot-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run hotspot ranking' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unexpected hotspot payload returned from the query API.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run hotspot ranking' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Snapshot build is still running (job job-7). Wait for it to finish, then rerun the analysis.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run hotspot ranking' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Snapshot build is still running. Wait for it to finish, then rerun the analysis.',
    );

    isLcaFunctionInvokeError.mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Run hotspot ranking' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to run hotspot analysis.');
  });

  it('falls back to process ids when loading process names throws', async () => {
    queryLcaResults.mockReset();
    getProcessesByIdAndVersion.mockRejectedValueOnce(new Error('lookup failed'));
    queryLcaResults.mockResolvedValueOnce({
      snapshot_id: 'snapshot-lookup-fallback',
      result_id: 'result-lookup-fallback',
      source: 'all_unit',
      mode: 'processes_one_impact',
      data: {
        kind: 'ranked_processes',
        impact_id: 'impact-1',
        offset: 0,
        limit: 20,
        total_process_count: 1,
        total_absolute_value: 3,
        values: [
          {
            process_id: 'process-fallback',
            process_version: '01.00.000',
            process_index: 3,
            value: 3,
            absolute_value: 3,
          },
        ],
      },
      meta: {
        cache_hit: false,
        computed_at: '2026-03-12T12:00:00Z',
      },
    });

    renderToolbar();

    fireEvent.click(screen.getByTestId('impact-hotspot-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run hotspot ranking' }));

    expect(await screen.findByText('snapshot-lookup-fallback')).toBeInTheDocument();
    expect(screen.getAllByText('process-fallback').length).toBeGreaterThanOrEqual(2);
  });
});
