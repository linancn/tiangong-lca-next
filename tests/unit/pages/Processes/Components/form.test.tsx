// @ts-nocheck
import { ProcessForm } from '@/pages/Processes/Components/form';
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

const proTableInstances: any[] = [];

const mockProcessExchangeCreate = jest.fn();
const mockProcessExchangeEdit = jest.fn();
const mockProcessExchangeDelete = jest.fn();
const mockProcessExchangeView = jest.fn();

let mockRefCheckContextValue: any = { refCheckData: [] };

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
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

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getFlowStateCodeByIdsAndVersions: jest.fn(() => Promise.resolve({ error: null, data: [] })),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLangText: () => 'text',
  getUnitData: jest.fn(() => Promise.resolve([])),
}));

jest.mock('@/services/lciaMethods/util', () => {
  const mockLCIAResultCalculation = jest.fn(() => Promise.resolve([{ key: '1', meanAmount: 12 }]));
  return {
    __esModule: true,
    default: mockLCIAResultCalculation,
    LCIAResultCalculation: mockLCIAResultCalculation,
  };
});

const { default: mockLCIAResultCalculation } = jest.requireMock('@/services/lciaMethods/util');

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
  default: () => <div data-testid='source-select'>source-select</div>,
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
    return <div data-testid='exchange-edit' />;
  },
}));

jest.mock('@/pages/Processes/Components/Exchange/delete', () => ({
  __esModule: true,
  default: (props: any) => {
    mockProcessExchangeDelete(props);
    return <div data-testid='exchange-delete' />;
  },
}));

jest.mock('@/pages/Processes/Components/Exchange/view', () => ({
  __esModule: true,
  default: (props: any) => {
    mockProcessExchangeView(props);
    return <div data-testid='exchange-view' />;
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
    const { actionRef, toolBarRender, columns = [] } = props;
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
    const renderedColumns = columns.map((column: any, index: number) => {
      if (typeof column?.render !== 'function') return null;
      return <div key={column?.dataIndex ?? index}>{column.render(null, sampleRow, index)}</div>;
    });

    return (
      <section data-testid='pro-table'>
        {toolbar}
        {renderedColumns}
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
      {toText(children)}
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
    mockRefCheckContextValue = { refCheckData: [] };
  });

  it('marks rows with issues when rules are enabled', () => {
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

    expect(proTableInstances).toHaveLength(2);

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

  it('disables exchange actions when actionFrom is modelResult', () => {
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

  it('notifies parent when tab changes', () => {
    render(<ProcessForm {...defaultProps} />);

    const validationTab = screen.getByRole('button', { name: 'Validation' });
    fireEvent.click(validationTab);

    expect(defaultProps.onTabChange).toHaveBeenCalledWith('validation');
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
});
