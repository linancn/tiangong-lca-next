import LcaImpactCompareToolbar, {
  buildLcaImpactCompareModel,
} from '@/pages/Processes/Components/lcaImpactCompareToolbar';
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
      data-testid='impact-compare-trigger'
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

jest.mock('@/services/lciaMethods/util', () => ({
  __esModule: true,
  cacheAndDecompressMethod: jest.fn(),
  getDecompressedMethod: jest.fn(),
}));

const { queryLcaResults } = jest.requireMock('@/services/lca');
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

describe('lcaImpactCompareToolbar', () => {
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
    queryLcaResults.mockResolvedValue({
      snapshot_id: 'snapshot-1',
      result_id: 'result-1',
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
        computed_at: '2026-03-12T12:00:00Z',
      },
    });
  });

  it('builds a sorted compare model with absolute shares', () => {
    const model = buildLcaImpactCompareModel(
      [
        { value: 'p-1', name: 'Process A', version: '1.0', label: 'Process A (1.0)' },
        { value: 'p-2', name: 'Process B', version: '1.0', label: 'Process B (1.0)' },
        { value: 'p-3', name: 'Process C', version: '1.0', label: 'Process C (1.0)' },
      ],
      {
        'p-1': 2,
        'p-2': -5,
        'p-3': 3,
      },
    );

    expect(model.items.map((item) => item.processId)).toEqual(['p-2', 'p-3', 'p-1']);
    expect(model.items.map((item) => item.rank)).toEqual([1, 2, 3]);
    expect(model.totalAbsoluteValue).toBe(10);
    expect(model.items[0].share).toBeCloseTo(0.5, 5);
    expect(model.items[1].cumulativeShare).toBeCloseTo(0.8, 5);
    expect(model.topPositiveItem?.processId).toBe('p-3');
    expect(model.topNegativeItem?.processId).toBe('p-2');
  });

  it('loads impact options and renders comparison results for selected processes', async () => {
    render(
      <LcaImpactCompareToolbar
        lang='en'
        processes={[
          buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
          buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
          buildProcess('process-3', 'Battery pack assembly', '01.00.000'),
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('impact-compare-trigger'));

    expect(await screen.findByText('Controls')).toBeInTheDocument();
    expect(
      screen.getByText('3 selected from 3 visible process rows on this page.'),
    ).toBeInTheDocument();

    expect(await screen.findByText('Climate change (kg CO2-eq)')).toBeInTheDocument();

    const impactSelect = screen.getByRole('combobox', { name: 'Impact category' });
    fireEvent.change(impactSelect, {
      target: { value: 'impact-1' },
    });
    await waitFor(() => expect(impactSelect).toHaveValue('impact-1'));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Run analysis' })).not.toBeDisabled(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run analysis' }));

    await waitFor(() =>
      expect(queryLcaResults).toHaveBeenCalledWith({
        scope: 'dev-v1',
        mode: 'processes_one_impact',
        process_ids: ['process-1', 'process-2', 'process-3'],
        impact_id: 'impact-1',
        allow_fallback: false,
      }),
    );

    expect(await screen.findByText('Climate change')).toBeInTheDocument();
    expect(screen.getByText('snapshot-1')).toBeInTheDocument();
    expect(screen.getByText('result-1')).toBeInTheDocument();
    expect(screen.getAllByText('Solar panel manufacturing').length).toBeGreaterThan(0);
    expect(screen.getByText('Top contributor')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Shares are calculated from absolute values so positive and negative contributors remain comparable.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText('52.7%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('86.5%').length).toBeGreaterThan(0);
  });

  it('shows an alert when impact categories cannot be loaded', async () => {
    getDecompressedMethod.mockResolvedValue(null);
    cacheAndDecompressMethod.mockResolvedValue(false);

    render(
      <LcaImpactCompareToolbar
        lang='en'
        processes={[buildProcess('process-1', 'Solar panel manufacturing', '01.00.000')]}
      />,
    );

    fireEvent.click(screen.getByTestId('impact-compare-trigger'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load impact categories.');
  });
});
