// @ts-nocheck
import ProcessView from '@/pages/Processes/Components/view';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockGetProcessDetail = jest.fn();
const mockGetProcessExchange = jest.fn();
const mockGetUnitData = jest.fn();
const mockGetFlowStateCode = jest.fn();
const mockGenProcessFromData = jest.fn();
const mockGenProcessExchangeTableData = jest.fn();
const mockProcessExchangeView = jest.fn();
const mockQueryLcaResults = jest.fn();
const mockIsLcaFunctionInvokeError = jest.fn(() => false);
const mockCacheAndDecompressMethod = jest.fn();
const mockGetDecompressedMethod = jest.fn();
const mockGetReferenceQuantityFromMethod = jest.fn();
const mockJsonToList = jest.fn((value: any) =>
  Array.isArray(value) ? value : value ? [value] : [],
);
const mockGetRejectedComments = jest.fn();
const mockMergeCommentsToData = jest.fn();

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessDetail: (...args: any[]) => mockGetProcessDetail(...args),
  getProcessExchange: (...args: any[]) => mockGetProcessExchange(...args),
}));

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessFromData: (...args: any[]) => mockGenProcessFromData(...args),
  genProcessExchangeTableData: (...args: any[]) => mockGenProcessExchangeTableData(...args),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLangJson: (value: any) => value,
  getLangText: () => 'text',
  getUnitData: (...args: any[]) => mockGetUnitData(...args),
  jsonToList: (...args: any[]) => mockJsonToList(...args),
}));

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getFlowStateCodeByIdsAndVersions: (...args: any[]) => mockGetFlowStateCode(...args),
}));

jest.mock('@/services/lca', () => ({
  __esModule: true,
  queryLcaResults: (...args: any[]) => mockQueryLcaResults(...args),
  isLcaFunctionInvokeError: (...args: any[]) => mockIsLcaFunctionInvokeError(...args),
}));

jest.mock('@/services/lciaMethods/util', () => ({
  __esModule: true,
  cacheAndDecompressMethod: (...args: any[]) => mockCacheAndDecompressMethod(...args),
  getDecompressedMethod: (...args: any[]) => mockGetDecompressedMethod(...args),
  getReferenceQuantityFromMethod: (...args: any[]) => mockGetReferenceQuantityFromMethod(...args),
}));

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  default: ({ value }: any) => <span data-testid='aligned-number'>{value}</span>,
}));

jest.mock('@/pages/Processes/Components/Exchange/view', () => ({
  __esModule: true,
  default: (props: any) => {
    mockProcessExchangeView(props);
    return <div data-testid='exchange-view' />;
  },
}));

jest.mock('@/pages/Processes/Components/Review/view', () => ({
  __esModule: true,
  default: () => <div data-testid='review-view'>review-view</div>,
}));

jest.mock('@/pages/Processes/Components/Compliance/view', () => ({
  __esModule: true,
  default: () => <div data-testid='compliance-view'>compliance-view</div>,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-description'>{toText(data)}</div>,
}));

jest.mock('@/components/LevelTextItem/description', () => ({
  __esModule: true,
  default: () => <div data-testid='level-description'>level</div>,
}));

jest.mock('@/components/LocationTextItem/description', () => ({
  __esModule: true,
  default: () => <div data-testid='location-description'>location</div>,
}));

jest.mock('@/pages/Contacts/Components/select/description', () => ({
  __esModule: true,
  default: () => <div data-testid='contact-description'>contact</div>,
}));

jest.mock('@/pages/Sources/Components/select/description', () => ({
  __esModule: true,
  default: () => <div data-testid='source-description'>source</div>,
}));

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getClassificationValues: jest.fn(() => []),
}));

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  getRejectedComments: (...args: any[]) => mockGetRejectedComments(...args),
  mergeCommentsToData: (...args: any[]) => mockMergeCommentsToData(...args),
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({ request, dataSource = [], columns = [] }: any) => {
    if (request) {
      void request({ current: 1, pageSize: 10 });
    }

    return (
      <div data-testid='pro-table'>
        {dataSource.map((row: any, index: number) => (
          <div key={row.key ?? row.referenceToLCIAMethodDataSet?.['@refObjectId'] ?? index}>
            {columns.map((column: any, columnIndex: number) => (
              <div key={column.key ?? column.dataIndex ?? columnIndex}>
                {toText(
                  column.render
                    ? column.render(row[column.dataIndex], row, index)
                    : row[column.dataIndex],
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return {
    __esModule: true,
    ProTable,
  };
});

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
  ProductOutlined: () => <span>product-icon</span>,
  ProfileOutlined: () => <span>profile-icon</span>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick, disabled }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, title, extra, children }: any) =>
    open ? (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>{extra}</header>
        <div>{children}</div>
      </section>
    ) : null;

  const Spin = ({ spinning, children }: any) => (
    <div data-testid='spin' data-spinning={String(spinning)}>
      {children}
    </div>
  );

  const Card = ({ tabList = [], activeTabKey, onTabChange, children }: any) => (
    <div data-testid='card' data-active-key={activeTabKey}>
      {tabList.map((item: any) => (
        <button type='button' key={item.key} onClick={() => onTabChange?.(item.key)}>
          {toText(item.tab)}
        </button>
      ))}
      <div>{children}</div>
    </div>
  );

  const Collapse = ({ items = [] }: any) => (
    <div>
      {items.map((item: any) => (
        <div key={item.key}>{item.children}</div>
      ))}
    </div>
  );

  const Space = ({ children }: any) => <div>{children}</div>;
  const Descriptions = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ children }: any) => <div>{children}</div>;
  const Divider = ({ children }: any) => <div>{children}</div>;
  const Typography = {
    Text: ({ children }: any) => <span>{children}</span>,
  };
  return {
    __esModule: true,
    Button,
    Tooltip,
    Drawer,
    Spin,
    Card,
    Collapse,
    Space,
    Descriptions,
    Divider,
    Typography,
    Input: {
      TextArea: ({ children, ...props }: any) => <textarea {...props}>{children}</textarea>,
    },
    theme: { defaultAlgorithm: {}, darkAlgorithm: {} },
  };
});

const defaultProps = {
  id: 'process-1',
  version: '1.0.0',
  lang: 'en',
  buttonType: 'icon',
  disabled: false,
};

const processDataSet = {
  processInformation: {
    dataSetInformation: {
      'common:UUID': 'uuid-123',
    },
  },
  exchanges: {
    exchange: [
      {
        '@dataSetInternalID': '0',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-1',
          '@version': '1.0',
        },
      },
    ],
  },
  LCIAResults: {
    LCIAResult: [{ key: 'lcia-1', meanAmount: 10 }],
  },
};

describe('ProcessView component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockGetProcessDetail.mockResolvedValue({
      data: { json: { processDataSet: processDataSet } },
    });
    mockGenProcessFromData.mockReturnValue(processDataSet);
    mockGenProcessExchangeTableData.mockReturnValue([{ id: 'row-1' }]);
    mockGetProcessExchange.mockResolvedValue({ data: [], success: true });
    mockGetUnitData.mockResolvedValue([]);
    mockGetFlowStateCode.mockResolvedValue({ error: null, data: [] });
    mockGetReferenceQuantityFromMethod.mockResolvedValue(undefined);
    mockGetDecompressedMethod.mockResolvedValue({ files: [] });
    mockCacheAndDecompressMethod.mockResolvedValue(true);
    mockGetRejectedComments.mockResolvedValue([]);
    mockQueryLcaResults.mockResolvedValue({
      snapshot_id: 'snapshot-1',
      result_id: 'result-1',
      source: 'latest_ready',
      meta: { computed_at: '2026-03-09T00:00:00Z' },
      data: { values: [] },
    });
  });

  it('opens drawer and fetches process detail', async () => {
    render(<ProcessView {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('dialog', { name: 'View process' })).toBeInTheDocument();
    await waitFor(() => {
      expect(mockGetProcessDetail).toHaveBeenCalledWith('process-1', '1.0.0');
    });

    await waitFor(() => {
      expect(screen.getByTestId('spin')).toHaveAttribute('data-spinning', 'false');
    });
  });

  it('changes active tab when user selects new tab', async () => {
    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    const lciaTab = screen.getByRole('button', { name: 'LCIA Results' });
    fireEvent.click(lciaTab);

    await waitFor(() => {
      expect(screen.getByTestId('card')).toHaveAttribute('data-active-key', 'lciaResults');
    });
  });

  it('disables the view button when disabled prop is true', () => {
    render(<ProcessView {...defaultProps} buttonType='toolIcon' disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('disables the result icon button when no process id is available', () => {
    render(<ProcessView {...defaultProps} id='' buttonType='toolResultIcon' />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('merges rejected comments into form data for under-review processes', async () => {
    mockGetProcessDetail.mockResolvedValueOnce({
      data: { stateCode: 50, json: { processDataSet } },
    });
    mockGetRejectedComments.mockResolvedValueOnce([{ message: 'Rejected once' }]);

    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(mockGetRejectedComments).toHaveBeenCalledWith('process-1', '1.0.0'));
    expect(mockMergeCommentsToData).toHaveBeenCalledWith(
      [{ message: 'Rejected once' }],
      processDataSet,
    );
  });

  it('shows solver metadata when latest LCIA results load successfully', async () => {
    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    fireEvent.click(screen.getByRole('button', { name: 'LCIA Results' }));

    await waitFor(() =>
      expect(mockQueryLcaResults).toHaveBeenCalledWith({
        scope: 'dev-v1',
        mode: 'process_all_impacts',
        process_id: 'process-1',
        process_version: '1.0.0',
        allow_fallback: false,
      }),
    );
    expect(
      screen.getByText(/source=latest_ready, snapshot=snapshot-1, result=result-1/),
    ).toBeInTheDocument();
  });

  it('refreshes solver LCIA results on demand even after initial load completed', async () => {
    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'LCIA Results' }));

    await waitFor(() => expect(mockQueryLcaResults).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Refresh latest calculated results' }));

    await waitFor(() => expect(mockQueryLcaResults).toHaveBeenCalledTimes(2));
  });

  it('shows a solver error message when latest LCIA query fails', async () => {
    mockQueryLcaResults.mockRejectedValueOnce(new Error('solver failed'));

    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'LCIA Results' }));

    await waitFor(() =>
      expect(screen.getByText('Result query failed: {message}')).toBeInTheDocument(),
    );
  });

  it('retries automatically when LCIA snapshot building is queued', async () => {
    jest.useFakeTimers();
    const queuedError = {
      code: 'snapshot_build_queued',
      body: {
        build_job_id: 'job-1',
        build_snapshot_id: 'snapshot-pending',
      },
    };
    mockIsLcaFunctionInvokeError.mockImplementation(
      (error: any) => error?.code === 'snapshot_build_queued',
    );
    mockQueryLcaResults.mockRejectedValueOnce(queuedError).mockResolvedValueOnce({
      snapshot_id: 'snapshot-ready',
      result_id: 'result-ready',
      source: 'latest_ready',
      meta: { computed_at: '2026-03-12T00:00:00Z' },
      data: { values: [] },
    });

    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'LCIA Results' }));

    await waitFor(() =>
      expect(
        screen.getByText('Snapshot is rebuilding (job {jobId}). Retrying automatically...'),
      ).toBeInTheDocument(),
    );

    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    await waitFor(() => expect(mockQueryLcaResults).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.getByText(/source=latest_ready, snapshot=snapshot-ready, result=result-ready/),
      ).toBeInTheDocument(),
    );
    jest.useRealTimers();
  });

  it('loads both input and output exchange tables with flow state lookups', async () => {
    mockGetProcessExchange.mockResolvedValue({
      data: [
        {
          id: 'exchange-1',
          referenceToFlowDataSetId: 'flow-1',
          referenceToFlowDataSetVersion: '1.0',
        },
      ],
      success: true,
      total: 1,
    });
    mockGetUnitData.mockImplementation(async (_type, data) => data);
    mockGetFlowStateCode.mockResolvedValue({
      error: null,
      data: [
        {
          id: 'flow-1',
          version: '1.0',
          stateCode: 20,
          classification: 'Class A',
        },
      ],
    });

    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'Exchanges' }));

    await waitFor(() => expect(mockGetProcessExchange).toHaveBeenCalledTimes(2));
    expect(mockGetProcessExchange).toHaveBeenNthCalledWith(1, [{ id: 'row-1' }], 'Input', {
      current: 1,
      pageSize: 10,
    });
    expect(mockGetProcessExchange).toHaveBeenNthCalledWith(2, [{ id: 'row-1' }], 'Output', {
      current: 1,
      pageSize: 10,
    });
    expect(mockGetUnitData.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(mockGetFlowStateCode.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(
      mockGetFlowStateCode.mock.calls.some(
        (call) =>
          JSON.stringify(call[0]) === JSON.stringify([{ id: 'flow-1', version: '1.0' }]) &&
          call[1] === 'en',
      ),
    ).toBe(true);
  });
});
