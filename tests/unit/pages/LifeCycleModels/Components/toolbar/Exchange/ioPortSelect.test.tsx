// @ts-nocheck
import IoPortSelect, {
  getFolwypeOfDataSetOptions,
} from '@/pages/LifeCycleModels/Components/toolbar/Exchange/ioPortSelect';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../../../../helpers/testUtils';

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

jest.mock('@/pages/Flows/Components/optiondata', () => ({
  __esModule: true,
  flowTypeOptions: [{ value: 'product', label: 'Product Flow' }],
  myFlowTypeOptions: [{ value: 'waste', label: 'Waste Flow' }],
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
  const { toText } = require('../../../../../../helpers/nodeToText');

  const Button = ({ children, onClick, disabled = false, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );

  const Drawer = ({ open, title, extra, children, onClose, footer }: any) =>
    open ? (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>
          <div>{extra}</div>
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
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

describe('LifeCycleModelIoPortSelect', () => {
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
            referenceToFlowDataSet: { '@refObjectId': 'flow-single' },
          },
          {
            exchangeDirection: 'input',
            referenceToFlowDataSet: [{ '@refObjectId': 'flow-array' }],
          },
          {
            exchangeDirection: 'output',
            referenceToFlowDataSet: { '@refObjectId': 'flow-output' },
          },
        ],
      },
    });
    mockGetProcessExchange.mockResolvedValue({
      data: [
        {
          selectionKey: 'INPUT:flow-single',
          dataSetInternalID: 'exchange-1',
          referenceToFlowDataSet: 'Flow 1',
          typeOfDataSet: 'product',
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
          selectionKey: 'INPUT:flow-array',
          dataSetInternalID: 'exchange-2',
          referenceToFlowDataSet: 'Flow 2',
          typeOfDataSet: 'waste',
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

  it('maps flow type labels and falls back for unknown types', () => {
    expect(getFolwypeOfDataSetOptions('product')).toBe('Product Flow');
    expect(getFolwypeOfDataSetOptions('waste')).toBe('Waste Flow');
    expect(getFolwypeOfDataSetOptions('unknown')).toBe('-');
  });

  it('loads ports, normalizes selected keys, and submits the selected exchange data', async () => {
    const onData = jest.fn();
    const onDrawerVisible = jest.fn();

    render(
      <IoPortSelect
        node={
          {
            data: { id: 'process-1', version: '1.0.0' },
            ports: {
              items: [
                { id: 'INPUT:flow-single' },
                { id: 'INPUT:ignored:flow-array' },
                { id: 'OUTPUT:flow-output' },
              ],
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
        '["INPUT:flow-single","INPUT:flow-array"]',
      ),
    );

    expect(screen.getByText('Product Flow')).toBeInTheDocument();
    expect(screen.getByText('Waste Flow')).toBeInTheDocument();
    expect(screen.getByText('exchange-view:exchange-1:en:icon')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'select:INPUT:flow-array' }));
    await waitFor(() =>
      expect(screen.getByTestId('selected-keys')).toHaveTextContent('["INPUT:flow-array"]'),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onData).toHaveBeenCalledWith({
      selectedRowData: [
        {
          exchangeDirection: 'input',
          referenceToFlowDataSet: [{ '@refObjectId': 'flow-array' }],
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
});
