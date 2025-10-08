// @ts-nocheck
/**
 * Flowproperties CRUD workflow integration test.
 * Covers page at: src/pages/Flowproperties/index.tsx
 *
 * Journey:
 * 1. Owner opens My Data / Flow Properties list (ProTable request -> getFlowpropertyTableAll).
 * 2. Owner creates a new flow property (FlowpropertiesCreate -> createFlowproperties -> reload).
 * 3. Owner triggers edit workflow (FlowpropertiesEdit -> updateFlowproperties -> reload).
 * 4. Owner deletes an existing flow property (FlowpropertiesDelete -> deleteFlowproperties -> reload).
 *
 * Services mocked:
 * - getFlowpropertyTableAll, createFlowproperties, updateFlowproperties, deleteFlowproperties
 */

import FlowpropertiesPage from '@/pages/Flowproperties';
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor, within } from '../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockUseLocation = jest.fn(() => ({
  pathname: '/mydata/flowproperties',
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
  getLocale: () => 'en-US',
}));

jest.mock('uuid', () => ({
  __esModule: true,
  v4: jest.fn(() => 'generated-flowproperty-id'),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  CopyOutlined: () => <span>copy</span>,
  DeleteOutlined: () => <span>delete</span>,
  DatabaseOutlined: () => <span>db</span>,
  FormOutlined: () => <span>edit</span>,
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

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;

  const Button = React.forwardRef(
    ({ children, onClick, disabled, icon, ...rest }: any, ref: any) => (
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
    ({ value = '', onChange, placeholder, type = 'text', ...rest }: any, ref: any) => (
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

  const InputSearch = ({ placeholder, onSearch, value = '' }: any) => {
    const React = require('react');
    const [keyword, setKeyword] = React.useState(value);
    return (
      <div>
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

  const InputNumber = React.forwardRef(({ value = '', onChange, ...rest }: any, ref: any) => (
    <input
      ref={ref}
      type='number'
      value={value}
      onChange={(event) => onChange?.(event)}
      {...rest}
    />
  ));
  InputNumber.displayName = 'MockInputNumber';

  const Select = ({ value = '', onChange, options = [], children, ...rest }: any) => (
    <select
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value, event)}
      {...rest}
    >
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

  const Card = ({ children, title }: any) => (
    <div>
      {title ? <div>{toText(title)}</div> : null}
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

  const Modal = ({ open, onOk, onCancel, title, children }: any) => {
    if (!open) return null;
    return (
      <div role='dialog' aria-label={toText(title) || 'modal'}>
        <div>{children}</div>
        <button type='button' onClick={onCancel}>
          Cancel
        </button>
        <button type='button' onClick={onOk}>
          Confirm
        </button>
      </div>
    );
  };

  const Descriptions = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <strong>{toText(label)}</strong>
      <span>{children}</span>
    </div>
  );

  const Divider = ({ children }: any) => <div>{toText(children)}</div>;

  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <div>{children}</div>;

  const theme = {
    useToken: () => ({
      token: {
        colorPrimary: '#1677ff',
        colorError: '#ff4d4f',
        colorTextDescription: '#888',
      },
    }),
  };

  return {
    __esModule: true,
    Button,
    Card,
    Checkbox,
    Col,
    Descriptions,
    Divider,
    Drawer,
    Input,
    InputNumber,
    Modal,
    ConfigProvider,
    Spin,
    Row,
    Select,
    Space,
    Tooltip,
    message,
    theme,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const setNestedValue = (source: any, path: any[], value: any) => {
    const next = { ...source };
    let cursor = next;
    for (let index = 0; index < path.length - 1; index += 1) {
      const key = path[index];
      cursor[key] = cursor[key] ? { ...cursor[key] } : {};
      cursor = cursor[key];
    }
    cursor[path[path.length - 1]] = value;
    return next;
  };

  const ProFormContextValue = React.createContext<any>({
    values: {},
    setFieldValue: () => {},
  });

  const ProForm = ({ formRef, initialValues = {}, onFinish, onValuesChange, children }: any) => {
    const [values, setValues] = React.useState<any>(initialValues ?? {});

    const updateValues = React.useCallback(
      (updater: (prev: any) => any) => {
        setValues((prev: any) => {
          const next = updater(prev);
          onValuesChange?.({}, next);
          return next;
        });
      },
      [onValuesChange],
    );

    const setFieldValue = React.useCallback(
      (path: any[], value: any) => {
        updateValues((prev: any) => setNestedValue(prev, path, value));
      },
      [updateValues],
    );

    React.useEffect(() => {
      if (!formRef) return;
      formRef.current = {
        submit: async () => {
          await onFinish?.();
          return true;
        },
        setFieldsValue: (next: any) => {
          setValues((prev: any) => ({ ...prev, ...next }));
        },
        resetFields: () => {
          setValues(initialValues ?? {});
        },
        getFieldsValue: () => ({ ...values }),
        setFieldValue,
      };
    }, [formRef, initialValues, onFinish, setFieldValue, values]);

    return (
      <ProFormContextValue.Provider value={{ values, setFieldValue }}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onFinish?.();
          }}
        >
          {typeof children === 'function' ? children(values) : children}
        </form>
      </ProFormContextValue.Provider>
    );
  };

  const ProTable = ({ request, actionRef, columns = [], toolBarRender, headerTitle }: any) => {
    const React = require('react');
    const [rows, setRows] = React.useState<any[]>([]);

    const requestRef = React.useRef(request);

    React.useEffect(() => {
      requestRef.current = request;
    }, [request]);

    const runRequest = React.useCallback(
      async (override: any = {}) => {
        const result = await requestRef.current?.(
          { current: 1, pageSize: 10, ...override },
          {},
          {},
        );
        setRows(result?.data ?? []);
        return result;
      },
      [requestRef],
    );

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
        <div>{resolvedHeader}</div>
        <div data-testid='pro-table-toolbar'>
          {toolBarRender
            ? toolBarRender()?.map((node: any, index: number) => <span key={index}>{node}</span>)
            : null}
        </div>
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

jest.mock('@/components/AllVersions', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: any) => <div>{children}</div>,
  };
});

jest.mock('@/components/ContributeData', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => <button type='button'>contribute</button>,
  };
});

jest.mock('@/components/ExportData', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => <span>export</span>,
  };
});

jest.mock('@/components/ImportData', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ onJsonData }: any) => (
      <button type='button' onClick={() => onJsonData?.([])}>
        import
      </button>
    ),
  };
});

jest.mock('@/components/TableFilter', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ onChange }: any) => (
      <select onChange={(event) => onChange?.(event.target.value)}>
        <option value='all'>all</option>
        <option value='100'>state 100</option>
      </select>
    ),
  };
});

jest.mock('@/pages/Flowproperties/Components/form', () => {
  const React = require('react');
  const { useState, useEffect } = React;
  return {
    __esModule: true,
    FlowpropertyForm: ({ formRef, onData }: any) => {
      const [name, setName] = useState('');
      useEffect(() => {
        formRef.current?.setFieldsValue({
          flowPropertiesInformation: {
            dataSetInformation: {
              'common:name': [{ '#text': name, '@lang': 'en' }],
            },
          },
        });
      }, [formRef, name]);
      useEffect(() => {
        onData?.();
      }, [onData]);
      return (
        <div>
          <label htmlFor='flowproperty-name-input'>Flow property name</label>
          <input
            id='flowproperty-name-input'
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
      );
    },
  };
});

const mockCreateFlowproperties = jest.fn(async () => ({
  data: [{ id: 'fp-created', version: '1.0.0' }],
}));
const mockUpdateFlowproperties = jest.fn(async () => [
  { rule_verification: true, nonExistent: false },
]);
const mockDeleteFlowproperties = jest.fn(async () => ({ status: 204 }));
const mockGetFlowpropertyTableAll = jest.fn(async () => ({
  data: [],
  success: true,
  total: 0,
}));

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  getFlowpropertyTableAll: (...args: any[]) => mockGetFlowpropertyTableAll(...args),
  createFlowproperties: (...args: any[]) => mockCreateFlowproperties(...args),
  updateFlowproperties: (...args: any[]) => mockUpdateFlowproperties(...args),
  deleteFlowproperties: (...args: any[]) => mockDeleteFlowproperties(...args),
  getFlowpropertyDetail: jest.fn(async () => ({
    data: {
      json: {
        flowPropertyDataSet: {},
      },
      version: '1.0.0',
    },
  })),
  flowproperty_hybrid_search: jest.fn(),
  getFlowpropertyTablePgroongaSearch: jest.fn(),
}));

const mockGenFlowpropertyFromData = jest.fn(async (payload: any) => payload ?? {});

jest.mock('@/services/flowproperties/util', () => ({
  __esModule: true,
  genFlowpropertyFromData: (...args: any[]) => mockGenFlowpropertyFromData(...args),
  genFlowpropertyJsonOrdered: jest.fn((id: string, data: any) => ({ id, ...data })),
}));

const mockGetDataSource = jest.fn(() => 'my');
const mockGetLang = jest.fn(() => 'en');
const mockGetLangText = jest.fn((value: any) => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : (first?.['#text'] ?? '');
  }
  if (value?.en) return value.en;
  return value?.['#text'] ?? '';
});
const mockGetDataTitle = jest.fn(() => 'My Data');
const mockFormatDateTime = jest.fn(() => '2024-01-01T00:00:00Z');
const mockGetUnitData = jest.fn(async (_type: string, rows: any[]) =>
  rows.map((row) => ({
    ...row,
    refUnitRes: row.refUnitRes ?? {
      name: { en: 'kilogram' },
      refUnitGeneralComment: { en: 'mass unit' },
      refUnitName: 'kg',
    },
  })),
);

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: (...args: any[]) => mockGetDataSource(...args),
  getLang: (...args: any[]) => mockGetLang(...args),
  getLangText: (...args: any[]) => mockGetLangText(...args),
  getDataTitle: (...args: any[]) => mockGetDataTitle(...args),
  getUnitData: (...args: any[]) => mockGetUnitData(...args),
  formatDateTime: (...args: any[]) => mockFormatDateTime(...args),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  contributeSource: jest.fn(),
  getRefData: jest.fn(async () => ({ data: {} })),
  getTeamIdByUserId: jest.fn(),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamById: jest.fn(async () => ({ data: [] })),
}));

jest.mock('@/pages/Flowproperties/Components/view', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ id, version }: any) => <button type='button'>{`view ${id}:${version}`}</button>,
  };
});

jest.mock('@/pages/Flowproperties/Components/edit', () => {
  const React = require('react');
  const { message } = jest.requireMock('antd');
  const { updateFlowproperties } = jest.requireMock('@/services/flowproperties/api');
  return {
    __esModule: true,
    default: ({ id, version, actionRef }: any) => (
      <button
        type='button'
        onClick={async () => {
          await updateFlowproperties(id, version, { updated: true });
          message.success?.('Saved successfully!');
          actionRef?.current?.reload?.();
        }}
      >
        {`edit ${id}`}
      </button>
    ),
  };
});

jest.mock('@/pages/Flowproperties/Components/delete', () => {
  const React = require('react');
  const { deleteFlowproperties } = jest.requireMock('@/services/flowproperties/api');
  const { message } = jest.requireMock('antd');
  return {
    __esModule: true,
    default: ({ id, version, actionRef }: any) => (
      <button
        type='button'
        onClick={async () => {
          await deleteFlowproperties(id, version);
          message.success?.('Deleted');
          actionRef?.current?.reload?.();
        }}
      >
        {`delete ${id}`}
      </button>
    ),
  };
});

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  toSuperscript: (value: string) => value,
}));

const baseRow = {
  id: 'fp-1',
  name: 'Water mass',
  classification: 'Mass',
  generalComment: 'Reference mass flow property',
  refUnitGroupId: 'ug-1',
  refUnitGroup: 'Mass unit group',
  refUnitRes: {
    name: { en: 'kilogram' },
    refUnitGeneralComment: { en: 'unit comment' },
    refUnitName: 'kg',
  },
  version: '1.0.0',
  modifiedAt: '2024-01-02T00:00:00Z',
  teamId: null,
};

describe('Flowproperties workflow integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFlowpropertyTableAll.mockResolvedValue({
      data: [baseRow],
      success: true,
      total: 1,
    });
    mockCreateFlowproperties.mockResolvedValue({
      data: [{ id: 'fp-created', version: '1.0.0' }],
    });
    mockUpdateFlowproperties.mockResolvedValue([{ rule_verification: true, nonExistent: false }]);
    mockDeleteFlowproperties.mockResolvedValue({ status: 204 });
  });

  const renderFlowproperties = async () => {
    await act(async () => {
      renderWithProviders(<FlowpropertiesPage />);
    });
  };

  it('completes CRUD workflow', async () => {
    await renderFlowproperties();

    await waitFor(() => expect(mockGetFlowpropertyTableAll).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Water mass')).toBeInTheDocument();

    const createButton = within(screen.getByTestId('pro-table-toolbar')).getByRole('button', {
      name: /create/i,
    });

    await userEvent.click(createButton);

    const nameInput = await screen.findByLabelText(/flow property name/i);
    await userEvent.type(nameInput, 'New Flow Property');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);

    await waitFor(() =>
      expect(mockCreateFlowproperties).toHaveBeenCalledWith(
        'generated-flowproperty-id',
        expect.any(Object),
      ),
    );
    await waitFor(() => expect(mockGetFlowpropertyTableAll).toHaveBeenCalledTimes(2));

    const editButton = screen.getByRole('button', { name: /edit fp-1/i });
    await userEvent.click(editButton);
    await waitFor(() =>
      expect(mockUpdateFlowproperties).toHaveBeenCalledWith('fp-1', '1.0.0', { updated: true }),
    );
    await waitFor(() => expect(mockGetFlowpropertyTableAll).toHaveBeenCalledTimes(3));

    const deleteButton = screen.getByRole('button', { name: /delete fp-1/i });
    await userEvent.click(deleteButton);
    await waitFor(() => expect(mockDeleteFlowproperties).toHaveBeenCalledWith('fp-1', '1.0.0'));
    await waitFor(() => expect(mockGetFlowpropertyTableAll).toHaveBeenCalledTimes(4));
  });
});
