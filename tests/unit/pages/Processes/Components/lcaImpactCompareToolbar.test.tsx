import LcaImpactCompareToolbar, {
  buildLcaImpactCompareModel,
} from '@/pages/Processes/Components/lcaImpactCompareToolbar';
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
const { isLcaFunctionInvokeError } = jest.requireMock('@/services/lca');
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

const renderToolbar = (
  processes = [buildProcess('process-1', 'Solar panel manufacturing', '01.00.000')],
) => render(<LcaImpactCompareToolbar lang='en' processes={processes} />);

const selectImpact = async (impactId = 'impact-1') => {
  await screen.findByText('Climate change (kg CO2-eq)');
  const impactSelect = screen.getByRole('combobox', { name: 'Impact category' });
  fireEvent.change(impactSelect, {
    target: { value: impactId },
  });
  await waitFor(() => expect(impactSelect).toHaveValue(impactId));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Run analysis' })).not.toBeDisabled(),
  );
};

describe('lcaImpactCompareToolbar', () => {
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

  it('builds a sorted compare model with absolute shares, neutral directions, and name tie-breaks', () => {
    const model = buildLcaImpactCompareModel(
      [
        {
          selectionKey: 'p-1:1.0',
          value: 'p-1',
          processId: 'p-1',
          name: 'Process B',
          version: '1.0',
          label: 'Process B (1.0)',
        },
        {
          selectionKey: 'p-2:1.0',
          value: 'p-2',
          processId: 'p-2',
          name: 'Process A',
          version: '1.0',
          label: 'Process A (1.0)',
        },
        {
          selectionKey: 'p-3:1.0',
          value: 'p-3',
          processId: 'p-3',
          name: 'Process C',
          version: '1.0',
          label: 'Process C (1.0)',
        },
      ],
      {
        'p-1': 5,
        'p-2': -5,
        'p-3': 0,
      },
    );

    expect(model.items.map((item) => item.processId)).toEqual(['p-2', 'p-1', 'p-3']);
    expect(model.items.map((item) => item.rank)).toEqual([1, 2, 3]);
    expect(model.totalAbsoluteValue).toBe(10);
    expect(model.items[0].share).toBeCloseTo(0.5, 5);
    expect(model.items[1].cumulativeShare).toBeCloseTo(1, 5);
    expect(model.topPositiveItem?.processId).toBe('p-1');
    expect(model.topNegativeItem?.processId).toBe('p-2');
    expect(model.items[2].direction).toBe('neutral');
  });

  it('builds a zeroed compare model when no process has meaningful impact values', () => {
    const model = buildLcaImpactCompareModel(
      [
        {
          selectionKey: 'p-1:1.0',
          value: 'p-1',
          processId: 'p-1',
          name: 'Process A',
          version: '1.0',
          label: 'Process A (1.0)',
        },
        {
          selectionKey: 'p-2:1.0',
          value: 'p-2',
          processId: 'p-2',
          name: 'Process B',
          version: '1.0',
          label: 'Process B (1.0)',
        },
      ],
      {
        'p-1': 0,
        'p-2': 0,
      },
    );

    expect(model.totalAbsoluteValue).toBe(0);
    expect(model.items.map((item) => item.normalizedValue)).toEqual([0, 0]);
    expect(model.items.map((item) => item.share)).toEqual([0, 0]);
    expect(model.items.map((item) => item.cumulativeShare)).toEqual([0, 0]);
    expect(buildLcaImpactCompareModel([], {}).topItem).toBeUndefined();
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

  it('uses open_data scope on the tgdata route', async () => {
    setUmiLocation({ pathname: '/tgdata/processes', search: '' });

    renderToolbar([
      buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
      buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
    ]);

    fireEvent.click(screen.getByTestId('impact-compare-trigger'));
    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run analysis' }));

    await waitFor(() =>
      expect(queryLcaResults).toHaveBeenCalledWith({
        scope: 'dev-v1',
        data_scope: 'open_data',
        mode: 'processes_one_impact',
        process_ids: ['process-1', 'process-2'],
        impact_id: 'impact-1',
        allow_fallback: false,
      }),
    );
  });

  it('shows an alert when impact categories cannot be loaded', async () => {
    getDecompressedMethod.mockResolvedValue(null);
    cacheAndDecompressMethod.mockResolvedValue(false);

    renderToolbar();

    fireEvent.click(screen.getByTestId('impact-compare-trigger'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load impact categories.');
  });

  it('renders a disabled trigger tooltip when no processes are available', () => {
    renderToolbar([]);

    expect(screen.getByTestId('impact-compare-trigger')).toBeDisabled();
    expect(screen.getByTestId('impact-compare-trigger')).toHaveTextContent(
      'No processes are available on the current page.',
    );
  });

  it('shows an empty-state alert when no impact categories are available', async () => {
    getDecompressedMethod.mockResolvedValue({
      files: [
        {
          referenceQuantity: {
            'common:shortDescription': [],
          },
        },
      ],
    });

    renderToolbar();

    fireEvent.click(screen.getByTestId('impact-compare-trigger'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No impact categories are available.',
    );
  });

  it('restores the default selection when visible processes change and the current selection becomes invalid', async () => {
    const view = renderToolbar([
      buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
      buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
    ]);

    fireEvent.click(screen.getByTestId('impact-compare-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    await waitFor(() =>
      expect(
        screen.getByText('0 selected from 2 visible process rows on this page.'),
      ).toBeInTheDocument(),
    );

    view.rerender(
      <LcaImpactCompareToolbar
        lang='en'
        processes={[buildProcess('process-3', 'Battery pack assembly', '03.00.000')]}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByText('1 selected from 1 visible process rows on this page.'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('checkbox', { name: /battery pack assembly/i })).toBeChecked();
  });

  it('supports selecting, clearing, and toggling processes while clearing previous results', async () => {
    renderToolbar([
      buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
      buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
      buildProcess('process-3', 'Battery pack assembly', '01.00.000'),
    ]);

    fireEvent.click(screen.getByTestId('impact-compare-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run analysis' }));

    expect(await screen.findByText('snapshot-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /wind turbine maintenance/i }));

    await waitFor(() =>
      expect(
        screen.getByText('2 selected from 3 visible process rows on this page.'),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText('snapshot-1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    await waitFor(() =>
      expect(
        screen.getByText('0 selected from 3 visible process rows on this page.'),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /battery pack assembly/i }));
    await waitFor(() =>
      expect(
        screen.getByText('1 selected from 3 visible process rows on this page.'),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select all visible' }));
    await waitFor(() =>
      expect(
        screen.getByText('3 selected from 3 visible process rows on this page.'),
      ).toBeInTheDocument(),
    );
  });

  it('keeps the drawer open while analysis is loading and allows closing after completion', async () => {
    let resolveQuery: ((value: any) => void) | undefined;
    queryLcaResults.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveQuery = resolve;
        }),
    );

    renderToolbar([
      buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
      buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
    ]);

    fireEvent.click(screen.getByTestId('impact-compare-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run analysis' }));

    await waitFor(() =>
      expect(screen.getByTestId('spin')).toHaveAttribute('data-spinning', 'true'),
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[1]);
    expect(screen.getByRole('dialog', { name: 'LCA Impact Compare' })).toBeInTheDocument();

    resolveQuery?.({
      snapshot_id: 'snapshot-2',
      result_id: 'result-2',
      source: 'all_unit',
      mode: 'processes_one_impact',
      data: {
        impact_id: 'impact-1',
        values: {
          'process-1': 1,
          'process-2': 2,
        },
      },
      meta: {
        cache_hit: false,
        computed_at: '2026-03-12T12:00:00Z',
      },
    });

    expect(await screen.findByText('snapshot-2')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'LCA Impact Compare' })).not.toBeInTheDocument(),
    );
  });

  it('treats non-object solver values as an empty value map', async () => {
    queryLcaResults.mockResolvedValueOnce({
      snapshot_id: 'snapshot-empty-values',
      result_id: 'result-empty-values',
      source: 'all_unit',
      mode: 'processes_one_impact',
      data: {
        impact_id: 'impact-1',
        values: [],
      },
      meta: {
        cache_hit: false,
        computed_at: '2026-03-12T12:00:00Z',
      },
    });

    renderToolbar([
      buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
      buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
    ]);

    fireEvent.click(screen.getByTestId('impact-compare-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run analysis' }));

    expect(await screen.findByText('snapshot-empty-values')).toBeInTheDocument();
    expect(screen.getAllByText('0.0%').length).toBeGreaterThan(0);
  });

  it('shows a queued snapshot build error with the trimmed job id', async () => {
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
    isLcaFunctionInvokeError.mockImplementation(
      (error: any) => error?.code === 'snapshot_build_queued',
    );
    queryLcaResults.mockRejectedValueOnce({
      code: 'snapshot_build_queued',
      body: {
        build_job_id: '  job-42  ',
      },
    });

    renderToolbar([
      buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
      buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
    ]);

    fireEvent.click(screen.getByTestId('impact-compare-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run analysis' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Snapshot build is still running (job job-42). Wait for it to finish, then rerun the analysis.',
    );
  });

  it('shows a queued snapshot build error without a job suffix when none is provided', async () => {
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
    isLcaFunctionInvokeError.mockImplementation(
      (error: any) => error?.code === 'snapshot_build_queued',
    );
    queryLcaResults.mockRejectedValueOnce({
      code: 'snapshot_build_queued',
      body: {},
    });

    renderToolbar([
      buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
      buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
    ]);

    fireEvent.click(screen.getByTestId('impact-compare-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run analysis' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Snapshot build is still running. Wait for it to finish, then rerun the analysis.',
    );
  });

  it('shows thrown analysis errors directly', async () => {
    queryLcaResults.mockRejectedValueOnce(new Error('analysis exploded'));

    renderToolbar([
      buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
      buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
    ]);

    fireEvent.click(screen.getByTestId('impact-compare-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run analysis' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('analysis exploded');
  });

  it('shows the default failure message for non-Error rejections', async () => {
    queryLcaResults.mockRejectedValueOnce('plain failure');

    renderToolbar([
      buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
      buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
    ]);

    fireEvent.click(screen.getByTestId('impact-compare-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run analysis' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to run impact analysis.');
  });

  it('clears the selected impact and previous results when the impact select is reset', async () => {
    renderToolbar([
      buildProcess('process-1', 'Solar panel manufacturing', '01.00.000'),
      buildProcess('process-2', 'Wind turbine maintenance', '02.00.000'),
    ]);

    fireEvent.click(screen.getByTestId('impact-compare-trigger'));
    expect(await screen.findByText('Controls')).toBeInTheDocument();

    await selectImpact();
    fireEvent.click(screen.getByRole('button', { name: 'Run analysis' }));
    expect(await screen.findByText('snapshot-1')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Impact category' }), {
      target: { value: '' },
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Run analysis' })).toBeDisabled(),
    );
    expect(screen.queryByText('snapshot-1')).not.toBeInTheDocument();
  });
});
