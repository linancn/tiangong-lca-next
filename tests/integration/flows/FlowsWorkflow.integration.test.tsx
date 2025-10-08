// @ts-nocheck
/**
 * Flows create workflow integration tests covering classification and property association.
 * Scope:
 * - src/pages/Flows/index.tsx
 * - src/pages/Flows/Components/create.tsx
 *
 * Journeys:
 * 1. Owner loads /mydata flows table (ProTable request invoked with getFlowTableAll).
 * 2. Owner opens create drawer, selects flow type + classification, adds a flow property, saves, observes success toast and table reload.
 *
 * Services mocked:
 * - getFlowTableAll, createFlows
 */

import FlowsPage from '@/pages/Flows';
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor, within } from '../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(toText).join('');
  }
  if (node?.props?.defaultMessage) {
    return node.props.defaultMessage;
  }
  if (node?.props?.id) {
    return node.props.id;
  }
  if (node?.props?.children) {
    return toText(node.props.children);
  }
  return '';
};

const mockUseLocation = jest.fn(() => ({
  pathname: '/mydata/flows',
  search: '',
}));

const mockIntl = {
  locale: 'en-US',
  formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => mockIntl,
  useLocation: () => mockUseLocation(),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  CopyOutlined: () => <span>copy</span>,
  PlusOutlined: () => <span>plus</span>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  const Button = React.forwardRef(
    ({ children, onClick, disabled, icon, ...rest }: any, ref: React.Ref<HTMLButtonElement>) => (
      <button
        ref={ref}
        type='button'
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        {...rest}
      >
        {icon}
        {children}
      </button>
    ),
  );
  Button.displayName = 'MockButton';

  const Input = React.forwardRef(
    (
      { value = '', onChange, placeholder, type = 'text', ...rest }: any,
      ref: React.Ref<HTMLInputElement>,
    ) => (
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={(event) => onChange?.(event)}
        placeholder={placeholder}
        {...rest}
      />
    ),
  );
  Input.displayName = 'MockInput';

  const InputSearch = ({ placeholder, onSearch }: any) => {
    const React = require('react');
    const [keyword, setKeyword] = React.useState('');
    return (
      <div data-testid='search-input'>
        <input
          value={keyword}
          placeholder={placeholder}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <button type='button' onClick={() => onSearch?.(keyword)}>
          Search
        </button>
      </div>
    );
  };
  Input.Search = InputSearch;

  const Select = ({ value = '', onChange, options = [], children, placeholder, ...rest }: any) => (
    <select
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value, event)}
      aria-label={rest['aria-label']}
      {...rest}
    >
      {placeholder ? (
        <option value='' disabled={true}>
          {placeholder}
        </option>
      ) : null}
      {options.map((option: any) => (
        <option key={option.value ?? option} value={option.value ?? option}>
          {option.label ?? option.value ?? option}
        </option>
      ))}
      {children}
    </select>
  );

  const Checkbox = ({ checked = false, onChange, children }: any) => (
    <label>
      <input
        type='checkbox'
        checked={checked}
        onChange={(event) => onChange?.({ target: { checked: event.target.checked } })}
      />
      {children}
    </label>
  );

  const Tooltip = ({ title, children }: any) => {
    const label = toText(title);
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        'aria-label': children.props['aria-label'] ?? label,
        title: children.props.title ?? label,
      });
    }
    return <span title={label}>{children}</span>;
  };

  const Card = ({ title, extra, children }: any) => (
    <div>
      <div>{toText(title)}</div>
      <div>{extra}</div>
      <div>{children}</div>
    </div>
  );

  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;

  const Drawer = ({ open, onClose, title, extra, footer, children }: any) => {
    if (!open) return null;
    const label = toText(title) || 'drawer';
    return (
      <div role='dialog' aria-label={label}>
        <div>{extra}</div>
        <div>{children}</div>
        <div>{footer}</div>
        <button type='button' onClick={onClose}>
          Close
        </button>
      </div>
    );
  };

  const InputNumber = ({ value = '', onChange, ...rest }: any) => (
    <input
      type='number'
      value={value}
      onChange={(event) => onChange?.(Number(event.target.value))}
      {...rest}
    />
  );

  const Switch = ({ checked = false, onChange }: any) => (
    <label>
      <input
        type='checkbox'
        role='switch'
        checked={checked}
        onChange={(event) => onChange?.(event.target.checked)}
      />
    </label>
  );

  const Spin = ({ spinning, children }: any) => (spinning ? <div>Loading...</div> : children);

  const ConfigProvider = ({ children }: any) => <>{children}</>;

  const theme = {
    useToken: () => ({
      token: {
        colorPrimary: '#1677ff',
        colorTextDescription: '#8c8c8c',
        colorError: '#ff4d4f',
      },
    }),
  };

  return {
    __esModule: true,
    Button,
    Card,
    Checkbox,
    Col,
    ConfigProvider,
    Drawer,
    Input,
    InputNumber,
    Row,
    Select,
    Space,
    Spin,
    Switch,
    Tooltip,
    message,
    theme,
  };
});

const getMockAntdMessage = () => jest.requireMock('antd').message as Record<string, jest.Mock>;

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProFormContext = React.createContext<any>(null);

  const deepMerge = (target: any, source: any): any => {
    const base = Array.isArray(target) ? [...target] : { ...(target ?? {}) };
    Object.entries(source ?? {}).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        base[key] = deepMerge(base[key], value);
      } else {
        base[key] = value;
      }
    });
    return base;
  };

  const setDeepValue = (object: any, path: any[], value: any) => {
    if (path.length === 0) return;
    const [head, ...rest] = path;
    if (rest.length === 0) {
      object[head] = value;
      return;
    }
    if (!object[head] || typeof object[head] !== 'object') {
      object[head] = {};
    }
    setDeepValue(object[head], rest, value);
  };

  const buildNestedValue = (path: any[], value: any): any => {
    if (path.length === 0) {
      return value;
    }
    const [head, ...rest] = path;
    if (rest.length === 0) {
      return { [head]: value };
    }
    return { [head]: buildNestedValue(rest, value) };
  };

  const ProForm = ({ formRef, initialValues = {}, onValuesChange, onFinish, children }: any) => {
    const initialRef = React.useRef(initialValues);
    const [values, setValues] = React.useState<any>(initialValues ?? {});
    const pendingChangeRef = React.useRef<any>(null);

    const handleSetFieldValue = React.useCallback((pathInput: any, nextValue: any) => {
      const path = Array.isArray(pathInput) ? pathInput : [pathInput];
      setValues((previous: any) => {
        const draft = JSON.parse(JSON.stringify(previous ?? {}));
        setDeepValue(draft, path, nextValue);
        const changed = buildNestedValue(path, nextValue);
        pendingChangeRef.current = { changed, nextValues: draft };
        return draft;
      });
    }, []);

    const handleSetFieldsValue = React.useCallback((next: any = {}) => {
      setValues((previous: any) => {
        const merged = deepMerge(previous, next);
        pendingChangeRef.current = { changed: next, nextValues: merged };
        return merged;
      });
    }, []);

    const handleResetFields = React.useCallback(() => {
      setValues(initialRef.current ?? {});
    }, []);

    const handleGetFieldsValue = React.useCallback(() => values, [values]);

    const handleSubmit = React.useCallback(async () => {
      return onFinish?.();
    }, [onFinish]);

    React.useImperativeHandle(formRef, () => ({
      getFieldsValue: handleGetFieldsValue,
      setFieldsValue: handleSetFieldsValue,
      resetFields: handleResetFields,
      setFieldValue: handleSetFieldValue,
      submit: handleSubmit,
    }));

    React.useEffect(() => {
      if (pendingChangeRef.current) {
        const { changed, nextValues } = pendingChangeRef.current;
        pendingChangeRef.current = null;
        onValuesChange?.(changed, nextValues);
      }
    }, [values, onValuesChange]);

    const contextValue = React.useMemo(
      () => ({
        values,
        setFieldValue: handleSetFieldValue,
        setFieldsValue: handleSetFieldsValue,
      }),
      [values, handleSetFieldValue, handleSetFieldsValue],
    );

    return (
      <ProFormContext.Provider value={contextValue}>
        <form
          data-testid='pro-form'
          onSubmit={(event) => {
            event.preventDefault();
            void onFinish?.();
          }}
        >
          {typeof children === 'function' ? children(values) : children}
        </form>
      </ProFormContext.Provider>
    );
  };

  const ProTable = ({ request, actionRef, columns = [], toolBarRender, headerTitle }: any) => {
    const React = require('react');
    const [rows, setRows] = React.useState<any[]>([]);

    const requestRef = React.useRef(request);

    React.useEffect(() => {
      requestRef.current = request;
    }, [request]);

    const runRequest = React.useCallback(async (override: any = {}) => {
      const result = await requestRef.current?.({ current: 1, pageSize: 10, ...override }, {}, {});
      setRows(result?.data ?? []);
      return result;
    }, []);

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload: () => runRequest(),
          setPageInfo: (info: any) => runRequest(info),
        };
      }
      return () => {
        if (actionRef) {
          actionRef.current = undefined;
        }
      };
    }, [actionRef, runRequest]);

    React.useEffect(() => {
      void runRequest();
    }, [runRequest]);

    const resolvedHeader = typeof headerTitle === 'function' ? headerTitle() : toText(headerTitle);

    return (
      <div data-testid='pro-table'>
        <div data-testid='pro-table-header'>{resolvedHeader}</div>
        <div data-testid='pro-table-toolbar'>{toolBarRender?.()}</div>
        <table>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row?.id ?? rowIndex}>
                {columns.map((column: any, columnIndex: number) => (
                  <td key={columnIndex}>
                    {typeof column.render === 'function'
                      ? column.render(row[column.dataIndex], row, rowIndex)
                      : row[column.dataIndex]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const PageContainer = ({ children }: any) => <div>{children}</div>;

  return {
    __esModule: true,
    ActionType: {},
    PageContainer,
    ProForm,
    ProTable,
    __ProFormContext: ProFormContext,
  };
});

jest.mock('@ant-design/pro-table', () => ({
  __esModule: true,
  TableDropdown: ({ menus = [] }: any) => (
    <div>
      {menus.map((menu: any) => (
        <div key={menu.key}>{toText(menu.name)}</div>
      ))}
    </div>
  ),
}));

jest.mock('@/components/ToolBarButton', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ tooltip, onClick }: any) => (
      <button type='button' onClick={onClick}>
        {toText(tooltip) || 'button'}
      </button>
    ),
  };
});

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ContributeData', () => ({
  __esModule: true,
  default: () => <button type='button'>contribute</button>,
}));

jest.mock('@/components/ExportData', () => ({
  __esModule: true,
  default: () => <span>export</span>,
}));

jest.mock('@/components/ImportData', () => ({
  __esModule: true,
  default: ({ onJsonData }: any) => (
    <button type='button' onClick={() => onJsonData?.([])}>
      import
    </button>
  ),
}));

jest.mock('@/components/TableFilter', () => ({
  __esModule: true,
  default: ({ onChange }: any) => (
    <select onChange={(event) => onChange?.(event.target.value)}>
      <option value='all'>all</option>
      <option value='mine'>mine</option>
    </select>
  ),
}));

jest.mock('@/pages/Flows/Components/delete', () => ({
  __esModule: true,
  default: () => <button type='button'>delete-flow</button>,
}));

jest.mock('@/pages/Flows/Components/edit', () => ({
  __esModule: true,
  default: () => <button type='button'>edit-flow</button>,
}));

jest.mock('@/pages/Flows/Components/view', () => ({
  __esModule: true,
  default: () => <button type='button'>view-flow</button>,
}));

jest.mock('@/pages/Flows/Components/form', () => {
  const React = require('react');
  const { __ProFormContext } = jest.requireMock('@ant-design/pro-components');

  const FlowFormMock = ({
    propertyDataSource = [],
    onPropertyDataCreate,
    onData,
    onTabChange,
  }: any) => {
    const context = React.useContext(__ProFormContext) ?? {
      values: {},
      setFieldValue: () => {},
    };

    React.useEffect(() => {
      onTabChange?.('flowInformation');
    }, []);

    React.useEffect(() => {
      onData?.();
    }, []);

    const values = context.values ?? {};

    const baseName = values?.flowInformation?.dataSetInformation?.name?.baseName ?? '';
    const flowType = values?.modellingAndValidation?.LCIMethod?.typeOfDataSet ?? '';
    const classificationSelection =
      values?.flowInformation?.dataSetInformation?.classificationInformation?.selection ?? {};

    const updateField = (path: any[], value: any) => {
      context.setFieldValue?.(path, value);
      onData?.();
    };

    return (
      <div>
        <label htmlFor='flow-base-name'>Base name</label>
        <input
          id='flow-base-name'
          value={baseName}
          onChange={(event) =>
            updateField(
              ['flowInformation', 'dataSetInformation', 'name', 'baseName'],
              event.target.value,
            )
          }
        />
        <label htmlFor='flow-type-select'>Flow type</label>
        <select
          id='flow-type-select'
          value={flowType}
          onChange={(event) =>
            updateField(
              ['modellingAndValidation', 'LCIMethod', 'typeOfDataSet'],
              event.target.value,
            )
          }
        >
          <option value=''>Select type</option>
          <option value='Product flow'>Product flow</option>
          <option value='Elementary flow'>Elementary flow</option>
        </select>
        <label htmlFor='flow-classification'>Classification</label>
        <select
          id='flow-classification'
          value={classificationSelection?.showValue ?? ''}
          onChange={(event) => {
            const selected = event.target.value;
            updateField(
              ['flowInformation', 'dataSetInformation', 'classificationInformation', 'selection'],
              {
                id: ['root', selected],
                value: ['Root', selected],
                showValue: selected,
              },
            );
          }}
        >
          <option value=''>Select classification</option>
          <option value='class-a'>Class A</option>
          <option value='class-b'>Class B</option>
        </select>
        <button
          type='button'
          onClick={() => {
            onData?.();
            onPropertyDataCreate?.({
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'fp-1',
                '@version': '1.0.0',
              },
              meanValue: '1.23',
              quantitativeReference: propertyDataSource.length === 0,
            });
          }}
        >
          Add flow property
        </button>
        <ul data-testid='flow-property-list'>
          {propertyDataSource.map((row: any) => (
            <li
              key={
                row['@dataSetInternalID'] ?? row?.referenceToFlowPropertyDataSet?.['@refObjectId']
              }
            >
              {row?.referenceToFlowPropertyDataSet?.['@refObjectId']}
              {row?.quantitativeReference ? '(ref)' : ''}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return {
    __esModule: true,
    FlowForm: FlowFormMock,
  };
});

const mockGetFlowTableAll = jest.fn(async () => ({
  data: [],
  success: true,
  total: 0,
}));

const mockCreateFlows = jest.fn(async () => ({
  data: [{ id: 'flow-created', version: '1.0.0.001' }],
}));

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getFlowTableAll: (...args: any[]) => mockGetFlowTableAll(...args),
  getFlowTablePgroongaSearch: jest.fn(),
  flow_hybrid_search: jest.fn(),
  getFlowDetail: jest.fn(),
  createFlows: (...args: any[]) => mockCreateFlows(...args),
  updateFlows: jest.fn(),
  deleteFlows: jest.fn(),
}));

const mockGetDataSource = jest.fn(() => 'my');
const mockGetLang = jest.fn(() => 'en');
const mockGetLangText = jest.fn((value: any) => {
  if (typeof value === 'string') return value;
  if (value?.en) return value.en;
  return '';
});
const mockGetDataTitle = jest.fn(() => 'My Data');
const mockFormatDateTime = jest.fn(() => '2024-01-01T00:00:00Z');

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: (...args: any[]) => mockGetDataSource(...args),
  getLang: (...args: any[]) => mockGetLang(...args),
  getLangText: (...args: any[]) => mockGetLangText(...args),
  getDataTitle: (...args: any[]) => mockGetDataTitle(...args),
  formatDateTime: (...args: any[]) => mockFormatDateTime(...args),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  contributeSource: jest.fn(),
  getRefData: jest.fn(async () => ({ data: {} })),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamById: jest.fn(async () => ({ data: [] })),
}));

describe('Flows workflow', () => {
  const renderFlows = async () => {
    await act(async () => {
      renderWithProviders(<FlowsPage />);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFlowTableAll.mockResolvedValue({
      data: [],
      success: true,
      total: 0,
    });
    mockCreateFlows.mockResolvedValue({
      data: [{ id: 'flow-created', version: '1.0.0.001' }],
    });
    Object.values(getMockAntdMessage()).forEach((fn) => fn.mockClear());
  });

  it('creates a flow with classification and property association', async () => {
    await renderFlows();

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalledTimes(1));

    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Create' }));

    const drawer = await screen.findByRole('dialog', { name: 'Flows Create' });

    const baseNameInput = within(drawer).getByLabelText('Base name');
    await user.clear(baseNameInput);
    await user.type(baseNameInput, 'Battery flow');

    const flowTypeSelect = within(drawer).getByLabelText('Flow type');
    await user.selectOptions(flowTypeSelect, 'Product flow');

    const classificationSelect = within(drawer).getByLabelText('Classification');
    await user.selectOptions(classificationSelect, 'class-a');

    await user.click(within(drawer).getByRole('button', { name: 'Add flow property' }));

    await waitFor(() => expect(within(drawer).getByText('fp-1(ref)')).toBeInTheDocument());

    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockCreateFlows).toHaveBeenCalledTimes(1));

    const [createdId, payload] = mockCreateFlows.mock.calls[0];
    expect(typeof createdId).toBe('string');
    expect(createdId.length).toBeGreaterThan(0);

    expect(payload?.flowInformation?.dataSetInformation?.name?.baseName).toBe('Battery flow');
    expect(
      payload?.flowInformation?.dataSetInformation?.classificationInformation?.selection?.showValue,
    ).toBe('class-a');
    expect(payload?.modellingAndValidation?.LCIMethod?.typeOfDataSet).toBe('Product flow');

    const properties = payload?.flowProperties?.flowProperty ?? [];
    expect(properties).toHaveLength(1);
    expect(properties[0]?.referenceToFlowPropertyDataSet?.['@refObjectId']).toBe('fp-1');
    expect(properties[0]?.quantitativeReference).toBe(true);
    expect(properties[0]?.['@dataSetInternalID']).toBe('0');

    expect(getMockAntdMessage().success).toHaveBeenCalledWith('Created successfully!');

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalledTimes(2));
  });
});
