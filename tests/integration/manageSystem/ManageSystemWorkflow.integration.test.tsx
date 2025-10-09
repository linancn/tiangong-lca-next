// @ts-nocheck
/**
 * Manage System workflow integration tests
 * User paths covered:
 * - Owner visits Manage System, role is resolved via getSystemUserRoleApi, teams overview renders, tab swap reveals member management fed by getSystemMembersApi
 * - Owner adds a member through AddMemberModal (happy path + failure states) invoking addSystemMemberApi and causes ProTable reload
 * - Owner promotes/demotes/removes members with updateRoleApi/delRoleApi reloads and toast feedback; member-only users observe disabled controls
 * Services touched under test: getSystemUserRoleApi, getSystemMembersApi, addSystemMemberApi, updateRoleApi, delRoleApi
 */

jest.mock('@/components/AllTeams', () => {
  const React = require('react');
  const AllTeamsMock = ({ tableType, systemUserRole }) => (
    <div data-testid='all-teams'>
      all-teams::{tableType}::{systemUserRole ?? 'unknown'}
    </div>
  );
  return {
    __esModule: true,
    default: AllTeamsMock,
  };
});

jest.mock('@ant-design/icons', () => ({
  CrownOutlined: () => <span data-testid='icon-crown' />,
  DeleteOutlined: () => <span data-testid='icon-delete' />,
  PlusOutlined: () => <span data-testid='icon-plus' />,
  UserOutlined: () => <span data-testid='icon-user' />,
}));

jest.mock('@umijs/max', () => ({
  FormattedMessage: ({ defaultMessage, id }) => defaultMessage ?? id,
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }) => defaultMessage ?? id,
  }),
}));

jest.mock('antd', () => {
  const React = require('react');

  const toText = (node) => {
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
      return React.Children.toArray(node.props.children).map(toText).join('');
    }
    return '';
  };

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  const FormContext = React.createContext(null);

  const Form = React.forwardRef(({ children }, ref) => {
    const [values, setValues] = React.useState({});
    const rulesRef = React.useRef({});

    const registerRules = React.useCallback((name, rules = []) => {
      rulesRef.current[name] = rules;
    }, []);

    const setFieldValue = React.useCallback((name, value) => {
      setValues((previous) => ({ ...previous, [name]: value }));
    }, []);

    const resetFields = React.useCallback(() => {
      setValues({});
    }, []);

    const setFieldsValue = React.useCallback((fields = {}) => {
      setValues((previous) => ({ ...previous, ...fields }));
    }, []);

    const validateFields = React.useCallback(async () => {
      const errors = [];
      Object.entries(rulesRef.current).forEach(([field, rules]) => {
        const value = values[field];
        (rules ?? []).forEach((rule) => {
          const messageText = toText(rule.message) || 'Validation failed';
          if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push({ name: [field], errors: [messageText] });
          }
          if (rule.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(value))) {
              errors.push({ name: [field], errors: [messageText] });
            }
          }
        });
      });
      if (errors.length) {
        const error = new Error('Validation failed');
        error.errorFields = errors;
        throw error;
      }
      return values;
    }, [values]);

    React.useImperativeHandle(ref, () => ({
      validateFields,
      resetFields,
      setFieldsValue,
    }));

    const contextValue = React.useMemo(
      () => ({ values, setFieldValue, registerRules }),
      [values, setFieldValue, registerRules],
    );

    return (
      <FormContext.Provider value={contextValue}>
        <form data-testid='form'>{children}</form>
      </FormContext.Provider>
    );
  });
  Form.displayName = 'MockForm';

  const FormItem = ({ name, rules = [], children, label }) => {
    const context = React.useContext(FormContext);

    React.useEffect(() => {
      context?.registerRules?.(name, rules);
    }, [context, name, rules]);

    const value = context?.values?.[name] ?? '';
    const inputId = `${name}-input`;

    const handleChange = (event) => {
      const nextValue = event?.target?.value ?? '';
      context?.setFieldValue?.(name, nextValue);
      if (children?.props?.onChange) {
        children.props.onChange(event);
      }
    };

    const labelText = toText(label);

    return (
      <div data-testid={`form-item-${name}`}>
        {labelText ? <label htmlFor={inputId}>{labelText}</label> : null}
        {React.cloneElement(children, {
          id: inputId,
          name,
          value,
          onChange: handleChange,
        })}
      </div>
    );
  };

  Form.Item = FormItem;

  const Input = React.forwardRef(({ value = '', onChange, ...rest }, ref) => (
    <input ref={ref} value={value} onChange={(event) => onChange?.(event)} {...rest} />
  ));
  Input.displayName = 'MockInput';

  const Button = React.forwardRef((props, ref) => {
    const { children, onClick, disabled, type = 'button', icon, ...rest } = props ?? {};
    return (
      <button
        ref={ref}
        type='button'
        onClick={onClick}
        disabled={disabled}
        data-button-type={type}
        {...rest}
      >
        {icon}
        {children}
      </button>
    );
  });
  Button.displayName = 'MockButton';

  const Tabs = ({ items = [], activeKey, onChange }) => (
    <div data-testid='tabs'>
      {items.map((item) => (
        <div key={item.key}>
          <button type='button' onClick={() => onChange?.(item.key)}>
            {item.label}
          </button>
          {item.key === activeKey ? <div>{item.children}</div> : null}
        </div>
      ))}
    </div>
  );

  const Spin = ({ spinning, children }) => (
    <div data-testid='spin' data-spinning={spinning ? 'true' : 'false'}>
      {children}
    </div>
  );

  const ConfigProvider = ({ children }) => <>{children}</>;

  const Tooltip = ({ title, children }) => {
    const label = toText(title);
    const child = React.Children.only(children);
    return React.cloneElement(child, {
      'aria-label': label,
      title: label,
    });
  };

  const Flex = ({ children }) => <div data-testid='flex'>{children}</div>;

  const ModalComponent = ({ open, onCancel, onOk, children }) =>
    open ? (
      <div data-testid='modal'>
        <div>{children}</div>
        <button type='button' onClick={onCancel}>
          cancel
        </button>
        <button type='button' onClick={onOk}>
          ok
        </button>
      </div>
    ) : null;

  const modalConfirm = jest.fn((config) => config);

  const theme = {
    useToken: () => ({ token: { colorPrimary: '#1677ff' } }),
  };

  return {
    __esModule: true,
    Button,
    ConfigProvider,
    Flex,
    Form,
    Input,
    Modal: Object.assign(ModalComponent, { confirm: modalConfirm }),
    Spin,
    Tabs,
    Tooltip,
    message,
    theme,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({
    request,
    actionRef,
    columns = [],
    rowKey = 'id',
    toolBarRender,
    headerTitle,
  }) => {
    const [rows, setRows] = React.useState([]);
    const paramsRef = React.useRef({ current: 1, pageSize: 10 });
    const requestRef = React.useRef(request);

    const runRequest = React.useCallback(async (override = {}) => {
      paramsRef.current = { ...paramsRef.current, ...override };
      const result = await requestRef.current?.(paramsRef.current, {});
      setRows(result?.data ?? []);
      return result;
    }, []);

    React.useEffect(() => {
      requestRef.current = request;
    }, [request]);

    React.useEffect(() => {
      const handlers = {
        reload: () => runRequest(),
        setPageInfo: (info) => runRequest(info ?? {}),
      };
      if (actionRef) {
        actionRef.current = handlers;
      }
      globalThis.__manageSystemActionRef = handlers;
      return () => {
        if (globalThis.__manageSystemActionRef === handlers) {
          delete globalThis.__manageSystemActionRef;
        }
      };
    }, [actionRef, runRequest]);

    React.useEffect(() => {
      void runRequest();
    }, []);

    const renderContent = (content, keyPrefix) => {
      if (Array.isArray(content)) {
        return content.map((item, index) => (
          <React.Fragment key={`${keyPrefix}-${index}`}>{item}</React.Fragment>
        ));
      }
      return content;
    };

    const header = typeof headerTitle === 'function' ? headerTitle() : headerTitle;
    const toolbar = toolBarRender?.() ?? [];

    return (
      <div data-testid='pro-table'>
        <div data-testid='pro-table-header'>{header}</div>
        <div data-testid='pro-table-toolbar'>
          {(Array.isArray(toolbar) ? toolbar : [toolbar]).map((node, index) => (
            <React.Fragment key={`toolbar-${index}`}>{node}</React.Fragment>
          ))}
        </div>
        {rows.map((row, rowIndex) => {
          const identifier = rowKey && row[rowKey] ? row[rowKey] : rowIndex;
          return (
            <div data-testid={`pro-table-row-${identifier}`} key={`row-${identifier}`}>
              {(columns ?? []).map((column, columnIndex) => {
                const { dataIndex } = column;
                const value = dataIndex ? row[dataIndex] : undefined;
                const rendered = column.render
                  ? column.render(value, row, rowIndex)
                  : (value ?? column.title ?? null);
                return (
                  <div
                    key={`cell-${columnIndex}`}
                    data-testid={`pro-table-cell-${dataIndex ?? columnIndex}-${identifier}`}
                  >
                    {renderContent(rendered, `render-${columnIndex}`)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const PageContainer = ({ title, children }) => (
    <div data-testid='page-container'>
      <div data-testid='page-container-title'>{title}</div>
      <div>{children}</div>
    </div>
  );

  return {
    __esModule: true,
    ProTable,
    PageContainer,
  };
});

jest.mock('@/services/roles/api', () => ({
  getSystemMembersApi: jest.fn(),
  getSystemUserRoleApi: jest.fn(),
  updateRoleApi: jest.fn(),
  delRoleApi: jest.fn(),
  addSystemMemberApi: jest.fn(),
}));

import ManageSystem from '@/pages/ManageSystem';
import {
  addSystemMemberApi,
  delRoleApi,
  getSystemMembersApi,
  getSystemUserRoleApi,
  updateRoleApi,
} from '@/services/roles/api';
import { Modal, message } from 'antd';
import { mockRole, mockUser } from '../../helpers/testData';
import {
  act,
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
  within,
} from '../../helpers/testUtils';

const mockGetSystemUserRoleApi = getSystemUserRoleApi;
const mockGetSystemMembersApi = getSystemMembersApi;
const mockUpdateRoleApi = updateRoleApi;
const mockDelRoleApi = delRoleApi;
const mockAddSystemMemberApi = addSystemMemberApi;

const buildMemberRecord = (overrides = {}) => ({
  email: overrides.email ?? mockUser.email,
  display_name: overrides.display_name ?? mockUser.display_name,
  role: overrides.role ?? mockRole.role,
  user_id: overrides.user_id ?? mockUser.id,
  team_id: overrides.team_id ?? mockRole.team_id,
  ...overrides,
});

const ownerUserData = { user_id: 'owner-1', role: 'owner' };
const memberUserData = { user_id: 'member-1', role: 'member' };

const resetMessages = () => {
  Object.values(message).forEach((fn) => {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      fn.mockClear();
    }
  });
};

const reloadMembersTable = async () => {
  await waitFor(() => {
    expect(globalThis.__manageSystemActionRef?.reload).toBeInstanceOf(Function);
  });
  await act(async () => {
    await globalThis.__manageSystemActionRef.reload();
  });
};

const openMembersTab = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'pages.manageSystem.tabs.members' }));
  await reloadMembersTable();
};

const waitForSystemLoad = async () => {
  await waitFor(() => {
    expect(mockGetSystemUserRoleApi).toHaveBeenCalled();
  });
  await waitFor(() => {
    expect(screen.getByTestId('spin')).toHaveAttribute('data-spinning', 'false');
  });
};

describe('ManageSystem workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMessages();
    mockGetSystemMembersApi.mockResolvedValue({ data: [], success: true, total: 0 } as any);
    mockUpdateRoleApi.mockResolvedValue({ error: null } as any);
    mockDelRoleApi.mockResolvedValue({ error: null } as any);
    mockAddSystemMemberApi.mockResolvedValue({ success: true } as any);
  });

  it('loads owner overview and refreshes member list after successful add', async () => {
    const members = [
      buildMemberRecord({
        email: 'member@example.com',
        display_name: 'Member Example',
        role: 'member',
        user_id: 'member-1',
        team_id: 'team-1',
      }),
    ];
    mockGetSystemUserRoleApi.mockResolvedValue(ownerUserData as any);
    mockGetSystemMembersApi.mockResolvedValue({
      data: members,
      success: true,
      total: members.length,
    } as any);

    renderWithProviders(<ManageSystem />);

    await waitFor(() => {
      expect(mockGetSystemUserRoleApi).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByTestId('all-teams')).toHaveTextContent('all-teams::manageSystem::owner');
      expect(screen.getByTestId('spin')).toHaveAttribute('data-spinning', 'false');
    });

    await openMembersTab();

    await waitFor(() => {
      expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByTestId('pro-table-row-member@example.com')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'new.user@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /ok/i }));

    await waitFor(() => {
      expect(mockAddSystemMemberApi).toHaveBeenCalledWith('new.user@example.com');
    });

    await waitFor(() => {
      expect(message.success).toHaveBeenCalledWith('Member added successfully!');
    });

    await waitFor(() => {
      expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(3);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  it('allows owners to promote, demote, and remove members', async () => {
    const members = [
      buildMemberRecord({
        email: 'member@example.com',
        display_name: 'Member Example',
        role: 'member',
        user_id: 'member-1',
        team_id: 'team-1',
      }),
      buildMemberRecord({
        email: 'admin@example.com',
        display_name: 'Admin Example',
        role: 'admin',
        user_id: 'admin-1',
        team_id: 'team-1',
      }),
    ];

    mockGetSystemUserRoleApi.mockResolvedValue(ownerUserData as any);
    mockGetSystemMembersApi.mockResolvedValue({
      data: members,
      success: true,
      total: members.length,
    } as any);

    renderWithProviders(<ManageSystem />);

    await waitForSystemLoad();
    await openMembersTab();

    await waitFor(() => {
      expect(screen.getByTestId('pro-table-row-member@example.com')).toBeInTheDocument();
    });

    const memberRow = screen.getByTestId('pro-table-row-member@example.com');
    fireEvent.click(within(memberRow).getByRole('button', { name: 'Delete' }));

    expect(Modal.confirm).toHaveBeenCalled();
    const confirmConfig = (Modal.confirm as jest.Mock).mock.calls.at(-1)?.[0];
    expect(confirmConfig).toBeDefined();

    fireEvent.click(within(memberRow).getByRole('button', { name: 'Set Admin' }));

    await waitFor(() => {
      expect(mockUpdateRoleApi).toHaveBeenCalledWith('team-1', 'member-1', 'admin');
    });

    await waitFor(() => {
      expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(3);
    });

    const adminRow = screen.getByTestId('pro-table-row-admin@example.com');
    fireEvent.click(within(adminRow).getByRole('button', { name: 'Set Member' }));

    await waitFor(() => {
      expect(mockUpdateRoleApi).toHaveBeenCalledWith('team-1', 'admin-1', 'member');
    });

    await waitFor(() => {
      expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(4);
    });

    await confirmConfig.onOk?.();

    await waitFor(() => {
      expect(mockDelRoleApi).toHaveBeenCalledWith('team-1', 'member-1');
    });

    await waitFor(() => {
      expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(5);
    });

    expect(message.success).toHaveBeenCalled();
  });

  it('disables management controls for basic members', async () => {
    const members = [
      buildMemberRecord({
        email: 'admin@example.com',
        display_name: 'Admin Example',
        role: 'admin',
        user_id: 'admin-1',
        team_id: 'team-1',
      }),
    ];

    mockGetSystemUserRoleApi.mockResolvedValue(memberUserData as any);
    mockGetSystemMembersApi.mockResolvedValue({
      data: members,
      success: true,
      total: members.length,
    } as any);

    renderWithProviders(<ManageSystem />);

    await waitForSystemLoad();
    await openMembersTab();

    await waitFor(() => {
      expect(screen.getByTestId('pro-table-row-admin@example.com')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();

    const adminRow = screen.getByTestId('pro-table-row-admin@example.com');
    const deleteButton = within(adminRow).getByRole('button', { name: 'Delete' });
    const setAdminButton = within(adminRow).getByRole('button', { name: 'Set Admin' });
    const setMemberButton = within(adminRow).getByRole('button', { name: 'Set Member' });

    expect(deleteButton).toBeDisabled();
    expect(setAdminButton).toBeDisabled();
    expect(setMemberButton).toBeDisabled();
  });

  it('shows error messages when role updates or deletions fail', async () => {
    const members = [
      buildMemberRecord({
        email: 'member@example.com',
        display_name: 'Member Example',
        role: 'member',
        user_id: 'member-1',
        team_id: 'team-1',
      }),
    ];

    mockGetSystemUserRoleApi.mockResolvedValue(ownerUserData as any);
    mockGetSystemMembersApi.mockResolvedValue({
      data: members,
      success: true,
      total: members.length,
    } as any);
    mockUpdateRoleApi.mockResolvedValue({ error: 'failure' } as any);
    mockDelRoleApi.mockResolvedValue({ error: 'failure' } as any);

    renderWithProviders(<ManageSystem />);

    await waitForSystemLoad();
    await openMembersTab();

    await waitFor(() => {
      expect(screen.getByTestId('pro-table-row-member@example.com')).toBeInTheDocument();
    });

    const loadCountAfterOpen = mockGetSystemMembersApi.mock.calls.length;

    const memberRow = screen.getByTestId('pro-table-row-member@example.com');

    fireEvent.click(within(memberRow).getByRole('button', { name: 'Set Admin' }));

    await waitFor(() => {
      expect(mockUpdateRoleApi).toHaveBeenCalledWith('team-1', 'member-1', 'admin');
    });

    expect(message.error).toHaveBeenCalledWith('Action failed!');
    expect(message.success).not.toHaveBeenCalled();
    expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(loadCountAfterOpen);

    fireEvent.click(within(memberRow).getByRole('button', { name: 'Delete' }));

    const confirmConfig = (Modal.confirm as jest.Mock).mock.calls.at(-1)?.[0];
    await confirmConfig.onOk?.();

    await waitFor(() => {
      expect(mockDelRoleApi).toHaveBeenCalledWith('team-1', 'member-1');
    });

    expect(message.error).toHaveBeenCalledWith('Action failed!');
    expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(loadCountAfterOpen + 1);
  });

  it.each([
    ['notRegistered', 'User is not registered!'],
    ['unexpected', 'Failed to add member!'],
  ])(
    'surfaces add member API %s error without closing the modal',
    async (errorCode, expectedMessage) => {
      const members = [
        buildMemberRecord({
          email: 'admin@example.com',
          display_name: 'Admin Example',
          role: 'admin',
          user_id: 'admin-1',
          team_id: 'team-1',
        }),
      ];

      mockGetSystemUserRoleApi.mockResolvedValue(ownerUserData as any);
      mockGetSystemMembersApi.mockResolvedValue({
        data: members,
        success: true,
        total: members.length,
      } as any);
      mockAddSystemMemberApi.mockResolvedValue({ success: false, error: errorCode } as any);

      renderWithProviders(<ManageSystem />);

      await waitForSystemLoad();
      await openMembersTab();

      await waitFor(() => {
        expect(screen.getByTestId('pro-table-row-admin@example.com')).toBeInTheDocument();
      });
      const initialLoadCount = mockGetSystemMembersApi.mock.calls.length;

      fireEvent.click(screen.getByRole('button', { name: 'Add' }));

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'new.member@example.com' },
      });

      fireEvent.click(screen.getByRole('button', { name: /ok/i }));

      await waitFor(() => {
        expect(mockAddSystemMemberApi).toHaveBeenCalledWith('new.member@example.com');
      });

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith(expectedMessage);
      });

      expect(message.success).not.toHaveBeenCalledWith('Member added successfully!');
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(initialLoadCount);
    },
  );

  it.skip('should handle pagination updates from the members table without manual reloads', () => {
    // TODO: Fix expected behavior once table auto-refresh on page change is implemented
  });
});
