// @ts-nocheck
import IoPortView from '@/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/Exchange/ioPortView';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../../../../../../helpers/testUtils';

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
  const React = require('react');
  const { toText } = require('../../../../../../../../helpers/nodeToText');

  const Button = ({ children, onClick, disabled = false, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );

  const Drawer = ({ open, title, extra, children, onClose }: any) =>
    open ? (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>
          <div>{extra}</div>
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
        <div>{children}</div>
      </section>
    ) : null;

  const Space = ({ children }: any) => <div>{children}</div>;
  const Tooltip = ({ children }: any) => <>{children}</>;

  return {
    __esModule: true,
    Button,
    Drawer,
    Space,
    Tooltip,
  };
});

describe('ReviewLifeCycleModelIoPortView', () => {
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
        exchange: [{ '@dataSetInternalID': 'exchange-raw-1' }],
      },
    });
    mockGetProcessExchange.mockResolvedValue({
      data: [
        {
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
          functionalUnitOrOther: 'functional-unit',
        },
      ],
      page: 1,
      success: true,
      total: 1,
    });
    mockGetUnitData.mockImplementation(async (_type: string, data: any[]) => data);
  });

  it('loads process exchanges and renders review lifecycle port rows when the drawer is opened', async () => {
    const onDrawerVisible = jest.fn();

    render(
      <IoPortView
        node={
          {
            data: { id: 'process-1', version: '1.0.0' },
            ports: { items: [{ id: 'port-1' }, { id: 'port-2' }] },
          } as any
        }
        lang='en'
        direction='Output'
        drawerVisible
        onDrawerVisible={onDrawerVisible}
      />,
    );

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledWith('process-1', '1.0.0'));
    await waitFor(() => expect(mockGetProcessExchange).toHaveBeenCalled());

    expect(mockGenProcessExchangeTableData).toHaveBeenCalled();
    expect(mockGetProcessExchange).toHaveBeenCalledWith('table-data', 'Output', {
      current: 1,
      pageSize: 10,
    });
    expect(mockGetUnitData).toHaveBeenCalledWith(
      'flow',
      expect.arrayContaining([
        expect.objectContaining({
          dataSetInternalID: 'exchange-1',
        }),
      ]),
    );
    expect(screen.getByTestId('selected-keys')).toHaveTextContent('["port-1","port-2"]');
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(
      screen.getAllByText((_, element) => element?.textContent === 'Kilogram (kg)')[0],
    ).toBeInTheDocument();
    expect(screen.getByText('quantitative-yes')).toBeInTheDocument();
    expect(screen.getByText('exchange-view:exchange-1:en:icon')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: /close/i })[0]);
    expect(onDrawerVisible).toHaveBeenCalledWith(false);
  });

  it('does not request process data while the drawer is closed', () => {
    render(
      <IoPortView
        node={{ data: { id: 'process-1', version: '1.0.0' }, ports: { items: [] } } as any}
        lang='en'
        direction='Input'
        drawerVisible={false}
        onDrawerVisible={jest.fn()}
      />,
    );

    expect(mockGetProcessDetail).not.toHaveBeenCalled();
    expect(mockGetProcessExchange).not.toHaveBeenCalled();
  });
});
