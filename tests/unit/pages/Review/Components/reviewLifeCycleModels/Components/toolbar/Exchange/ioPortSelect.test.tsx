// @ts-nocheck
import IoPortSelect from '@/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/Exchange/ioPortSelect';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor } from '../../../../../../../../helpers/testUtils';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
};

const mockGetProcessDetail = jest.fn();
const mockGetProcessExchange = jest.fn();
const mockGetLangText = jest.fn((value: any) =>
  Array.isArray(value)
    ? value.map((item) => item?.['#text'] ?? '').join(',')
    : (value?.label ?? value ?? '-'),
);
const mockGetUnitData = jest.fn();
const mockGenProcessExchangeTableData = jest.fn(() => 'table-data');
const mockGenProcessFromData = jest.fn();

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: { footer_right: 'footer-right' },
}));

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  default: ({ value }: any) => <span>{value}</span>,
}));

jest.mock('@/components/QuantitativeReferenceIcon', () => ({
  __esModule: true,
  default: ({ value }: any) => <span>{value ? 'quantitative-yes' : 'quantitative-no'}</span>,
}));

jest.mock('@/pages/Processes/Components/Exchange/view', () => ({
  __esModule: true,
  default: ({ id, lang, buttonType }: any) => (
    <span>{`exchange-view:${id}:${lang}:${buttonType}`}</span>
  ),
}));

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessDetail: (...args: any[]) => mockGetProcessDetail(...args),
  getProcessExchange: (...args: any[]) => mockGetProcessExchange(...args),
}));

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessExchangeTableData: (...args: any[]) => mockGenProcessExchangeTableData(...args),
  genProcessFromData: (...args: any[]) => mockGenProcessFromData(...args),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLangText: (...args: any[]) => mockGetLangText(...args),
  getUnitData: (...args: any[]) => mockGetUnitData(...args),
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({ actionRef, request, columns, rowSelection }: any) => {
    const [rows, setRows] = React.useState<any[]>([]);
    const requestRef = React.useRef(request);
    requestRef.current = request;

    const reload = jest.fn(() =>
      Promise.resolve()
        .then(() => requestRef.current({ pageSize: 10, current: 1 }))
        .then((result: any) => {
          setRows(result?.data ?? []);
        }),
    );

    React.useLayoutEffect(() => {
      if (actionRef) {
        actionRef.current = { reload };
      }
    }, [actionRef, reload]);

    return (
      <div>
        <div data-testid='selected-keys'>{JSON.stringify(rowSelection?.selectedRowKeys ?? [])}</div>
        {rows.map((row, rowIndex) => (
          <div key={row.dataSetInternalID ?? rowIndex}>
            {columns.map((column: any, columnIndex: number) => (
              <div key={`${column.dataIndex ?? columnIndex}`}>
                {column.render
                  ? column.render(row[column.dataIndex], row, rowIndex)
                  : row[column.dataIndex]}
              </div>
            ))}
            <button
              type='button'
              onClick={() => rowSelection?.onChange?.([row.selectionKey])}
            >{`select:${row.selectionKey}`}</button>
          </div>
        ))}
      </div>
    );
  };

  return {
    __esModule: true,
    ActionType: {},
    ProColumns: {},
    ProTable,
  };
});

jest.mock('antd', () => {
  const { toText } = require('../../../../../../../../helpers/nodeToText');

  const Button = ({ children, onClick, disabled = false, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );

  const Drawer = ({ open, title, extra, children, onClose, footer, getContainer }: any) =>
    open ? (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>
          <div>{extra}</div>
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
        <div data-testid='drawer-container'>{getContainer?.() ? 'has-container' : 'missing'}</div>
        <div>{children}</div>
        <footer>{footer}</footer>
      </section>
    ) : null;

  const Space = ({ children, className }: any) => <div className={className}>{children}</div>;
  const Tooltip = ({ children }: any) => <>{children}</>;

  return {
    __esModule: true,
    Button,
    Drawer,
    Space,
    Tooltip,
  };
});

describe('ReviewLifeCycleModelIoPortSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProcessDetail.mockResolvedValue({
      data: {
        json: {
          processDataSet: {
            mocked: true,
          },
        },
      },
    });
    mockGenProcessFromData.mockReturnValue({
      exchanges: {
        exchange: [
          {
            exchangeDirection: 'input',
            referenceToFlowDataSet: { '@refObjectId': 'flow-one' },
          },
          {
            exchangeDirection: 'input',
            referenceToFlowDataSet: { '@refObjectId': 'flow-two' },
          },
        ],
      },
    });
    mockGetProcessExchange.mockResolvedValue({
      data: [
        {
          selectionKey: 'INPUT:flow-one',
          dataSetInternalID: 'exchange-1',
          referenceToFlowDataSet: 'Flow 1',
          referenceToFlowDataSetVersion: '1.0.0',
          meanAmount: 10,
          resultingAmount: 12,
          dataDerivationTypeStatus: 'measured',
          refUnitRes: {
            name: [{ '@xml:lang': 'en', '#text': 'Kilogram' }],
            refUnitName: 'kg',
            refUnitGeneralComment: [{ '@xml:lang': 'en', '#text': 'Mass unit' }],
          },
          quantitativeReference: true,
        },
        {
          selectionKey: 'INPUT:flow-two',
          dataSetInternalID: 'exchange-2',
          referenceToFlowDataSet: 'Flow 2',
          referenceToFlowDataSetVersion: '2.0.0',
          meanAmount: 1,
          resultingAmount: 2,
          dataDerivationTypeStatus: 'estimated',
          refUnitRes: {
            name: [{ '@xml:lang': 'en', '#text': 'Piece' }],
            refUnitName: 'pc',
            refUnitGeneralComment: [{ '@xml:lang': 'en', '#text': 'Count unit' }],
          },
          quantitativeReference: false,
        },
      ],
      page: 1,
      success: true,
      total: 2,
    });
    mockGetUnitData.mockImplementation(async (_type: string, data: any[]) => data);
  });

  it('loads ports and submits the selected review exchange data', async () => {
    const onData = jest.fn();
    const onDrawerVisible = jest.fn();

    render(
      <IoPortSelect
        node={
          {
            data: { id: 'process-1', version: '1.0.0' },
            ports: {
              items: [{ id: 'INPUT:flow-one' }, { id: 'INPUT:flow-two' }],
            },
          } as any
        }
        lang='en'
        direction='Input'
        drawerVisible
        onData={onData}
        onDrawerVisible={onDrawerVisible}
      />,
    );

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledWith('process-1', '1.0.0'));
    await waitFor(() =>
      expect(screen.getByTestId('selected-keys')).toHaveTextContent(
        '["INPUT:flow-one","INPUT:flow-two"]',
      ),
    );

    expect(screen.getByTestId('drawer-container')).toHaveTextContent('has-container');
    expect(screen.getByText('exchange-view:exchange-1:en:icon')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'select:INPUT:flow-two' }));
    await waitFor(() =>
      expect(screen.getByTestId('selected-keys')).toHaveTextContent('["INPUT:flow-two"]'),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onData).toHaveBeenCalledWith({
      selectedRowData: [
        {
          exchangeDirection: 'input',
          referenceToFlowDataSet: { '@refObjectId': 'flow-two' },
        },
      ],
    });
    expect(onDrawerVisible).toHaveBeenCalledWith(false);
  });

  it('does not request process data while the drawer is closed', () => {
    render(
      <IoPortSelect
        node={{ data: { id: 'process-1', version: '1.0.0' }, ports: { items: [] } } as any}
        lang='en'
        direction='Input'
        drawerVisible={false}
        onData={jest.fn()}
        onDrawerVisible={jest.fn()}
      />,
    );

    expect(mockGetProcessDetail).not.toHaveBeenCalled();
    expect(mockGetProcessExchange).not.toHaveBeenCalled();
  });

  it('ignores a slower detail response after the review node snapshot changes', async () => {
    const requestA = deferred<any>();
    const requestB = deferred<any>();
    mockGetProcessDetail.mockImplementation((processId: string) =>
      processId === 'process-a' ? requestA.promise : requestB.promise,
    );
    mockGenProcessFromData.mockImplementation((data: any) => ({
      exchanges: {
        exchange: [
          {
            marker: data.marker,
            exchangeDirection: data.marker === 'B' ? 'output' : 'input',
            referenceToFlowDataSet: { '@refObjectId': `flow-${data.marker}` },
          },
        ],
      },
    }));

    const commonProps = {
      lang: 'en',
      drawerVisible: true,
      onData: jest.fn(),
      onDrawerVisible: jest.fn(),
    };
    const { rerender } = render(
      <IoPortSelect
        {...commonProps}
        node={{
          data: { id: 'process-a', version: '1.0.0' },
          ports: { items: [{ id: 'INPUT:flow-A' }] },
        }}
        direction='Input'
      />,
    );

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledWith('process-a', '1.0.0'));

    rerender(
      <IoPortSelect
        {...commonProps}
        node={{
          data: { id: 'process-b', version: '2.0.0' },
          ports: { items: [{ id: 'OUTPUT:flow-B' }] },
        }}
        direction='Output'
      />,
    );

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledWith('process-b', '2.0.0'));

    await act(async () => {
      requestB.resolve({ data: { json: { processDataSet: { marker: 'B' } } } });
      await requestB.promise;
    });
    await waitFor(() => expect(mockGenProcessFromData).toHaveBeenCalledWith({ marker: 'B' }));
    expect(screen.getByTestId('selected-keys')).toHaveTextContent('["OUTPUT:flow-B"]');

    const acceptedDetailCount = mockGenProcessFromData.mock.calls.length;
    await act(async () => {
      requestA.resolve({ data: { json: { processDataSet: { marker: 'A' } } } });
      await requestA.promise;
    });

    expect(mockGenProcessFromData).not.toHaveBeenCalledWith({ marker: 'A' });
    expect(mockGenProcessFromData).toHaveBeenCalledTimes(acceptedDetailCount);
  });

  it('falls back to empty process payloads and missing port ids', async () => {
    const onData = jest.fn();

    mockGetProcessDetail.mockResolvedValue({
      data: {
        json: {},
      },
    });
    mockGenProcessFromData.mockReturnValue({});

    render(
      <IoPortSelect
        node={{ data: {}, ports: { items: [{}] } } as any}
        lang='en'
        direction='Input'
        drawerVisible
        onData={onData}
        onDrawerVisible={jest.fn()}
      />,
    );

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledWith('', ''));
    await waitFor(() => expect(mockGetProcessExchange).toHaveBeenCalled());

    expect(screen.getByTestId('selected-keys')).toHaveTextContent('[[]]');

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onData).toHaveBeenCalledWith({ selectedRowData: [] });
  });

  it('submits fallback exchange keys when direction and flow refs are missing', async () => {
    const onData = jest.fn();

    mockGenProcessFromData.mockReturnValue({
      exchanges: {
        exchange: [{}],
      },
    });
    mockGetProcessExchange.mockResolvedValue({
      data: [
        {
          selectionKey: '-:-',
          dataSetInternalID: 'exchange-fallback',
          referenceToFlowDataSet: 'Fallback flow',
          referenceToFlowDataSetVersion: '0.0.0',
          meanAmount: 0,
          resultingAmount: 0,
          dataDerivationTypeStatus: 'unknown',
          quantitativeReference: false,
        },
      ],
      page: 1,
      success: true,
      total: 1,
    });

    render(
      <IoPortSelect
        node={{ data: { id: 'process-1', version: '1.0.0' }, ports: { items: [] } } as any}
        lang='en'
        direction='Output'
        drawerVisible
        onData={onData}
        onDrawerVisible={jest.fn()}
      />,
    );

    await waitFor(() => expect(mockGetProcessExchange).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'select:-:-' }));
    await waitFor(() => expect(screen.getByTestId('selected-keys')).toHaveTextContent('["-:-"]'));

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onData).toHaveBeenCalledWith({ selectedRowData: [{}] });
  });
});
