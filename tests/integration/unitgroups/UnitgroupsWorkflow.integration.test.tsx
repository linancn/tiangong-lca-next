// @ts-nocheck
/**
 * Unitgroups CRUD + unit management workflow integration test.
 * Covers src/pages/Unitgroups/index.tsx with focus on:
 * - Initial table load via getUnitGroupTableAll.
 * - Search behaviour delegating to getUnitGroupTablePgroongaSearch.
 * - Create drawer flow calling createUnitGroup and reloading the table.
 * - Edit drawer flow calling getUnitGroupDetail + updateUnitGroup.
 * - Delete confirmation invoking deleteUnitGroup and refreshing data.
 *
 * Service mocks:
 * - getUnitGroupTableAll, getUnitGroupTablePgroongaSearch, unitgroup_hybrid_search
 * - getUnitGroupDetail, createUnitGroup, updateUnitGroup, deleteUnitGroup
 * Ancillary mocks:
 * - getRoleByUserId (ensures admin access), getTeamById, contributeSource
 * - Minimal UnitGroupForm implementation to exercise unit add/update callbacks
 */

import UnitgroupsPage from '@/pages/Unitgroups';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '../../helpers/testUtils';

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
  pathname: '/mydata/unitgroups',
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
  v4: jest.fn(() => 'generated-unit-group-id'),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span data-testid='icon-close' />,
  CopyOutlined: () => <span data-testid='icon-copy' />,
  DeleteOutlined: () => <span data-testid='icon-delete' />,
  FormOutlined: () => <span data-testid='icon-edit' />,
  PlusOutlined: () => <span data-testid='icon-plus' />,
}));

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  default: ({ value }: any) => <span>{value}</span>,
  toSuperscript: (value: any) => value,
}));

jest.mock('@/components/ToolBarButton', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ icon, tooltip, onClick }: any) => (
      <button type='button' onClick={onClick}>
        {icon}
        {toText(tooltip) || 'Tool button'}
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
    default: ({ onOk }: any) => (
      <button type='button' onClick={() => onOk?.()}>
        contribute
      </button>
    ),
  };
});

jest.mock('@/components/ExportData', () => ({
  __esModule: true,
  default: () => <span>export</span>,
}));

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
    default: ({ onChange, disabled }: any) => (
      <select
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        aria-label='state-filter'
        defaultValue='all'
      >
        <option value='all'>All</option>
        <option value='100'>State 100</option>
      </select>
    ),
  };
});

jest.mock('@/pages/Unitgroups/Components/view', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ buttonType }: any) => (
      <button type='button'>{buttonType === 'icon' ? 'view' : 'View'}</button>
    ),
  };
});

jest.mock('@/pages/Unitgroups/Components/form', () => {
  const React = require('react');

  const UnitGroupForm = ({
    formRef,
    onData,
    onUnitData,
    onUnitDataCreate,
    onTabChange,
    unitDataSource = [],
  }: any) => {
    const [name, setName] = React.useState('');

    React.useEffect(() => {
      const existingName = formRef?.current?.getFieldsValue?.()?.unitGroupName;
      if (existingName !== undefined) {
        setName(existingName);
      }
    }, [formRef]);

    const handleName = (value: string) => {
      setName(value);
      formRef?.current?.setFieldValue?.(['unitGroupName'], value);
      onData?.();
    };

    return (
      <div>
        <label htmlFor='unit-group-name-input'>Unit group name</label>
        <input
          id='unit-group-name-input'
          value={name}
          onChange={(event) => handleName(event.target.value)}
        />
        <button
          type='button'
          onClick={() =>
            onUnitDataCreate?.({
              name: `Unit ${unitDataSource.length + 1}`,
              generalComment: { en: 'unit comment' },
              meanValue: '1',
              quantitativeReference: unitDataSource.length === 0,
            })
          }
        >
          Add Unit
        </button>
        <button
          type='button'
          onClick={() =>
            onUnitData?.(
              unitDataSource.map((unit: any, index: number) => ({
                ...unit,
                name: `${unit.name ?? `Unit ${index + 1}`} (edited)`,
              })),
            )
          }
        >
          Normalize Units
        </button>
        <button type='button' onClick={() => onTabChange?.('units')}>
          Switch Tab
        </button>
        <div>Units: {unitDataSource.length}</div>
      </div>
    );
  };

  return {
    __esModule: true,
    UnitGroupForm,
  };
});

jest.mock('@/services/unitgroups/util', () => ({
  __esModule: true,
  genUnitGroupFromData: jest.fn(),
  genUnitGroupJsonOrdered: jest.fn((id: string, data: any) => ({ id, data })),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: jest.fn(() => 'my'),
  getLang: jest.fn(() => 'en'),
  getLangText: jest.fn((value: any) => {
    if (typeof value === 'string') return value;
    if (!value) return '';
    if (value.en) return value.en;
    if (Array.isArray(value)) return value.map((item) => item?.name ?? '').join(',');
    return '';
  }),
  formatDateTime: jest.fn(() => '2023-09-01T00:00:00Z'),
  classificationToString: jest.fn((value: any) =>
    Array.isArray(value) ? value.join(' / ') : (value ?? ''),
  ),
  jsonToList: jest.fn((value: any) => {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    return [value];
  }),
  genClassificationZH: jest.fn((classifications: any) => classifications),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  contributeSource: jest.fn(async () => ({ data: {}, error: null })),
  getTeamIdByUserId: jest.fn(async () => 'team-1'),
}));

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getRoleByUserId: jest.fn(async () => [
    {
      team_id: '00000000-0000-0000-0000-000000000000',
      role: 'admin',
    },
  ]),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamById: jest.fn(async () => ({
    data: [
      {
        json: {
          title: { en: 'Sustainability Team' },
        },
      },
    ],
  })),
}));

jest.mock('@/services/unitgroups/api', () => ({
  __esModule: true,
  getUnitGroupTableAll: jest.fn(),
  getUnitGroupTablePgroongaSearch: jest.fn(),
  unitgroup_hybrid_search: jest.fn(),
  createUnitGroup: jest.fn(),
  updateUnitGroup: jest.fn(),
  deleteUnitGroup: jest.fn(),
  getUnitGroupDetail: jest.fn(),
}));

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

  const Button = React.forwardRef((props: any, ref: any) => {
    const { children, onClick, disabled, icon, ...rest } = props ?? {};
    return (
      <button
        type='button'
        ref={ref}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        {...rest}
      >
        {icon}
        {children}
      </button>
    );
  });
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

  const Select = ({ value = '', onChange, options = [], children, ...rest }: any) => (
    <select
      value={value ?? ''}
      onChange={(event) =>
        onChange?.(event.target.value, { target: { value: event.target.value } })
      }
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

  const Switch = ({ checked = false, onChange }: any) => (
    <label>
      <input
        type='checkbox'
        checked={checked}
        onChange={(event) => onChange?.(event.target.checked)}
      />
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
    return (
      <span title={label} aria-label={label}>
        {children}
      </span>
    );
  };

  const Card = ({ children, title, tabList = [], activeTabKey, onTabChange }: any) => (
    <div>
      {title ? <div>{toText(title)}</div> : null}
      {tabList.length > 0 ? (
        <div>
          {tabList.map((tab: any) => (
            <button
              key={tab.key}
              type='button'
              onClick={() => onTabChange?.(tab.key)}
              aria-pressed={tab.key === activeTabKey}
            >
              {toText(tab.tab)}
            </button>
          ))}
        </div>
      ) : null}
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

  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <div>{children}</div>;

  const theme = {
    useToken: () => ({
      token: {
        colorPrimary: '#1677ff',
        red: '#ff4d4f',
        fontSize: 16,
      },
    }),
  };

  const Form = ({ children }: any) => <form>{children}</form>;
  Form.Item = ({ children }: any) => <div>{children}</div>;

  return {
    __esModule: true,
    Button,
    Card,
    Checkbox,
    Col,
    ConfigProvider,
    Drawer,
    Input,
    Modal,
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
      requestRef.current = request;
      void runRequest();
    }, [request, runRequest]);

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
                {columns.map((column: any, columnIndex: number) => {
                  const rendered =
                    typeof column.render === 'function'
                      ? column.render(row[column.dataIndex], row, rowIndex)
                      : row[column.dataIndex];
                  if (React.isValidElement(rendered)) {
                    return <td key={columnIndex}>{rendered}</td>;
                  }
                  if (Array.isArray(rendered)) {
                    return <td key={columnIndex}>{rendered}</td>;
                  }
                  if (rendered === null || rendered === undefined) {
                    return <td key={columnIndex}></td>;
                  }
                  return (
                    <td key={columnIndex}>
                      {typeof rendered === 'object' ? String(rendered) : rendered}
                    </td>
                  );
                })}
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

const { message } = jest.requireMock('antd');
const {
  getUnitGroupTableAll,
  getUnitGroupTablePgroongaSearch,
  unitgroup_hybrid_search,
  createUnitGroup,
  updateUnitGroup,
  deleteUnitGroup,
  getUnitGroupDetail,
} = jest.requireMock('@/services/unitgroups/api');
const { genUnitGroupFromData: mockGenUnitGroupFromData } = jest.requireMock(
  '@/services/unitgroups/util',
);

const baseUnitGroupRow = {
  id: 'unitgroup-1',
  name: 'Electricity units',
  classification: 'Energy',
  refUnitId: 'unit-01',
  refUnitName: 'kWh',
  refUnitGeneralComment: 'Kilowatt hour',
  version: '1.0',
  modifiedAt: new Date('2023-09-01T00:00:00Z'),
  teamId: null,
};

describe('Unitgroups Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocation.mockReturnValue({
      pathname: '/mydata/unitgroups',
      search: '',
    });
    getUnitGroupTableAll.mockResolvedValue({
      data: [baseUnitGroupRow],
      success: true,
      total: 1,
    });
    getUnitGroupTablePgroongaSearch.mockResolvedValue({
      data: [
        {
          ...baseUnitGroupRow,
          id: 'unitgroup-search',
          name: 'Heat units',
        },
      ],
      success: true,
      total: 1,
    });
    unitgroup_hybrid_search.mockResolvedValue({
      data: [],
      success: true,
      total: 0,
    });
    createUnitGroup.mockResolvedValue({
      data: [{ id: 'generated-unit-group-id' }],
      error: null,
    });
    updateUnitGroup.mockResolvedValue({
      data: [{ rule_verification: true }],
      error: null,
    });
    deleteUnitGroup.mockResolvedValue({ status: 204 });
    getUnitGroupDetail.mockResolvedValue({
      data: {
        json: {
          unitGroupDataSet: {
            unitGroupInformation: {},
          },
        },
      },
    });
    mockGenUnitGroupFromData.mockReturnValue({
      id: 'unitgroup-1',
      unitGroupInformation: {
        dataSetInformation: {
          name: 'Electricity units',
        },
      },
      units: {
        unit: [
          {
            '@dataSetInternalID': '0',
            name: 'Electricity unit',
            quantitativeReference: true,
            generalComment: { en: 'Existing unit comment' },
            meanValue: '1',
          },
        ],
      },
    });
  });

  it('allows an admin to manage unit groups and units', async () => {
    const user = userEvent.setup();

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() => {
      expect(getUnitGroupTableAll).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText('Electricity units')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('pages.search.keyWord');
    await user.clear(searchInput);
    await user.type(searchInput, 'heat');
    await user.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(getUnitGroupTablePgroongaSearch).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText('Heat units')).toBeInTheDocument();
    });

    const toolbar = screen.getByTestId('pro-table-toolbar');
    await user.click(within(toolbar).getByRole('button', { name: /create/i }));

    const createDrawer = await screen.findByRole('dialog', { name: /create/i });
    const nameInput = within(createDrawer).getByLabelText('Unit group name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Low voltage electricity');

    await user.click(within(createDrawer).getByRole('button', { name: 'Add Unit' }));

    const searchCallsBeforeCreate = getUnitGroupTablePgroongaSearch.mock.calls.length;
    await user.click(within(createDrawer).getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(createUnitGroup).toHaveBeenCalled();
    });
    const createCall = createUnitGroup.mock.calls.at(-1);
    expect(createCall?.[0]).toBe('generated-unit-group-id');
    const createdUnits = createCall?.[1]?.units?.unit ?? [];
    expect(createdUnits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          '@dataSetInternalID': '0',
          name: 'Unit 1',
          quantitativeReference: true,
        }),
      ]),
    );

    expect(message.success).toHaveBeenCalledWith('Created successfully!');
    await waitFor(() => {
      expect(getUnitGroupTablePgroongaSearch.mock.calls.length).toBeGreaterThan(
        searchCallsBeforeCreate,
      );
    });

    const dataRow = screen.getByText('Heat units').closest('tr') as HTMLElement;
    const editButton = within(dataRow).getByRole('button', { name: /edit/i });
    await user.click(editButton);

    await waitFor(() => {
      expect(getUnitGroupDetail).toHaveBeenCalledWith('unitgroup-search', '1.0');
    });

    const editDrawer = await screen.findByRole('dialog', { name: /edit/i });
    const editInput = within(editDrawer).getByLabelText('Unit group name');
    await user.clear(editInput);
    await user.type(editInput, 'Updated electricity unit group');

    const searchCallsBeforeEdit = getUnitGroupTablePgroongaSearch.mock.calls.length;
    await user.click(within(editDrawer).getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(updateUnitGroup).toHaveBeenCalledWith(
        'unitgroup-search',
        '1.0',
        expect.objectContaining({
          unitGroupName: 'Updated electricity unit group',
          units: expect.objectContaining({
            unit: expect.any(Array),
          }),
        }),
      );
    });

    expect(message.success).toHaveBeenCalledWith('Saved successfully!');
    await waitFor(() => {
      expect(getUnitGroupTablePgroongaSearch.mock.calls.length).toBeGreaterThan(
        searchCallsBeforeEdit,
      );
    });

    const deleteButton = within(dataRow).getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    const deleteModal = await screen.findByRole('dialog', { name: /delete/i });
    const searchCallsBeforeDelete = getUnitGroupTablePgroongaSearch.mock.calls.length;
    await user.click(within(deleteModal).getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(deleteUnitGroup).toHaveBeenCalledWith('unitgroup-search', '1.0');
    });

    expect(message.success).toHaveBeenCalledWith('Selected record has been deleted.');

    await waitFor(() => {
      expect(getUnitGroupTablePgroongaSearch.mock.calls.length).toBeGreaterThan(
        searchCallsBeforeDelete,
      );
    });
  });
});
