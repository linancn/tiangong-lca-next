import LcaImpactHotspotToolbar, {
  buildLcaImpactHotspotModel,
  buildSelectedProcessHotspotModel,
} from '@/pages/Processes/Components/lcaImpactHotspotToolbar';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

type ReactNode = import('react').ReactNode;

jest.mock('umi', () => require('@/tests/mocks/umi').createUmiMock());

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

describe('lcaImpactHotspotToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
          value: 'p-1',
          name: 'Process A',
          version: '01.00.000',
          label: 'Process A (01.00.000)',
        },
        {
          value: 'p-2',
          name: 'Process B',
          version: '02.00.000',
          label: 'Process B (02.00.000)',
        },
        {
          value: 'p-3',
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

  it('loads hotspot results and paginates to the next slice', async () => {
    render(<LcaImpactHotspotToolbar lang='en' />);

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

  it('shows a backend upgrade hint when hotspot ranking hits the legacy query function', async () => {
    queryLcaResults.mockReset();
    isLcaFunctionInvokeError.mockReturnValue(true);
    queryLcaResults.mockRejectedValue({
      name: 'LcaFunctionInvokeError',
      code: 'process_ids_required',
      message: 'process_ids_required',
    });

    render(<LcaImpactHotspotToolbar lang='en' />);

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
});
