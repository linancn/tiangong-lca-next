// @ts-nocheck
import ProcessLciaResultsPanel from '@/pages/Processes/Components/processLciaResultsPanel';
import { act, render, screen, waitFor } from '@testing-library/react';

const mockGetDataSource = jest.fn();
const mockGetLangText = jest.fn();
const mockGetReferenceQuantityFromMethod = jest.fn();
const mockQueryLcaResults = jest.fn();
const mockIsLcaFunctionInvokeError = jest.fn();
const mockGetPublishedLciaResultPackage = jest.fn();
const mockUseLocation = jest.fn();

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any, values?: Record<string, unknown>) => {
      const template = defaultMessage ?? id;
      return Object.entries(values ?? {}).reduce(
        (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
        template,
      );
    },
  }),
  useLocation: () => mockUseLocation(),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: (...args: any[]) => mockGetDataSource(...args),
  getLangJson: (value: any) => value,
  getLangText: (...args: any[]) => mockGetLangText(...args),
}));

jest.mock('@/services/lciaMethods/util', () => ({
  __esModule: true,
  cacheAndDecompressMethod: jest.fn(),
  getDecompressedMethod: jest.fn(),
  getReferenceQuantityFromMethod: (...args: any[]) => mockGetReferenceQuantityFromMethod(...args),
}));

jest.mock('@/services/lca', () => ({
  __esModule: true,
  isLcaFunctionInvokeError: (...args: any[]) => mockIsLcaFunctionInvokeError(...args),
  queryLcaResults: (...args: any[]) => mockQueryLcaResults(...args),
}));

jest.mock('@/services/dataProducts', () => ({
  __esModule: true,
  getPublishedLciaResultPackage: (...args: any[]) => mockGetPublishedLciaResultPackage(...args),
}));

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  default: ({ value }: any) => <span data-testid='aligned-number'>{value}</span>,
}));

jest.mock('@/pages/Processes/Components/lcaProfileSummary', () => ({
  __esModule: true,
  default: ({ headerExtra, loading, notice, rows }: any) => (
    <div data-testid='lca-profile-summary' data-loading={String(loading)}>
      <div data-testid='lca-profile-header-extra'>{headerExtra}</div>
      <div data-testid='lca-profile-notice'>{notice}</div>
      {rows.length}
    </div>
  ),
}));

jest.mock('@/pages/Processes/Components/lcaCalculationEvidenceNotice', () => ({
  __esModule: true,
  default: () => <div data-testid='lcia-evidence-notice' />,
}));

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
  ProTable: ({ columns = [], dataSource = [], rowKey }: any) => {
    const resolveRowKey = (row: any, index: number) => {
      if (typeof rowKey === 'function') return rowKey(row);
      if (typeof rowKey === 'string') return row?.[rowKey];
      return row.key ?? index;
    };

    return (
      <div data-testid='pro-table'>
        {dataSource.map((row: any, rowIndex: number) => (
          <div
            key={resolveRowKey(row, rowIndex)}
            data-testid={`pro-row-${resolveRowKey(row, rowIndex)}`}
          >
            {columns.map((column: any, columnIndex: number) => (
              <span key={column.dataIndex ?? columnIndex}>
                {column.render
                  ? column.render(row[column.dataIndex], row, rowIndex)
                  : toText(row[column.dataIndex])}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));

jest.mock('antd', () => {
  const Button = ({ children, icon, loading, onClick, ...props }: any) => (
    <button type='button' data-loading={String(loading)} onClick={onClick} {...props}>
      {icon}
      {toText(children)}
    </button>
  );
  const Space = ({ children }: any) => <div>{children}</div>;
  const Tooltip = ({ children, title }: any) => (
    <span data-testid='tooltip' data-title={toText(title)}>
      {children}
    </span>
  );
  const Typography = {
    Text: ({ children, type }: any) => (
      <span data-testid={`typography-${type ?? 'default'}`}>{children}</span>
    ),
  };

  return {
    __esModule: true,
    Button,
    Space,
    Tooltip,
    Typography,
  };
});

describe('ProcessLciaResultsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDataSource.mockReturnValue('');
    mockGetLangText.mockImplementation((value: any) => {
      if (typeof value === 'string') return value;
      if (typeof value?.['#text'] === 'string') return value['#text'];
      return '';
    });
    mockGetReferenceQuantityFromMethod.mockResolvedValue(undefined);
    mockIsLcaFunctionInvokeError.mockReturnValue(false);
    mockQueryLcaResults.mockResolvedValue({
      snapshot_id: 'snapshot-1',
      result_id: 'result-1',
      source: 'latest_ready',
      meta: { computed_at: '2026-04-28T00:00:00Z' },
      data: { values: [] },
    });
    mockGetPublishedLciaResultPackage.mockResolvedValue({
      data: {
        publication: null,
        package: null,
        rowCount: 0,
        values: [],
      },
      error: null,
    });
    mockUseLocation.mockReturnValue({ pathname: '/mydata/processes', search: '' });
  });

  it('loads published LCIA rows for open-data processes without querying solver', async () => {
    mockGetDataSource.mockReturnValue('tg');
    mockUseLocation.mockReturnValue({ pathname: '/tgdata/processes', search: '' });
    mockGetPublishedLciaResultPackage.mockResolvedValueOnce({
      data: {
        publication: { id: 'publication-1' },
        package: { id: 'package-1', version: 3 },
        rowCount: 1,
        values: [
          {
            impact_id: 'impact-1',
            impact_index: 1,
            impact_name: 'Climate change',
            unit: 'kg CO2 eq',
            value: 12.5,
          },
        ],
      },
      error: null,
    });

    render(
      <ProcessLciaResultsPanel
        baseRows={[]}
        enablePublishedPackageReader={true}
        lang='en'
        processId='process-1'
        processVersion='1.0'
      />,
    );

    await waitFor(() =>
      expect(mockGetPublishedLciaResultPackage).toHaveBeenCalledWith({
        processId: 'process-1',
        processVersion: '1.0',
      }),
    );

    expect(mockQueryLcaResults).not.toHaveBeenCalled();
    await screen.findByText('Climate change');
    expect(screen.queryByText(/source=published_package/)).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('Published result details').closest('[data-testid="tooltip"]'),
    ).toHaveAttribute('data-title', expect.stringContaining('source=published_package'));
    expect(
      screen.getByLabelText('Published result details').closest('[data-testid="tooltip"]'),
    ).toHaveAttribute(
      'data-title',
      expect.stringContaining('publication=publication-1, package=package-1, rows=1'),
    );
    expect(await screen.findByText('Climate change')).toBeInTheDocument();
    expect(screen.getByText('12.5')).toBeInTheDocument();
    expect(screen.getByText('kg CO2 eq')).toBeInTheDocument();
  });

  it('shows an empty published state without falling back to solver when package has no row values', async () => {
    mockGetDataSource.mockReturnValue('tg');
    mockUseLocation.mockReturnValue({ pathname: '/tgdata/processes', search: '' });
    mockGetPublishedLciaResultPackage.mockResolvedValueOnce({
      data: {
        publication: { id: 'publication-1' },
        package: { id: 'package-1' },
        rowCount: 0,
        values: [],
      },
      error: null,
    });

    render(
      <ProcessLciaResultsPanel
        baseRows={[
          {
            key: 'legacy-row',
            meanAmount: 99,
            referenceToLCIAMethodDataSet: {
              '@refObjectId': 'legacy-impact',
              'common:shortDescription': { '#text': 'Legacy LCIA' },
            },
          },
        ]}
        enablePublishedPackageReader={true}
        lang='en'
        processId='process-1'
        processVersion='1.0'
      />,
    );

    await waitFor(() => expect(mockGetPublishedLciaResultPackage).toHaveBeenCalledTimes(1));

    expect(mockQueryLcaResults).not.toHaveBeenCalled();
    expect(
      screen.getByText('No published LCIA result rows are available for this process.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Legacy LCIA')).not.toBeInTheDocument();
  });

  it('normalizes sparse published rows and metadata fallbacks', async () => {
    mockGetDataSource.mockReturnValue('tg');
    mockUseLocation.mockReturnValue({ pathname: '/tgdata/processes', search: '' });
    mockGetPublishedLciaResultPackage.mockResolvedValueOnce({
      data: {
        publication: { publication_id: ' publication-2 ' },
        package: { result_package_id: ' package-2 ' },
        values: [
          {},
          {
            impact_id: 'impact-2',
            impact_index: undefined,
            impact_name: undefined,
            unit: undefined,
            value: undefined,
          },
          {
            impact_id: 'impact-1',
            impact_index: 1,
            impact_name: 'Water use',
            unit: 'm3',
            value: 2,
          },
        ],
      },
      error: null,
    });

    render(
      <ProcessLciaResultsPanel
        baseRows={[]}
        enablePublishedPackageReader={true}
        lang='en'
        processId='process-1'
        processVersion='1.0'
      />,
    );

    await screen.findByText('Water use');
    expect(
      screen.queryByText(/publication=publication-2, package=package-2, rows=2/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('Published result details').closest('[data-testid="tooltip"]'),
    ).toHaveAttribute(
      'data-title',
      expect.stringContaining('publication=publication-2, package=package-2, rows=2'),
    );
    expect(await screen.findByText('Water use')).toBeInTheDocument();
    expect(await screen.findByText('impact-2')).toBeInTheDocument();
    expect(screen.getByText('m3')).toBeInTheDocument();
    expect(screen.getByTestId('pro-row-impact-1')).toHaveTextContent('2');
  });

  it('shows an empty published state when package payload omits row values and metadata', async () => {
    mockGetDataSource.mockReturnValue('tg');
    mockUseLocation.mockReturnValue({ pathname: '/tgdata/processes', search: '' });
    mockGetPublishedLciaResultPackage.mockResolvedValueOnce({
      data: {
        publication: {},
        package: undefined,
      },
      error: null,
    });

    render(
      <ProcessLciaResultsPanel
        baseRows={[]}
        enablePublishedPackageReader={true}
        lang='en'
        processId='process-1'
        processVersion='1.0'
      />,
    );

    await screen.findByText('No published LCIA result rows are available for this process.');
    expect(screen.queryByText(/publication=-, package=-, rows=0/)).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('Published result details').closest('[data-testid="tooltip"]'),
    ).toHaveAttribute('data-title', expect.stringContaining('publication=-, package=-, rows=0'));
    expect(
      screen.getByText('No published LCIA result rows are available for this process.'),
    ).toBeInTheDocument();
    expect(mockQueryLcaResults).not.toHaveBeenCalled();
  });

  it('shows published package errors without falling back to solver', async () => {
    mockGetDataSource.mockReturnValue('tg');
    mockUseLocation.mockReturnValue({ pathname: '/tgdata/processes', search: '' });
    mockGetPublishedLciaResultPackage.mockResolvedValueOnce({
      data: null,
      error: { message: 'not published' },
    });

    render(
      <ProcessLciaResultsPanel
        baseRows={[
          {
            key: 'legacy-row',
            meanAmount: 99,
            referenceToLCIAMethodDataSet: {
              '@refObjectId': 'legacy-impact',
              'common:shortDescription': { '#text': 'Legacy LCIA' },
            },
          },
        ]}
        enablePublishedPackageReader={true}
        lang='en'
        processId='process-1'
        processVersion='1.0'
      />,
    );

    await waitFor(() => expect(mockGetPublishedLciaResultPackage).toHaveBeenCalledTimes(1));

    expect(mockQueryLcaResults).not.toHaveBeenCalled();
    expect(screen.getByText('Published LCIA results are unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('Published result query failed: {message}')).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('Published result error details').closest('[data-testid="tooltip"]'),
    ).toHaveAttribute('data-title', expect.stringContaining('not published'));
    expect(screen.queryByText('Legacy LCIA')).not.toBeInTheDocument();
  });

  it('uses a default published package error when the backend omits a message', async () => {
    mockGetDataSource.mockReturnValue('tg');
    mockUseLocation.mockReturnValue({ pathname: '/tgdata/processes', search: '' });
    mockGetPublishedLciaResultPackage.mockResolvedValueOnce({
      data: null,
      error: {},
    });

    render(
      <ProcessLciaResultsPanel
        baseRows={[]}
        enablePublishedPackageReader={true}
        lang='en'
        processId='process-1'
        processVersion='1.0'
      />,
    );

    await waitFor(() => expect(mockGetPublishedLciaResultPackage).toHaveBeenCalledTimes(1));

    expect(mockQueryLcaResults).not.toHaveBeenCalled();
    expect(screen.getByText('Published LCIA results are unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('Published result query failed: {message}')).not.toBeInTheDocument();
  });

  it('stringifies non-error published query failures', async () => {
    mockGetDataSource.mockReturnValue('tg');
    mockUseLocation.mockReturnValue({ pathname: '/tgdata/processes', search: '' });
    mockGetPublishedLciaResultPackage.mockRejectedValueOnce('offline');

    render(
      <ProcessLciaResultsPanel
        baseRows={[]}
        enablePublishedPackageReader={true}
        lang='en'
        processId='process-1'
        processVersion='1.0'
      />,
    );

    await waitFor(() => expect(mockGetPublishedLciaResultPackage).toHaveBeenCalledTimes(1));

    expect(mockQueryLcaResults).not.toHaveBeenCalled();
    expect(screen.getByText('Published LCIA results are unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('Published result query failed: {message}')).not.toBeInTheDocument();
  });

  it('does not fall back to solver when the public reader is enabled without a process version', async () => {
    mockGetDataSource.mockReturnValue('tg');
    mockUseLocation.mockReturnValue({ pathname: '/tgdata/processes', search: '' });

    render(
      <ProcessLciaResultsPanel
        baseRows={[
          {
            key: 'legacy-row',
            meanAmount: 99,
            referenceToLCIAMethodDataSet: {
              '@refObjectId': 'legacy-impact',
              'common:shortDescription': { '#text': 'Legacy LCIA' },
            },
          },
        ]}
        enablePublishedPackageReader={true}
        lang='en'
        processId='process-1'
      />,
    );

    expect(await screen.findByText('Legacy LCIA')).toBeInTheDocument();
    expect(mockGetPublishedLciaResultPackage).not.toHaveBeenCalled();
    expect(mockQueryLcaResults).not.toHaveBeenCalled();
  });

  it('normalizes missing base rows and queries solver without optional version or scope', async () => {
    mockUseLocation.mockReturnValue({ pathname: undefined, search: '' });

    render(<ProcessLciaResultsPanel baseRows={undefined} lang='en' processId='process-1' />);

    await waitFor(() =>
      expect(mockQueryLcaResults).toHaveBeenCalledWith({
        scope: 'dev-v1',
        mode: 'process_all_impacts',
        process_id: 'process-1',
        allow_fallback: false,
      }),
    );

    expect(mockGetDataSource).toHaveBeenCalledWith('');
    expect(screen.getByTestId('pro-table')).toBeInTheDocument();
  });

  it('waits and retries when all-unit LCIA calculation is queued', async () => {
    jest.useFakeTimers();
    const queuedError = {
      code: 'all_unit_result_queued',
      body: {
        snapshot_id: 'snapshot-pending',
        solve_job_id: 'lca-job-1',
        solve_worker_job_id: 'worker-job-1',
      },
    };
    mockIsLcaFunctionInvokeError.mockImplementation(
      (error: any) => error?.code === 'all_unit_result_queued',
    );
    mockQueryLcaResults.mockRejectedValueOnce(queuedError).mockResolvedValueOnce({
      snapshot_id: 'snapshot-ready',
      result_id: 'result-ready',
      source: 'all_unit',
      meta: { computed_at: '2026-04-29T00:00:00Z' },
      data: { values: [] },
    });

    render(<ProcessLciaResultsPanel baseRows={[]} lang='en' processId='process-1' />);

    await waitFor(() =>
      expect(
        screen.getByText(
          'LCIA results are being calculated (job {jobId}). Retrying automatically...',
        ),
      ).toBeInTheDocument(),
    );

    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    await waitFor(() => expect(mockQueryLcaResults).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.getByLabelText('Calculated result details').closest('[data-testid="tooltip"]'),
      ).toHaveAttribute(
        'data-title',
        expect.stringContaining('source=all_unit, snapshot=snapshot-ready, result=result-ready'),
      ),
    );
    jest.useRealTimers();
  });

  it('shows a friendly error when queued all-unit LCIA response lacks identifiers', async () => {
    jest.useFakeTimers();
    const queuedError = {
      code: 'all_unit_result_queued',
      body: {},
    };
    mockIsLcaFunctionInvokeError.mockImplementation(
      (error: any) => error?.code === 'all_unit_result_queued',
    );
    mockQueryLcaResults.mockRejectedValueOnce(queuedError);

    render(<ProcessLciaResultsPanel baseRows={[]} lang='en' processId='process-1' />);

    await waitFor(() =>
      expect(screen.getByText('Result query failed: {message}')).toBeInTheDocument(),
    );

    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    expect(mockQueryLcaResults).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('skips state updates when base-row enrichment resolves after unmount', async () => {
    let resolveReferenceQuantity: () => void = () => {};
    mockGetReferenceQuantityFromMethod.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveReferenceQuantity = resolve;
        }),
    );

    const { unmount } = render(
      <ProcessLciaResultsPanel
        baseRows={[
          {
            key: 'base-row',
            meanAmount: 3,
            referenceToLCIAMethodDataSet: { '@refObjectId': 'impact-1' },
          },
        ]}
        enableSolverRefresh={false}
        lang='en'
      />,
    );

    unmount();

    await act(async () => {
      resolveReferenceQuantity();
    });

    expect(mockGetReferenceQuantityFromMethod).toHaveBeenCalledTimes(1);
    expect(mockQueryLcaResults).not.toHaveBeenCalled();
  });
});
