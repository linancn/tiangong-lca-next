// @ts-nocheck
import ProcessView from '@/pages/Processes/Components/view';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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
const mockCacheAndDecompressMethod = jest.fn();
const mockGetDecompressedMethod = jest.fn();
const mockGetReferenceQuantityFromMethod = jest.fn();
const mockJsonToList = jest.fn((value: any) =>
  Array.isArray(value) ? value : value ? [value] : [],
);

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

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({ request }: any) => {
    if (request) {
      void request({ current: 1, pageSize: 10 });
    }

    return <div data-testid='pro-table'>table</div>;
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

  const Card = ({ tabList = [], activeTabKey, onTabChange, title, children }: any) => (
    <div data-testid='card' data-active-key={activeTabKey}>
      {title ? <div>{toText(title)}</div> : null}
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
  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Descriptions = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ children }: any) => <div>{children}</div>;
  const Divider = ({ children }: any) => <div>{children}</div>;
  const Statistic = ({ title, value, formatter }: any) => (
    <div>
      <div>{toText(title)}</div>
      <div>{formatter ? formatter(value) : value}</div>
    </div>
  );
  const Progress = ({ percent = 0, showInfo = true }: any) => (
    <div data-testid='progress'>{showInfo ? `${percent}%` : null}</div>
  );
  const Table = ({ columns = [], dataSource = [], rowKey }: any) => (
    <table data-testid='table'>
      <thead>
        <tr>
          {columns.map((column: any, index: number) => (
            <th key={column.key ?? column.dataIndex ?? index}>{toText(column.title)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(dataSource ?? []).map((row: any, rowIndex: number) => {
          const resolvedRowKey =
            typeof rowKey === 'function'
              ? rowKey(row)
              : typeof rowKey === 'string'
                ? row?.[rowKey]
                : (row?.key ?? rowIndex);

          return (
            <tr key={resolvedRowKey}>
              {columns.map((column: any, columnIndex: number) => {
                const value = column?.dataIndex ? row?.[column.dataIndex] : undefined;
                const content = column?.render ? column.render(value, row, rowIndex) : value;
                return <td key={column.key ?? column.dataIndex ?? columnIndex}>{content}</td>;
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
  const Typography = {
    Text: ({ children }: any) => <span>{children}</span>,
    Paragraph: ({ children }: any) => <p>{children}</p>,
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
    Row,
    Col,
    Descriptions,
    Divider,
    Statistic,
    Progress,
    Table,
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
    mockQueryLcaResults.mockResolvedValue({
      snapshot_id: 'snapshot-1',
      result_id: 'result-1',
      source: 'all_unit',
      meta: { computed_at: '2026-03-09T00:00:00Z' },
      data: {
        values: [
          {
            impact_id: 'impact-1',
            impact_index: 0,
            impact_name: 'Climate change',
            unit: 'kg CO2-eq',
            value: 42,
          },
        ],
      },
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

    await waitFor(() => {
      expect(screen.getByText('LCIA Profile')).toBeInTheDocument();
    });
  });

  it('disables the view button when disabled prop is true', () => {
    render(<ProcessView {...defaultProps} buttonType='toolIcon' disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
