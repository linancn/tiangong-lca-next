// @ts-nocheck
import { ProcessForm } from '@/pages/Processes/Components/form';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const proTableInstances: any[] = [];
const formListInstances: Record<string, any> = {};

const mockProcessExchangeCreate = jest.fn();
const mockProcessExchangeEdit = jest.fn();
const mockProcessExchangeDelete = jest.fn();
const mockProcessExchangeView = jest.fn();
const mockSourceSelectForm = jest.fn();
const mockGetLangText = jest.fn(() => 'text');
const mockJsonToList = jest.fn((value: any) =>
  Array.isArray(value) ? value : value ? [value] : [],
);

let mockRefCheckContextValue: any = { refCheckData: [] };

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CalculatorOutlined: () => <span data-testid='icon-calculator' />,
  CloseOutlined: () => <span data-testid='icon-close' />,
}));

jest.mock('@/contexts/refCheckContext', () => ({
  __esModule: true,
  useRefCheckContext: () => mockRefCheckContextValue,
}));

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  default: ({ value }: any) => <span data-testid='aligned-number'>{value}</span>,
}));

jest.mock('@/components/RequiredMark', () => ({
  __esModule: true,
  default: ({ label }: any) => <span>{toText(label)}</span>,
}));

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getRules: () => [],
}));

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessExchangeTableData: (data: any[]) => data,
}));

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessExchange: jest.fn(() => Promise.resolve({ error: null, data: [] })),
}));

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getFlowStateCodeByIdsAndVersions: jest.fn(() => Promise.resolve({ error: null, data: [] })),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLangText: (...args: any[]) => mockGetLangText(...args),
  getUnitData: jest.fn(() => Promise.resolve([])),
  jsonToList: (...args: any[]) => mockJsonToList(...args),
}));

jest.mock('@/services/lciaMethods/util', () => {
  const mockLCIAResultCalculation = jest.fn(() => Promise.resolve([{ key: '1', meanAmount: 12 }]));
  const mockGetReferenceQuantityFromMethod = jest.fn(() => Promise.resolve());
  return {
    __esModule: true,
    default: mockLCIAResultCalculation,
    LCIAResultCalculation: mockLCIAResultCalculation,
    getReferenceQuantityFromMethod: mockGetReferenceQuantityFromMethod,
  };
});

const { default: mockLCIAResultCalculation } = jest.requireMock('@/services/lciaMethods/util');
const { getReferenceQuantityFromMethod: mockGetReferenceQuantityFromMethod } = jest.requireMock(
  '@/services/lciaMethods/util',
);
const { getProcessExchange: mockGetProcessExchange } = jest.requireMock('@/services/processes/api');
const { getFlowStateCodeByIdsAndVersions: mockGetFlowStateCodeByIdsAndVersions } =
  jest.requireMock('@/services/flows/api');
const { getUnitData: mockGetUnitData } = jest.requireMock('@/services/general/util');

jest.mock('@/components/ToolBarButton', () => ({
  __esModule: true,
  default: ({ tooltip, onClick }: any) => (
    <button type='button' onClick={onClick}>
      {toText(tooltip) || 'button'}
    </button>
  ),
}));

jest.mock('@/pages/Flows/Components/select/form', () => ({
  __esModule: true,
  default: () => <div data-testid='flow-select'>flow-select</div>,
}));

jest.mock('@/pages/Sources/Components/select/form', () => ({
  __esModule: true,
  default: (props: any) => {
    mockSourceSelectForm(props);
    return <div data-testid='source-select'>source-select</div>;
  },
}));

jest.mock('@/pages/Contacts/Components/select/form', () => ({
  __esModule: true,
  default: () => <div data-testid='contact-select'>contact-select</div>,
}));

jest.mock('@/components/LangTextItem/form', () => ({
  __esModule: true,
  default: () => <div data-testid='lang-form'>lang-form</div>,
}));

jest.mock('@/components/LevelTextItem/form', () => ({
  __esModule: true,
  default: () => <div data-testid='level-form'>level-form</div>,
}));

jest.mock('@/components/LocationTextItem/form', () => ({
  __esModule: true,
  default: () => <div data-testid='location-form'>location-form</div>,
}));

jest.mock('@/components/QuantitativeReferenceIcon', () => ({
  __esModule: true,
  default: ({ value }: any) => <span data-testid='quantitative-icon'>{String(value)}</span>,
}));

jest.mock('@/pages/Processes/Components/Exchange/create', () => ({
  __esModule: true,
  default: (props: any) => {
    mockProcessExchangeCreate(props);
    return <div data-testid='exchange-create' />;
  },
}));

jest.mock('@/pages/Processes/Components/Exchange/edit', () => ({
  __esModule: true,
  default: (props: any) => {
    mockProcessExchangeEdit(props);
    return (
      <button type='button' onClick={() => props.setViewDrawerVisible?.(false)}>
        exchange-edit
      </button>
    );
  },
}));

jest.mock('@/pages/Processes/Components/Exchange/delete', () => ({
  __esModule: true,
  default: (props: any) => {
    mockProcessExchangeDelete(props);
    return (
      <button type='button' onClick={() => props.setViewDrawerVisible?.(false)}>
        exchange-delete
      </button>
    );
  },
}));

jest.mock('@/pages/Processes/Components/Exchange/view', () => ({
  __esModule: true,
  default: (props: any) => {
    mockProcessExchangeView(props);
    return <button type='button'>exchange-view</button>;
  },
}));

jest.mock('@/pages/Processes/Components/Compliance/form', () => ({
  __esModule: true,
  default: () => <div data-testid='compliance-form'>compliance-form</div>,
}));

jest.mock('@/pages/Processes/Components/Review/form', () => ({
  __esModule: true,
  default: () => <div data-testid='review-form'>review-form</div>,
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = (props: any) => {
    const { actionRef, dataSource, request, rowKey, toolBarRender, columns = [] } = props;
    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload: jest.fn(),
        };
      }
    }, [actionRef]);
    React.useEffect(() => {
      proTableInstances.push(props);
    }, [props]);

    const sampleRow = {
      dataSetInternalID: 'row-0',
      referenceToFlowDataSetId: 'flow-1',
      referenceToFlowDataSetVersion: '1.0',
      meanAmount: '-',
      resultingAmount: '-',
      dataDerivationTypeStatus: '-',
    };

    const toolbar = toolBarRender ? toolBarRender() : null;
    const renderedRows =
      Array.isArray(dataSource) && dataSource.length > 0 ? dataSource : request ? [sampleRow] : [];

    return (
      <section data-testid='pro-table'>
        {toolbar}
        {renderedRows.map((row: any, rowIndex: number) => {
          const key = rowKey ? rowKey(row) : `row-${rowIndex}`;
          return (
            <div data-testid={`pro-row-${key}`} key={key}>
              {columns.map((column: any, index: number) => {
                if (typeof column?.render !== 'function') return null;
                return (
                  <div key={column?.dataIndex ?? index}>{column.render(null, row, index)}</div>
                );
              })}
            </div>
          );
        })}
      </section>
    );
  };

  return {
    __esModule: true,
    ProTable,
  };
});

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick, disabled }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {toText(children) || 'icon-button'}
    </button>
  );

  const Space = ({ children }: any) => <div>{children}</div>;

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

  const FormComponent = ({ children }: any) => <form>{children}</form>;
  FormComponent.Item = ({ children }: any) => <div>{children}</div>;
  const MockFormList = ({ children, name, initialValue = [], rules = [] }: any) => {
    const initialCount = initialValue.length > 0 ? initialValue.length : 1;
    const [fieldCount, setFieldCount] = React.useState(initialCount);
    const fields = Array.from({ length: fieldCount }, (_, index) => ({ key: index, name: index }));
    const operations = {
      add: jest.fn(() => setFieldCount((count: number) => count + 1)),
      remove: jest.fn(() => setFieldCount((count: number) => Math.max(1, count - 1))),
    };
    formListInstances[JSON.stringify(name ?? [])] = { rules, operations, fieldCount };
    return children(fields, operations);
  };
  FormComponent.List = MockFormList;

  const Input = ({ onChange, value, 'data-testid': dataTestId }: any) => (
    <input
      data-testid={dataTestId}
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );

  const Select = ({ options = [], onChange }: any) => (
    <select onChange={(event) => onChange?.(event.target.value)}>
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  const InputNumber = ({ value, onChange }: any) => (
    <input
      type='number'
      value={value ?? ''}
      onChange={(event) => onChange?.(Number(event.target.value))}
    />
  );

  const Switch = ({ checked, onChange }: any) => (
    <input
      type='checkbox'
      checked={checked}
      onChange={(event) => onChange?.(event.target.checked)}
    />
  );

  const Tooltip = ({ children }: any) => <>{children}</>;
  const Divider = () => <hr />;

  return {
    __esModule: true,
    Button,
    Space,
    Card,
    Collapse,
    Form: FormComponent,
    Input,
    Select,
    InputNumber,
    Switch,
    Tooltip,
    Divider,
    theme: {
      defaultAlgorithm: {},
      darkAlgorithm: {},
      useToken: () => ({ token: {} }),
    },
  };
});

const sampleExchange = {
  '@dataSetInternalID': '0',
  exchangeDirection: 'OUTPUT',
  referenceToFlowDataSet: {
    '@refObjectId': 'flow-1',
    '@version': '1.0',
  },
  refUnitRes: {
    name: 'Unit',
    refUnitName: 'kg',
  },
  meanAmount: 1,
  resultingAmount: 1,
  dataDerivationTypeStatus: 'provided',
};

const defaultProps = {
  lang: 'en',
  activeTabKey: 'processInformation',
  formRef: { current: null },
  onData: jest.fn(),
  onExchangeData: jest.fn(),
  onExchangeDataCreate: jest.fn(),
  onTabChange: jest.fn(),
  onLciaResults: jest.fn(),
  exchangeDataSource: [sampleExchange],
  formType: 'create',
  showRules: false,
  lciaResults: [],
  actionFrom: undefined,
};

describe('ProcessForm component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    proTableInstances.length = 0;
    Object.keys(formListInstances).forEach((key) => delete formListInstances[key]);
    mockRefCheckContextValue = { refCheckData: [] };
    mockSourceSelectForm.mockClear();
    mockGetLangText.mockReset();
    mockGetLangText.mockReturnValue('text');
    mockGetProcessExchange.mockReset();
    mockGetProcessExchange.mockResolvedValue({ error: null, data: [] });
    mockGetUnitData.mockReset();
    mockGetUnitData.mockResolvedValue([]);
    mockGetFlowStateCodeByIdsAndVersions.mockReset();
    mockGetFlowStateCodeByIdsAndVersions.mockResolvedValue({ error: null, data: [] });
    mockLCIAResultCalculation.mockReset();
    mockLCIAResultCalculation.mockResolvedValue([{ key: '1', meanAmount: 12 }]);
    mockGetReferenceQuantityFromMethod.mockReset();
    mockGetReferenceQuantityFromMethod.mockResolvedValue();
  });

  it('marks rows with issues when rules are enabled', async () => {
    mockRefCheckContextValue = {
      refCheckData: [
        {
          id: 'flow-1',
          version: '1.0',
        },
      ],
    };

    render(
      <ProcessForm {...defaultProps} activeTabKey='exchanges' showRules exchangeDataSource={[]} />,
    );

    await waitFor(() => {
      expect(proTableInstances).toHaveLength(2);
    });

    const rowClassName = proTableInstances[0].rowClassName;
    const errorRow = rowClassName({
      referenceToFlowDataSetId: 'flow-1',
      referenceToFlowDataSetVersion: '1.0',
      meanAmount: '-',
      resultingAmount: '-',
      dataDerivationTypeStatus: '-',
    });
    expect(errorRow).toBe('error-row');

    const validRow = rowClassName({
      referenceToFlowDataSetId: 'flow-2',
      referenceToFlowDataSetVersion: '1.0',
      meanAmount: 1,
      resultingAmount: 2,
      dataDerivationTypeStatus: 'ok',
    });
    expect(validRow).toBe('');
  });

  it('does not mark rows when rules are disabled even if the exchange is incomplete', async () => {
    render(<ProcessForm {...defaultProps} activeTabKey='exchanges' showRules={false} />);

    await waitFor(() => {
      expect(proTableInstances).toHaveLength(2);
    });

    const outputRowClassName = proTableInstances[1].rowClassName;
    expect(
      outputRowClassName({
        referenceToFlowDataSetId: 'flow-1',
        referenceToFlowDataSetVersion: '1.0',
        meanAmount: '-',
        resultingAmount: '-',
        dataDerivationTypeStatus: '-',
      }),
    ).toBe('');
  });

  it('disables exchange actions when actionFrom is modelResult', async () => {
    render(
      <ProcessForm
        {...defaultProps}
        activeTabKey='exchanges'
        actionFrom='modelResult'
        exchangeDataSource={[
          {
            '@dataSetInternalID': '0',
            exchangeDirection: 'output',
          },
        ]}
      />,
    );

    await waitFor(() => {
      expect(mockProcessExchangeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          disabled: true,
          direction: 'output',
        }),
      );
      expect(mockProcessExchangeEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          disabled: true,
        }),
      );
      expect(mockProcessExchangeDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          disabled: true,
        }),
      );
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'exchange-edit' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'exchange-delete' })[0]);
  });

  it('notifies parent when tab changes', async () => {
    const propsWithoutShowRules = { ...defaultProps };
    delete propsWithoutShowRules.showRules;

    render(<ProcessForm {...propsWithoutShowRules} />);

    const validationTab = screen.getByRole('button', { name: 'Validation' });
    fireEvent.click(validationTab);

    await waitFor(() => {
      expect(defaultProps.onTabChange).toHaveBeenCalledWith('validation');
    });
  });

  it('calculates LCIA results when toolbar button is clicked', async () => {
    const onLciaResults = jest.fn();
    const exchangeData = [{ id: 'exchange-1' }];

    render(
      <ProcessForm
        {...defaultProps}
        activeTabKey='lciaResults'
        onLciaResults={onLciaResults}
        exchangeDataSource={exchangeData}
      />,
    );

    const calculateButton = screen.getByRole('button', { name: 'Calculate LCIA Results' });
    fireEvent.click(calculateButton);

    await waitFor(() => {
      expect(mockLCIAResultCalculation).toHaveBeenCalledWith(exchangeData);
      expect(onLciaResults).toHaveBeenCalledWith([{ key: '1', meanAmount: 12 }]);
    });
  });

  it('returns an empty LCIA payload when calculation resolves to null', async () => {
    const onLciaResults = jest.fn();
    mockLCIAResultCalculation.mockResolvedValueOnce(null);

    render(
      <ProcessForm
        {...defaultProps}
        activeTabKey='lciaResults'
        onLciaResults={onLciaResults}
        exchangeDataSource={[{ id: 'exchange-2' }]}
      />,
    );

    mockGetReferenceQuantityFromMethod.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Calculate LCIA Results' }));

    await waitFor(() => {
      expect(onLciaResults).toHaveBeenCalledWith([]);
    });
    expect(mockGetReferenceQuantityFromMethod).not.toHaveBeenCalled();
  });

  it('loads input exchanges, resolves units, and injects flow state metadata', async () => {
    mockGetProcessExchange.mockResolvedValueOnce({
      data: [
        {
          referenceToFlowDataSetId: 'flow-1',
          referenceToFlowDataSetVersion: '1.0',
          meanAmount: 1,
          resultingAmount: 1,
          dataDerivationTypeStatus: 'provided',
        },
      ],
      total: 1,
    });
    mockGetUnitData.mockResolvedValueOnce([
      {
        referenceToFlowDataSetId: 'flow-1',
        referenceToFlowDataSetVersion: '1.0',
        meanAmount: 1,
        resultingAmount: 1,
        dataDerivationTypeStatus: 'provided',
      },
    ]);
    mockGetFlowStateCodeByIdsAndVersions.mockResolvedValueOnce({
      error: null,
      data: [
        {
          id: 'flow-1',
          version: '1.0',
          stateCode: 20,
          classification: 'class-a',
        },
      ],
    });

    render(<ProcessForm {...defaultProps} activeTabKey='exchanges' />);

    await waitFor(() => {
      expect(proTableInstances).toHaveLength(2);
    });

    const result = await proTableInstances[0].request({ pageSize: 10, current: 1 });

    expect(mockGetProcessExchange).toHaveBeenCalledWith(
      expect.any(Array),
      'Input',
      expect.objectContaining({ pageSize: 10, current: 1 }),
    );
    expect(mockGetUnitData).toHaveBeenCalledWith(
      'flow',
      expect.arrayContaining([
        expect.objectContaining({
          referenceToFlowDataSetId: 'flow-1',
          referenceToFlowDataSetVersion: '1.0',
        }),
      ]),
    );
    expect(mockGetFlowStateCodeByIdsAndVersions).toHaveBeenCalledWith(
      [{ id: 'flow-1', version: '1.0' }],
      'en',
    );
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        total: 1,
        data: [
          expect.objectContaining({
            referenceToFlowDataSetId: 'flow-1',
            referenceToFlowDataSetVersion: '1.0',
            stateCode: 20,
            classification: 'class-a',
          }),
        ],
      }),
    );
  });

  it('leaves exchange rows unchanged when flow state lookup fails', async () => {
    mockGetProcessExchange.mockResolvedValueOnce({
      data: [
        {
          referenceToFlowDataSetId: 'flow-1',
          referenceToFlowDataSetVersion: '1.0',
          classification: 'legacy-classification',
        },
      ],
      total: 1,
    });
    mockGetUnitData.mockResolvedValueOnce([
      {
        referenceToFlowDataSetId: 'flow-1',
        referenceToFlowDataSetVersion: '1.0',
        classification: 'legacy-classification',
      },
    ]);
    mockGetFlowStateCodeByIdsAndVersions.mockResolvedValueOnce({
      error: new Error('lookup failed'),
      data: [
        {
          id: 'flow-1',
          version: '1.0',
          stateCode: 100,
          classification: 'new-classification',
        },
      ],
    });

    render(<ProcessForm {...defaultProps} activeTabKey='exchanges' />);

    await waitFor(() => {
      expect(proTableInstances).toHaveLength(2);
    });

    const result = await proTableInstances[1].request({ pageSize: 10, current: 1 });

    expect(mockGetProcessExchange).toHaveBeenCalledWith(
      expect.any(Array),
      'Output',
      expect.objectContaining({ pageSize: 10, current: 1 }),
    );
    expect(result.data).toEqual([
      expect.objectContaining({
        referenceToFlowDataSetId: 'flow-1',
        referenceToFlowDataSetVersion: '1.0',
        classification: 'legacy-classification',
      }),
    ]);
    expect(result.data[0].stateCode).toBeUndefined();
  });

  it('handles array and missing flow references for input exchanges, including empty classifications', async () => {
    mockGetProcessExchange.mockResolvedValueOnce({
      data: [
        {
          referenceToFlowDataSetId: 'flow-1',
          referenceToFlowDataSetVersion: '1.0',
          meanAmount: 1,
          resultingAmount: 1,
          dataDerivationTypeStatus: 'provided',
        },
      ],
      total: 1,
    });
    mockGetUnitData.mockResolvedValueOnce([
      {
        referenceToFlowDataSetId: 'flow-1',
        referenceToFlowDataSetVersion: '1.0',
        meanAmount: 1,
        resultingAmount: 1,
        dataDerivationTypeStatus: 'provided',
      },
    ]);
    mockGetFlowStateCodeByIdsAndVersions.mockResolvedValueOnce({
      error: null,
      data: [
        {
          id: 'flow-1',
          version: '1.0',
          stateCode: 30,
        },
      ],
    });

    const exchangeDataSource = [
      {
        ...sampleExchange,
        referenceToFlowDataSet: [
          {
            '@refObjectId': 'flow-1',
            '@version': '1.0',
          },
        ],
      },
    ];

    const firstRender = render(
      <ProcessForm
        {...defaultProps}
        activeTabKey='exchanges'
        exchangeDataSource={exchangeDataSource}
      />,
    );

    await waitFor(() => {
      expect(proTableInstances.length).toBeGreaterThanOrEqual(2);
    });

    const firstTables = proTableInstances.slice(-2);
    const result = await firstTables[0].request({ pageSize: 10, current: 1 });

    expect(mockGetFlowStateCodeByIdsAndVersions).toHaveBeenCalledWith(
      [{ id: 'flow-1', version: '1.0' }],
      'en',
    );
    expect(result.data[0].classification).toBe('');

    firstRender.unmount();
    proTableInstances.length = 0;

    mockGetProcessExchange.mockResolvedValueOnce({ data: [], total: 0 });
    mockGetUnitData.mockResolvedValueOnce(undefined);
    mockGetFlowStateCodeByIdsAndVersions.mockResolvedValueOnce({ error: null, data: [] });

    const { unmount } = render(
      <ProcessForm
        {...defaultProps}
        activeTabKey='exchanges'
        exchangeDataSource={[{ ...sampleExchange, referenceToFlowDataSet: undefined }]}
      />,
    );

    await waitFor(() => {
      expect(proTableInstances.length).toBeGreaterThanOrEqual(2);
    });

    const latestTables = proTableInstances.slice(-2);
    await latestTables[0].request({ pageSize: 10, current: 1 });

    expect(mockGetFlowStateCodeByIdsAndVersions).toHaveBeenLastCalledWith(
      [{ id: '', version: '' }],
      'en',
    );

    unmount();
  });

  it('syncs reference quantities whenever lciaResults prop changes', async () => {
    const initialResults = [
      {
        key: 'lcia-1',
        referenceToLCIAMethodDataSet: {
          '@version': '1.0',
        },
      },
    ];

    const { rerender } = render(
      <ProcessForm {...defaultProps} activeTabKey='lciaResults' lciaResults={initialResults} />,
    );

    await waitFor(() => {
      expect(mockGetReferenceQuantityFromMethod).toHaveBeenCalledWith([
        expect.objectContaining({ key: 'lcia-1' }),
      ]);
    });

    const nextResults = [
      {
        key: 'lcia-2',
        referenceToLCIAMethodDataSet: {
          '@version': '2.0',
        },
      },
    ];

    rerender(
      <ProcessForm {...defaultProps} activeTabKey='lciaResults' lciaResults={nextResults} />,
    );

    await waitFor(() => {
      expect(mockGetReferenceQuantityFromMethod).toHaveBeenCalledWith([
        expect.objectContaining({ key: 'lcia-2' }),
      ]);
    });

    expect(screen.getByTestId('pro-row-lcia-2')).toBeInTheDocument();
  });

  it('falls back to a dash when the LCIA reference quantity label is empty', async () => {
    mockGetLangText.mockImplementation((value: any) =>
      value === 'missing-quantity' ? '' : 'text',
    );

    render(
      <ProcessForm
        {...defaultProps}
        activeTabKey='lciaResults'
        lciaResults={[
          {
            key: 'lcia-empty',
            referenceQuantityDesc: 'missing-quantity',
            referenceToLCIAMethodDataSet: {
              'common:shortDescription': 'available-short-description',
            },
          },
        ]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('pro-row-lcia-empty')).toBeInTheDocument();
    });

    expect(within(screen.getByTestId('pro-row-lcia-empty')).getAllByText('-')).toHaveLength(2);
  });

  it('validates and mutates modelling data-source references through the form list controls', async () => {
    const onData = jest.fn();
    const listKey = JSON.stringify([
      'modellingAndValidation',
      'dataSourcesTreatmentAndRepresentativeness',
      'referenceToDataSource',
    ]);

    const { rerender } = render(
      <ProcessForm
        {...defaultProps}
        activeTabKey='modellingAndValidation'
        showRules
        onData={onData}
      />,
    );

    await waitFor(() => {
      expect(formListInstances[listKey]).toBeDefined();
    });

    await expect(formListInstances[listKey].rules[0].validator(null, [])).rejects.toThrow();

    fireEvent.click(
      screen.getByRole('button', {
        name: /add.*data source\(s\) used for this data set.*item/i,
      }),
    );

    await waitFor(() => {
      expect(onData).toHaveBeenCalledTimes(1);
      expect(formListInstances[listKey].fieldCount).toBe(2);
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'icon-button' })[0]);

    await waitFor(() => {
      expect(onData).toHaveBeenCalledTimes(2);
      expect(formListInstances[listKey].fieldCount).toBe(1);
    });

    rerender(
      <ProcessForm
        {...defaultProps}
        activeTabKey='modellingAndValidation'
        showRules={false}
        onData={onData}
      />,
    );

    await waitFor(() => {
      expect(formListInstances[listKey].rules).toEqual([]);
    });
  });

  it('only applies the default source name in create mode', async () => {
    const { rerender } = render(
      <ProcessForm {...defaultProps} activeTabKey='administrativeInformation' formType='create' />,
    );

    await waitFor(() => {
      expect(mockSourceSelectForm).toHaveBeenCalledWith(
        expect.objectContaining({ defaultSourceName: 'ILCD format' }),
      );
    });

    mockSourceSelectForm.mockClear();

    rerender(
      <ProcessForm {...defaultProps} activeTabKey='administrativeInformation' formType='edit' />,
    );

    await waitFor(() => {
      expect(mockSourceSelectForm).toHaveBeenCalledWith(
        expect.objectContaining({ defaultSourceName: '' }),
      );
    });
  });

  it('marks output rows with issues and enriches output exchanges with flow state metadata', async () => {
    mockRefCheckContextValue = {
      refCheckData: [{ id: 'flow-1', version: '1.0' }],
    };
    mockGetProcessExchange.mockResolvedValueOnce({
      data: [
        {
          referenceToFlowDataSetId: 'flow-1',
          referenceToFlowDataSetVersion: '1.0',
          meanAmount: 1,
          resultingAmount: 1,
          dataDerivationTypeStatus: 'provided',
        },
      ],
      total: 1,
    });
    mockGetUnitData.mockResolvedValueOnce([
      {
        referenceToFlowDataSetId: 'flow-1',
        referenceToFlowDataSetVersion: '1.0',
        meanAmount: 1,
        resultingAmount: 1,
        dataDerivationTypeStatus: 'provided',
      },
    ]);
    mockGetFlowStateCodeByIdsAndVersions.mockResolvedValueOnce({
      error: null,
      data: [
        {
          id: 'flow-1',
          version: '1.0',
          stateCode: 20,
        },
      ],
    });

    render(<ProcessForm {...defaultProps} activeTabKey='exchanges' showRules />);

    await waitFor(() => {
      expect(proTableInstances).toHaveLength(2);
    });

    const outputRowClassName = proTableInstances[1].rowClassName;
    expect(
      outputRowClassName({
        referenceToFlowDataSetId: 'flow-1',
        referenceToFlowDataSetVersion: '1.0',
        meanAmount: '-',
        resultingAmount: '-',
        dataDerivationTypeStatus: '-',
      }),
    ).toBe('error-row');
    expect(
      outputRowClassName({
        referenceToFlowDataSetId: 'flow-2',
        referenceToFlowDataSetVersion: '1.0',
        meanAmount: 1,
        resultingAmount: '-',
        dataDerivationTypeStatus: 'provided',
      }),
    ).toBe('error-row');
    expect(
      outputRowClassName({
        referenceToFlowDataSetId: 'flow-2',
        referenceToFlowDataSetVersion: '1.0',
        meanAmount: 1,
        resultingAmount: 1,
        dataDerivationTypeStatus: '-',
      }),
    ).toBe('error-row');

    const result = await proTableInstances[1].request({ pageSize: 10, current: 1 });

    expect(mockGetProcessExchange).toHaveBeenCalledWith(
      expect.any(Array),
      'Output',
      expect.objectContaining({ pageSize: 10, current: 1 }),
    );
    expect(mockGetFlowStateCodeByIdsAndVersions).toHaveBeenCalledWith(
      [{ id: 'flow-1', version: '1.0' }],
      'en',
    );
    expect(result.data).toEqual([
      expect.objectContaining({
        referenceToFlowDataSetId: 'flow-1',
        referenceToFlowDataSetVersion: '1.0',
        stateCode: 20,
        classification: '',
      }),
    ]);
  });

  it('falls back to empty output flow ids and unit rows when output references are missing', async () => {
    mockGetProcessExchange.mockResolvedValueOnce({ data: [], total: 0 });
    mockGetUnitData.mockResolvedValueOnce(undefined);
    mockGetFlowStateCodeByIdsAndVersions.mockResolvedValueOnce({ error: null, data: [] });

    render(
      <ProcessForm
        {...defaultProps}
        activeTabKey='exchanges'
        exchangeDataSource={[{ ...sampleExchange, referenceToFlowDataSet: undefined }]}
      />,
    );

    await waitFor(() => {
      expect(proTableInstances).toHaveLength(2);
    });

    const result = await proTableInstances[1].request({ pageSize: 10, current: 1 });

    expect(mockGetFlowStateCodeByIdsAndVersions).toHaveBeenCalledWith(
      [{ id: '', version: '' }],
      'en',
    );
    expect(result.data).toEqual([]);
  });
});
