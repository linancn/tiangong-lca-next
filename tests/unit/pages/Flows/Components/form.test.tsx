// @ts-nocheck
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { FlowForm } from '@/pages/Flows/Components/form';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

let mockSelectProps: any[] = [];
let mockPropertyCreateProps: any = null;
let mockPropertyEditProps: any = null;
let mockLevelFormCalls: any[] = [];

const mockGenFlowPropertyTabTableData = jest.fn((data: any[]) => data);
const mockGetUnitData = jest.fn();
let mockRefCheckContextValue: any = { refCheckData: [] };

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');
  const ProTable = (props: any) => {
    if (props.actionRef) {
      props.actionRef.current = { reload: jest.fn() };
    }
    const rowClass = props.rowClassName ? props.rowClassName(props.dataSource?.[0] || {}) : '';
    const toolbar = props.toolBarRender ? props.toolBarRender() : null;
    return (
      <div data-testid='pro-table' data-row-class={rowClass}>
        <div data-testid='pro-table-toolbar'>{toolbar}</div>
        {(props.columns || []).map((col: any, idx: number) =>
          typeof col.render === 'function' ? (
            <div key={col.dataIndex || idx}>
              {col.render(null, props.dataSource?.[0] || {}, idx)}
            </div>
          ) : null,
        )}
      </div>
    );
  };
  return { __esModule: true, ProTable };
});

jest.mock('antd', () => {
  const React = require('react');
  const Card = ({ tabList = [], activeTabKey, onTabChange, children }: any) => (
    <div data-testid='card'>
      <div>
        {tabList.map((tab: any) => (
          <button type='button' key={tab.key} onClick={() => onTabChange?.(tab.key)}>
            {toText(tab.tab)}
          </button>
        ))}
      </div>
      <div data-testid='active-tab'>{activeTabKey}</div>
      {children}
    </div>
  );
  const Form = ({ children }: any) => <form>{children}</form>;
  Form.Item = ({ label, children }: any) => (
    <label>
      {toText(label)}
      {children}
    </label>
  );
  const Input = ({ value = '', onChange }: any) => (
    <input value={value} onChange={(e) => onChange?.(e)} />
  );
  const Select = (props: any) => {
    mockSelectProps.push(props);
    return (
      <button
        type='button'
        data-testid={`select-${mockSelectProps.length - 1}`}
        onClick={() => props.onChange?.(props.options?.[0]?.value ?? 'selected')}
      >
        select
      </button>
    );
  };
  const Space = ({ children }: any) => <div>{children}</div>;
  const Tooltip = ({ children }: any) => <>{children}</>;
  const Divider = ({ children }: any) => <div>{children}</div>;
  const theme = { useToken: () => ({ token: { colorTextDescription: '#000' } }) };
  return { __esModule: true, Card, Form, Input, Select, Space, Tooltip, Divider, theme };
});

jest.mock('@/contexts/refCheckContext', () => ({
  __esModule: true,
  useRefCheckContext: () => mockRefCheckContextValue,
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getUnitData: (...args: any[]) => mockGetUnitData(...args),
  getLangText: (data: any) => data || 'text',
}));

jest.mock('@/services/flows/util', () => ({
  __esModule: true,
  genFlowPropertyTabTableData: (...args: any[]) => mockGenFlowPropertyTabTableData(...args),
}));

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getRules: () => [{ rule: true }],
}));

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  default: ({ value }: any) => <span data-testid='aligned-number'>{value}</span>,
}));

jest.mock('@/components/QuantitativeReferenceIcon', () => ({
  __esModule: true,
  default: ({ value }: any) => <span data-testid='quantitative-icon'>{String(value)}</span>,
}));

jest.mock('@/components/RequiredMark', () => ({
  __esModule: true,
  default: ({ label }: any) => <span>{toText(label)}</span>,
}));

jest.mock('@/pages/Flows/Components/Property/view', () => ({
  __esModule: true,
  default: () => <div data-testid='property-view-mock' />,
}));

jest.mock('@/pages/Flows/Components/Property/create', () => ({
  __esModule: true,
  default: (props: any) => {
    mockPropertyCreateProps = props;
    return <div data-testid='property-create' />;
  },
}));
jest.mock('@/pages/Flows/Components/Property/edit', () => ({
  __esModule: true,
  default: (props: any) => {
    mockPropertyEditProps = props;
    return <div data-testid='property-edit' />;
  },
}));
jest.mock('@/pages/Flows/Components/Property/delete', () => ({
  __esModule: true,
  default: () => <div data-testid='property-delete' />,
}));

jest.mock('@/components/LangTextItem/form', () => ({
  __esModule: true,
  default: () => <div data-testid='lang-form'>lang-form</div>,
}));
jest.mock('@/components/LevelTextItem/form', () => ({
  __esModule: true,
  default: (props: any) => {
    mockLevelFormCalls.push(props);
    return <div data-testid='level-form'>{String(props.hidden)}</div>;
  },
}));
jest.mock('@/components/LocationTextItem/form', () => ({
  __esModule: true,
  default: () => <div data-testid='location-form'>location-form</div>,
}));
jest.mock('@/pages/Contacts/Components/select/form', () => ({
  __esModule: true,
  default: () => <div data-testid='contact-select' />,
}));
jest.mock('@/pages/Sources/Components/select/form', () => ({
  __esModule: true,
  default: () => <div data-testid='source-select' />,
}));

describe('FlowForm (src/pages/Flows/Components/form.tsx)', () => {
  const baseProps = () => ({
    lang: 'en',
    activeTabKey: 'flowInformation',
    drawerVisible: true,
    formRef: { current: { setFieldValue: jest.fn() } },
    onData: jest.fn(),
    flowType: 'Elementary flow',
    propertyDataSource: [
      {
        '@dataSetInternalID': '0',
        referenceToFlowPropertyDataSetId: 'flow-1',
        referenceToFlowPropertyDataSetVersion: '1.0',
      },
    ],
    onPropertyData: jest.fn(),
    onPropertyDataCreate: jest.fn(),
    onTabChange: jest.fn(),
    formType: 'create',
  });

  beforeEach(() => {
    mockSelectProps = [];
    mockPropertyCreateProps = null;
    mockPropertyEditProps = null;
    mockLevelFormCalls = [];
    mockRefCheckContextValue = { refCheckData: [] };
    mockGetUnitData.mockResolvedValue([
      {
        dataSetInternalID: '0',
        referenceToFlowPropertyDataSetId: 'flow-1',
        referenceToFlowPropertyDataSetVersion: '1.0',
        meanValue: undefined,
      },
    ]);
  });

  it('renders property table data and marks error rows when ref check or mean value missing', async () => {
    mockRefCheckContextValue = { refCheckData: [{ id: 'flow-1', version: '1.0' }] };
    await act(async () => {
      render(<FlowForm {...baseProps()} showRules />);
    });

    await waitFor(() => {
      expect(mockGetUnitData).toHaveBeenCalled();
    });
    const table = await screen.findByTestId('pro-table');
    expect(table.getAttribute('data-row-class')).toBe('error-row');
    expect(mockPropertyCreateProps?.showRules).toBe(true);
    expect(mockPropertyEditProps?.showRules).toBe(true);
  });

  it('fires tab change callbacks', async () => {
    const props = baseProps();
    await act(async () => {
      render(<FlowForm {...props} />);
    });

    fireEvent.click(screen.getByText('Modelling and validation'));
    expect(props.onTabChange).toHaveBeenCalled();
  });

  it('resets classification fields when switching away from elementary flow', async () => {
    const props = baseProps();
    await act(async () => {
      render(<FlowForm {...props} />);
    });

    const typeSelect = mockSelectProps.find((p) => (p.options || []).length === 2);
    act(() => {
      typeSelect.onChange('Product flow');
    });

    expect(props.formRef.current.setFieldValue).toHaveBeenCalledWith(
      expect.arrayContaining(['common:elementaryFlowCategorization']),
      null,
    );
    expect(props.formRef.current.setFieldValue).toHaveBeenCalledWith(
      expect.arrayContaining(['common:classification']),
      null,
    );
    const [elemForm, productForm] = mockLevelFormCalls.slice(-2);
    expect(elemForm.hidden).toBe(true);
    expect(productForm.hidden).toBe(false);
  });

  it('passes property data through getUnitData and renders columns', async () => {
    mockGetUnitData.mockResolvedValue([
      {
        dataSetInternalID: '0',
        referenceToFlowPropertyDataSetId: 'flow-1',
        referenceToFlowPropertyDataSetVersion: '1.0',
        meanValue: 5,
        quantitativeReference: true,
        refUnitRes: { name: 'unit-name', refUnitGeneralComment: 'comment', refUnitName: 'kg' },
      },
    ]);

    await act(async () => {
      render(<FlowForm {...baseProps()} showRules />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('aligned-number')).toBeInTheDocument();
      expect(screen.getByTestId('quantitative-icon')).toBeInTheDocument();
    });
  });
});
