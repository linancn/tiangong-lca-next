// @ts-nocheck
import ProcessView, {
  buildMergedLciaRows,
  getLciaMethodMetaMap,
  toReferenceValue,
} from '@/pages/Processes/Components/view';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const getDescriptionItemValue = (label: string) => {
  const labelNode = screen.getByText(label);
  const item = labelNode.closest('[data-testid="description-item"]');
  if (!item) {
    throw new Error(`Description item not found for label: ${label}`);
  }
  return within(item).getByTestId('description-value');
};

const mockGetProcessDetail = jest.fn();
const mockGetProcessExchange = jest.fn();
const mockGetUnitData = jest.fn();
const mockGetFlowStateCode = jest.fn();
const mockGenProcessFromData = jest.fn();
const mockGenProcessExchangeTableData = jest.fn();
const mockProcessExchangeView = jest.fn();
const mockGetLangText = jest.fn();
const mockGetLangJson = jest.fn();
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
const mockUseLocation = jest.fn(() => ({ pathname: '/', search: '' }));

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useLocation: () => mockUseLocation(),
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
  getDataSource: (pathname: string) => {
    if (pathname.includes('/mydata')) return 'my';
    if (pathname.includes('/tgdata')) return 'tg';
    if (pathname.includes('/codata')) return 'co';
    if (pathname.includes('/tedata')) return 'te';
    return '';
  },
  getLangJson: (...args: any[]) => mockGetLangJson(...args),
  getLangText: (...args: any[]) => mockGetLangText(...args),
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

  const MockProTable = ({ request, dataSource = [], columns = [], rowKey }: any) => {
    const [requestRows, setRequestRows] = React.useState<any[]>([]);

    React.useEffect(() => {
      let active = true;
      if (request) {
        void Promise.resolve(request({ current: 1, pageSize: 10 })).then((result: any) => {
          if (active) {
            setRequestRows(Array.isArray(result?.data) ? result.data : []);
          }
        });
      }
      return () => {
        active = false;
      };
    }, [request]);

    const rows = request ? requestRows : dataSource;

    const resolveRowKey = (row: any, index: number) => {
      if (typeof rowKey === 'function') return rowKey(row);
      if (typeof rowKey === 'string') return row?.[rowKey];
      return row.key ?? row.referenceToLCIAMethodDataSet?.['@refObjectId'] ?? index;
    };

    return (
      <div data-testid='pro-table'>
        {rows.map((row: any, index: number) => (
          <div
            key={resolveRowKey(row, index)}
            data-testid={`pro-row-${String(resolveRowKey(row, index))}`}
          >
            {columns.map((column: any, columnIndex: number) => (
              <div key={column.key ?? column.dataIndex ?? columnIndex}>
                {column.render
                  ? column.render(row[column.dataIndex], row, index)
                  : toText(row[column.dataIndex])}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return {
    __esModule: true,
    ProTable: MockProTable,
  };
});

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
  ProductOutlined: () => <span>product-icon</span>,
  ProfileOutlined: () => <span>profile-icon</span>,
  CheckCircleOutlined: () => <span>check-circle-icon</span>,
  CloseCircleOutlined: () => <span>close-circle-icon</span>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, icon, onClick, disabled }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, title, extra, children, getContainer, onClose }: any) => {
    if (!open) return null;
    getContainer?.();
    return (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>{extra}</header>
        <div>{children}</div>
        <button type='button' onClick={onClose}>
          drawer-close
        </button>
      </section>
    );
  };

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
  Descriptions.Item = ({ label, children }: any) => (
    <div data-testid='description-item'>
      <div>{toText(label)}</div>
      <div data-testid='description-value'>{children}</div>
    </div>
  );
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
    Text: ({ children }: any) => <span data-testid='typography-text'>{children}</span>,
    Link: ({ children, onClick }: any) => (
      <button type='button' data-testid='typography-link' onClick={onClick}>
        {children}
      </button>
    ),
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
    theme: {
      defaultAlgorithm: {},
      darkAlgorithm: {},
      useToken: () => ({
        token: {
          colorTextDescription: '#8c8c8c',
          colorTextSecondary: '#8c8c8c',
        },
      }),
    },
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
    jest.resetAllMocks();
    jest.useRealTimers();
    mockGetLangText.mockImplementation((value: any) => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value[0]?.['#text'] ?? '';
      if (value?.['#text']) return value['#text'];
      return '';
    });
    mockGetLangJson.mockImplementation((value: any) => value);
    mockJsonToList.mockImplementation((value: any) =>
      Array.isArray(value) ? value : value ? [value] : [],
    );
    mockIsLcaFunctionInvokeError.mockImplementation(() => false);
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
    mockUseLocation.mockReturnValue({ pathname: '/', search: '' });
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

  it('renders secondary text instead of a clickable link when link mode is disabled', () => {
    render(
      <ProcessView {...defaultProps} buttonType='link' disabled triggerLabel='Open process' />,
    );

    expect(screen.getByTestId('typography-text')).toHaveTextContent('Open process');
    expect(screen.queryByTestId('typography-link')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('falls back to the default View label when link mode is disabled and no trigger label is provided', () => {
    render(<ProcessView {...defaultProps} buttonType='link' disabled />);

    expect(screen.getByTestId('typography-text')).toHaveTextContent('View');
    expect(screen.queryByTestId('typography-link')).not.toBeInTheDocument();
  });

  it('renders a clickable Typography.Link trigger when link mode is enabled', async () => {
    render(<ProcessView {...defaultProps} buttonType='link' triggerLabel='Open process' />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('typography-link'));
    });

    expect(screen.getByRole('dialog', { name: 'View process' })).toBeInTheDocument();
  });

  it('falls back to the default View label for clickable link mode when no trigger label is provided', async () => {
    render(<ProcessView {...defaultProps} buttonType='link' />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('typography-link'));
    });

    expect(screen.getByTestId('typography-link')).toHaveTextContent('View');
    expect(screen.getByRole('dialog', { name: 'View process' })).toBeInTheDocument();
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
      screen.getByText(/source=all_unit, snapshot=snapshot-1, result=result-1/),
    ).toBeInTheDocument();
  });

  it('uses open_data scope for solver results on the tgdata route', async () => {
    mockUseLocation.mockReturnValue({ pathname: '/tgdata/processes', search: '' });

    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'LCIA Results' }));

    await waitFor(() =>
      expect(mockQueryLcaResults).toHaveBeenCalledWith({
        scope: 'dev-v1',
        data_scope: 'open_data',
        mode: 'process_all_impacts',
        process_id: 'process-1',
        process_version: '1.0.0',
        allow_fallback: false,
      }),
    );
  });

  it('opens with the result-icon trigger and renders fallback labels for unsupported option codes', async () => {
    mockGenProcessFromData.mockReturnValueOnce({
      processInformation: {
        dataSetInformation: { baseName: { '#text': 'Process with fallback labels' } },
        mathematicalRelations: {
          variableParameter: {
            uncertaintyDistributionType: 'unsupported-value',
          },
        },
      },
      modellingAndValidation: {
        LCIMethodAndAllocation: {
          typeOfDataSet: 'unsupported-value',
          LCIMethodPrinciple: 'unsupported-value',
          LCIMethodApproaches: 'unsupported-value',
        },
        completeness: {
          completenessProductModel: 'unsupported-value',
          completenessElementaryFlows: {
            '@type': 'unsupported-value',
            '@value': 'unsupported-value',
          },
        },
      },
      administrativeInformation: {
        publicationAndOwnership: {
          'common:copyright': 'unsupported-value',
          'common:licenseType': 'unsupported-value',
        },
      },
    });

    render(<ProcessView {...defaultProps} buttonType='toolResultIcon' />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View process' })).toBeInTheDocument();
      expect(screen.getByTestId('spin')).toHaveAttribute('data-spinning', 'false');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Modelling and validation' }));
    expect(getDescriptionItemValue('Type of data set')).toHaveTextContent('-');
    expect(getDescriptionItemValue('LCI method principle')).toHaveTextContent('-');
    expect(getDescriptionItemValue('LCI method approaches')).toHaveTextContent('-');
    expect(getDescriptionItemValue('Completeness product model')).toHaveTextContent('-');
    expect(getDescriptionItemValue('completeness type')).toHaveTextContent('-');
    expect(getDescriptionItemValue('value')).toHaveTextContent('-');

    fireEvent.click(screen.getByRole('button', { name: 'Process information' }));
    expect(getDescriptionItemValue('Uncertainty distribution type')).toHaveTextContent('-');

    fireEvent.click(screen.getByRole('button', { name: 'Administrative information' }));
    expect(getDescriptionItemValue('Copyright?')).toHaveTextContent('-');
    expect(getDescriptionItemValue('License type')).toHaveTextContent('-');
  });

  it('renders supported option labels when known process codes are provided', async () => {
    mockGenProcessFromData.mockReturnValueOnce({
      processInformation: {
        dataSetInformation: { baseName: { '#text': 'Process with supported labels' } },
        mathematicalRelations: {
          variableParameter: {
            uncertaintyDistributionType: 'uniform',
          },
        },
      },
      modellingAndValidation: {
        LCIMethodAndAllocation: {
          typeOfDataSet: 'LCI result',
          LCIMethodPrinciple: 'Attributional',
          LCIMethodApproaches: 'Allocation - mass',
        },
        completeness: {
          completenessProductModel: 'Relevant flows missing',
          completenessElementaryFlows: {
            '@type': 'Noise',
            '@value': 'No statement',
          },
        },
      },
      administrativeInformation: {
        publicationAndOwnership: {
          'common:copyright': 'true',
          'common:licenseType': 'Free of charge for all users and uses',
        },
      },
    });

    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View process' })).toBeInTheDocument();
      expect(screen.getByTestId('spin')).toHaveAttribute('data-spinning', 'false');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Modelling and validation' }));
    expect(getDescriptionItemValue('Type of data set')).toHaveTextContent('LCI result');
    expect(getDescriptionItemValue('LCI method principle')).toHaveTextContent('Attributional');
    expect(getDescriptionItemValue('LCI method approaches')).toHaveTextContent('Allocation - mass');
    expect(getDescriptionItemValue('Completeness product model')).toHaveTextContent(
      'Relevant flows missing',
    );
    expect(getDescriptionItemValue('completeness type')).toHaveTextContent('Noise');
    expect(getDescriptionItemValue('value')).toHaveTextContent('No statement');

    fireEvent.click(screen.getByRole('button', { name: 'Process information' }));
    expect(getDescriptionItemValue('Uncertainty distribution type')).toHaveTextContent('uniform');

    fireEvent.click(screen.getByRole('button', { name: 'Administrative information' }));
    expect(getDescriptionItemValue('Copyright?')).toHaveTextContent('Yes');
    expect(getDescriptionItemValue('License type')).toHaveTextContent(
      'Free of charge for all users and uses',
    );
  });

  it('refreshes solver LCIA results on demand even after initial load completed', async () => {
    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'LCIA Results' }));

    await waitFor(() => expect(mockQueryLcaResults).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Refresh latest calculated results' }));

    await waitFor(() => expect(mockQueryLcaResults).toHaveBeenCalledTimes(2));
  });

  it('normalizes sparse solver rows and string failures for the LCIA tab', async () => {
    mockGenProcessFromData.mockReturnValueOnce({
      ...processDataSet,
      LCIAResults: { LCIAResult: [] },
    });
    mockGetDecompressedMethod.mockResolvedValueOnce({
      files: [
        {
          id: '',
          version: 'ignored',
          referenceQuantity: { 'common:shortDescription': { '#text': 'ignored' } },
        },
        {
          id: 'other-impact',
          version: 'ignored',
          referenceQuantity: { 'common:shortDescription': { '#text': 'ignored' } },
        },
      ],
    });
    mockQueryLcaResults
      .mockResolvedValueOnce({
        snapshot_id: 'snapshot-sparse',
        result_id: 'result-sparse',
        source: 'latest_ready',
        meta: { computed_at: '2026-03-10T00:00:00Z' },
        data: {
          values: [{ impact_id: 'impact-sparse' }, {}],
        },
      })
      .mockRejectedValueOnce('solver string failure');

    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'LCIA Results' }));

    await waitFor(() => expect(screen.getByTestId('pro-row-impact-sparse')).toBeInTheDocument());
    expect(
      within(screen.getByTestId('pro-row-impact-sparse')).getByText('impact-sparse'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('pro-row-impact-sparse')).getByTestId('aligned-number'),
    ).toHaveTextContent('0');
    expect(within(screen.getByTestId('pro-row-impact-sparse')).getByText('-')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh latest calculated results' }));
    await waitFor(() =>
      expect(screen.getByText('Result query failed: {message}')).toBeInTheDocument(),
    );
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
    await waitFor(() => expect(mockGetUnitData.mock.calls.length).toBeGreaterThanOrEqual(2));
    await waitFor(() =>
      expect(mockGetFlowStateCode).toHaveBeenCalledWith([{ id: 'flow-1', version: '1.0' }], 'en'),
    );
  });

  it('handles array-based exchange references, missing flow metadata, and unit lookup fallbacks', async () => {
    mockGenProcessFromData.mockReturnValueOnce({
      ...processDataSet,
      exchanges: {
        exchange: [
          {
            '@dataSetInternalID': '0',
            referenceToFlowDataSet: [{}],
          },
        ],
      },
    });
    mockGetProcessExchange.mockResolvedValue({
      data: [
        {
          id: 'exchange-empty',
          referenceToFlowDataSetId: '',
          referenceToFlowDataSetVersion: '',
        },
      ],
      success: true,
      total: 1,
    });
    mockGetUnitData.mockResolvedValueOnce(undefined).mockResolvedValueOnce([
      {
        id: 'exchange-empty',
        referenceToFlowDataSetId: '',
        referenceToFlowDataSetVersion: '',
      },
    ]);
    mockGetFlowStateCode.mockResolvedValueOnce({ error: 'boom', data: [] }).mockResolvedValueOnce({
      error: null,
      data: [
        {
          id: '',
          version: '',
          stateCode: 100,
          classification: undefined,
        },
      ],
    });

    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'Exchanges' }));

    await waitFor(() => expect(mockGetProcessExchange.mock.calls.length).toBeGreaterThanOrEqual(2));
    await waitFor(() =>
      expect(
        mockGetFlowStateCode.mock.calls.filter(
          (call) =>
            JSON.stringify(call[0]) === JSON.stringify([{ id: '', version: '' }]) &&
            call[1] === 'en',
        ).length,
      ).toBeGreaterThanOrEqual(2),
    );
  });

  it('falls back to an empty output unit list when the output unit lookup returns nothing', async () => {
    mockGenProcessFromData.mockReturnValueOnce({
      ...processDataSet,
      exchanges: {
        exchange: [
          {
            '@dataSetInternalID': '0',
            referenceToFlowDataSet: [{}],
          },
        ],
      },
    });
    mockGetProcessExchange.mockResolvedValue({
      data: [
        {
          id: 'exchange-empty',
          referenceToFlowDataSetId: '',
          referenceToFlowDataSetVersion: '',
        },
      ],
      success: true,
      total: 1,
    });
    mockGetUnitData
      .mockResolvedValueOnce([
        {
          id: 'exchange-empty',
          referenceToFlowDataSetId: '',
          referenceToFlowDataSetVersion: '',
        },
      ])
      .mockResolvedValueOnce(undefined);
    mockGetFlowStateCode.mockResolvedValue({
      error: null,
      data: [
        {
          id: '',
          version: '',
          stateCode: 100,
          classification: undefined,
        },
      ],
    });

    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'Exchanges' }));

    await waitFor(() => expect(mockGetProcessExchange.mock.calls.length).toBeGreaterThanOrEqual(2));
    await waitFor(() =>
      expect(
        mockGetUnitData.mock.calls.filter((call) => call[0] === 'flow' && Array.isArray(call[1]))
          .length,
      ).toBeGreaterThanOrEqual(2),
    );
  });

  it('falls back to empty process payloads without crashing', async () => {
    mockGetProcessDetail.mockResolvedValueOnce({ data: { json: {} } });
    mockGenProcessFromData.mockReturnValueOnce({});

    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View process' })).toBeInTheDocument();
      expect(screen.getByTestId('spin')).toHaveAttribute('data-spinning', 'false');
    });

    fireEvent.click(screen.getByRole('button', { name: 'LCIA Results' }));
    await waitFor(() => expect(screen.getByTestId('pro-table')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Exchanges' }));
    await waitFor(() => expect(mockGetProcessExchange.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('falls back to solver metadata-free LCIA rows when the method list cache cannot be refreshed', async () => {
    mockGenProcessFromData.mockReturnValueOnce({
      ...processDataSet,
      LCIAResults: { LCIAResult: [] },
    });
    mockGetDecompressedMethod.mockResolvedValueOnce(null);
    mockCacheAndDecompressMethod.mockResolvedValueOnce(false);
    mockQueryLcaResults.mockResolvedValueOnce({
      snapshot_id: 'snapshot-fallback',
      result_id: 'result-fallback',
      source: 'latest_ready',
      meta: { computed_at: '2026-03-10T00:00:00Z' },
      data: {
        values: [
          {
            impact_id: 'impact-1',
            impact_index: '2',
            impact_name: ' Impact Name ',
            unit: 'kg',
            value: '12.5',
          },
        ],
      },
    });

    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'LCIA Results' }));

    await waitFor(() => expect(screen.getByTestId('pro-row-impact-1')).toBeInTheDocument());
    expect(
      within(screen.getByTestId('pro-row-impact-1')).getByText('Impact Name'),
    ).toBeInTheDocument();
    expect(within(screen.getByTestId('pro-row-impact-1')).getByText('kg')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('pro-row-impact-1')).getByTestId('aligned-number'),
    ).toHaveTextContent('12.5');
  });

  it('sorts fallback solver LCIA rows by impact index before rendering', async () => {
    mockGenProcessFromData.mockReturnValueOnce({
      ...processDataSet,
      LCIAResults: { LCIAResult: [] },
    });
    mockGetDecompressedMethod.mockResolvedValueOnce(null);
    mockCacheAndDecompressMethod.mockResolvedValueOnce(false);
    mockQueryLcaResults.mockResolvedValueOnce({
      snapshot_id: 'snapshot-sorted',
      result_id: 'result-sorted',
      source: 'latest_ready',
      meta: { computed_at: '2026-03-10T00:00:00Z' },
      data: {
        values: [
          {
            impact_id: 'impact-2',
            impact_index: 2,
            impact_name: 'Second',
            unit: 'kg',
            value: 22,
          },
          {
            impact_id: 'impact-1',
            impact_index: 1,
            impact_name: 'First',
            unit: 'kg',
            value: 11,
          },
        ],
      },
    });

    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'LCIA Results' }));

    await waitFor(() => expect(screen.getByTestId('pro-row-impact-1')).toBeInTheDocument());
    expect(
      screen.getAllByTestId(/^pro-row-/).map((node) => node.getAttribute('data-testid')),
    ).toEqual(['pro-row-impact-1', 'pro-row-impact-2']);
  });

  it('refreshes the method cache and merges solver rows into existing LCIA rows', async () => {
    mockGenProcessFromData.mockReturnValueOnce({
      ...processDataSet,
      LCIAResults: {
        LCIAResult: [
          {
            key: 'base-key',
            meanAmount: 1,
            referenceToLCIAMethodDataSet: {
              '@refObjectId': 'impact-1',
              '@version': '',
            },
          },
        ],
      },
    });
    mockGetDecompressedMethod
      .mockResolvedValueOnce({
        files: [{ id: 'impact-1', version: 'old-version' }],
      })
      .mockResolvedValueOnce({
        files: [
          {
            id: 'impact-1',
            version: '2.0.0',
            description: { '#text': 'Method description' },
            referenceQuantity: {
              'common:shortDescription': { '#text': 'kg CO2 eq' },
            },
          },
          {
            id: '',
            version: 'ignored',
          },
          {
            id: 'impact-2',
            version: 'other',
          },
        ],
      });
    mockCacheAndDecompressMethod.mockResolvedValueOnce(true);
    mockQueryLcaResults.mockResolvedValue({
      snapshot_id: 'snapshot-merge',
      result_id: 'result-merge',
      source: 'latest_ready',
      meta: { computed_at: '2026-03-11T00:00:00Z' },
      data: {
        values: [
          {
            impact_id: 'impact-1',
            impact_index: 1,
            impact_name: '',
            unit: 'unknown',
            value: 42,
          },
          {
            impact_id: '',
            impact_index: 2,
            impact_name: 'Ignored',
            unit: 'kg',
            value: 3,
          },
        ],
      },
    });

    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByTestId('spin')).toHaveAttribute('data-spinning', 'false');
    });

    fireEvent.click(screen.getByRole('button', { name: 'LCIA Results' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh latest calculated results' }));

    await waitFor(() =>
      expect(
        screen.getByText(/source=latest_ready, snapshot=snapshot-merge, result=result-merge/),
      ).toBeInTheDocument(),
    );
    expect(mockCacheAndDecompressMethod).toHaveBeenCalledWith('list.json');
    expect(
      within(screen.getByTestId('pro-row-impact-1')).getByText('Method description'),
    ).toBeInTheDocument();
    expect(within(screen.getByTestId('pro-row-impact-1')).getByText('2.0.0')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('pro-row-impact-1')).getByText('kg CO2 eq'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('pro-row-impact-1')).getByTestId('aligned-number'),
    ).toHaveTextContent('42');
    expect(screen.getAllByTestId(/^pro-row-/)).toHaveLength(1);
  });

  it('keeps base LCIA rows when solver payload values are not an array and uses row.key as the table row key', async () => {
    mockGenProcessFromData.mockReturnValueOnce({
      ...processDataSet,
      LCIAResults: {
        LCIAResult: [
          {
            key: 'base-key',
            meanAmount: 9,
            referenceToLCIAMethodDataSet: {},
          },
        ],
      },
    });
    mockQueryLcaResults.mockResolvedValueOnce({
      snapshot_id: 'snapshot-empty',
      result_id: 'result-empty',
      source: 'latest_ready',
      meta: { computed_at: '2026-03-12T00:00:00Z' },
      data: {
        values: null,
      },
    });

    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByTestId('spin')).toHaveAttribute('data-spinning', 'false');
    });

    fireEvent.click(screen.getByRole('button', { name: 'LCIA Results' }));

    await waitFor(() => expect(screen.getByTestId('pro-row-base-key')).toBeInTheDocument());
    expect(
      within(screen.getByTestId('pro-row-base-key')).getByTestId('aligned-number'),
    ).toHaveTextContent('9');
  });

  it('falls back to a generic solver error when queued snapshot metadata is incomplete', async () => {
    const queuedError = {
      code: 'snapshot_build_queued',
      body: {
        build_job_id: 123,
        build_snapshot_id: null,
      },
    };
    mockIsLcaFunctionInvokeError.mockImplementation(
      (error: any) => error?.code === 'snapshot_build_queued',
    );
    mockQueryLcaResults.mockRejectedValueOnce(queuedError);

    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'LCIA Results' }));

    await waitFor(() =>
      expect(screen.getByText('Result query failed: {message}')).toBeInTheDocument(),
    );
    expect(
      screen.queryByText('Snapshot is rebuilding (job {jobId}). Retrying automatically...'),
    ).not.toBeInTheDocument();
  });

  it('supports the text button variant and closes the drawer through both close actions', async () => {
    render(<ProcessView {...defaultProps} buttonType='text' />);

    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'View process' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'close-icon' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'View process' })).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'View process' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'drawer-close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'View process' })).not.toBeInTheDocument(),
    );
  });

  it('returns a method meta map only for requested method ids', async () => {
    mockGetDecompressedMethod.mockResolvedValueOnce({
      files: [
        {
          version: 'ignored',
          referenceQuantity: { 'common:shortDescription': { '#text': 'ignored' } },
        },
        { id: 'other-impact', version: 'ignored' },
        {
          id: 'impact-1',
          version: '',
          description: { '#text': 'Target description' },
          referenceQuantity: { 'common:shortDescription': { '#text': 'kg eq' } },
        },
      ],
    });

    const result = await getLciaMethodMetaMap(['impact-1']);

    expect(result.size).toBe(1);
    expect(result.get('impact-1')).toEqual({
      description: { '#text': 'Target description' },
      version: '',
      referenceQuantityDesc: { '#text': 'kg eq' },
    });
  });

  it('returns an empty method meta map when the decompressed list uses a non-array files payload', async () => {
    mockGetDecompressedMethod.mockResolvedValueOnce({
      files: {
        0: {
          referenceQuantity: { 'common:shortDescription': { '#text': 'kg eq' } },
        },
        id: 'impact-1',
      },
    });

    const result = await getLciaMethodMetaMap(['impact-1']);

    expect(result.size).toBe(0);
  });

  it('returns an empty method meta map when the method list is unavailable after refresh', async () => {
    mockGetDecompressedMethod.mockResolvedValueOnce(null);
    mockCacheAndDecompressMethod.mockResolvedValueOnce(false);

    const result = await getLciaMethodMetaMap(['impact-1']);

    expect(result.size).toBe(0);
    expect(mockCacheAndDecompressMethod).toHaveBeenCalledWith('list.json');
  });

  it('refreshes cached method metadata when the initial list is missing reference quantities', async () => {
    mockGetDecompressedMethod
      .mockResolvedValueOnce({
        files: [{ id: 'impact-1', version: 'stale-version' }],
      })
      .mockResolvedValueOnce({
        files: [
          {
            id: 'impact-1',
            version: '2.0.0',
            description: { '#text': 'Fresh description' },
            referenceQuantity: { 'common:shortDescription': { '#text': 'fresh unit' } },
          },
        ],
      });
    mockCacheAndDecompressMethod.mockResolvedValueOnce(true);

    const result = await getLciaMethodMetaMap(['impact-1']);

    expect(mockCacheAndDecompressMethod).toHaveBeenCalledWith('list.json');
    expect(result.get('impact-1')).toEqual({
      description: { '#text': 'Fresh description' },
      version: '2.0.0',
      referenceQuantityDesc: { '#text': 'fresh unit' },
    });
  });

  it('merges solver rows using impact-id and hyphen fallbacks for missing method metadata', () => {
    const mergedWithImpactId = buildMergedLciaRows(
      [
        {
          key: 'base-key',
          meanAmount: 1,
          referenceToLCIAMethodDataSet: {
            '@refObjectId': 'impact-1',
            '@version': '',
          },
        },
      ],
      [
        {
          impact_id: 'impact-1',
          impact_index: 1,
          impact_name: '   ',
          unit: 'unknown',
          value: 9,
        },
      ],
      new Map([
        [
          'impact-1',
          {
            description: undefined,
            version: '',
            referenceQuantityDesc: undefined,
          },
        ],
      ]),
    );

    expect(mergedWithImpactId[0].referenceToLCIAMethodDataSet['common:shortDescription']).toEqual({
      '@xml:lang': 'en',
      '#text': 'impact-1',
    });
    expect(mergedWithImpactId[0].referenceToLCIAMethodDataSet['@version']).toBe('');

    const mergedWithHyphen = buildMergedLciaRows(
      [],
      [
        {
          impact_id: '',
          impact_index: 1,
          impact_name: '   ',
          unit: 'unknown',
          value: 2,
        },
      ],
      new Map(),
    );

    expect(mergedWithHyphen[0].referenceToLCIAMethodDataSet['common:shortDescription']).toEqual({
      '@xml:lang': 'en',
      '#text': '-',
    });
    expect(mergedWithHyphen[0].referenceToLCIAMethodDataSet['@version']).toBe('');
  });

  it('returns the first reference entry when a flow reference array is provided', () => {
    expect(
      toReferenceValue([
        { '@refObjectId': 'flow-1', '@version': '1.0' },
        { '@refObjectId': 'flow-2', '@version': '2.0' },
      ]),
    ).toEqual({ '@refObjectId': 'flow-1', '@version': '1.0' });
  });
});
