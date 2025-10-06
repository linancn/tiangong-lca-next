// @ts-nocheck
/**
 * Manage System workflow integration tests
 * User paths covered:
 * - System admin lands on Manage System, sees the teams overview, and opens member management
 * - System owner manages members (add, promote/demote, remove) with API validation and reloads
 * - Restricted member role observes disabled controls and handles API errors gracefully
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
          <button
            type='button'
            data-testid={`tab-${item.key}`}
            onClick={() => onChange?.(item.key)}
          >
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

  const modalConfirm = jest.fn((config) => {
    return config;
  });

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  const theme = {
    useToken: () => ({ token: { colorPrimary: '#1677ff' } }),
  };

  return {
    __esModule: true,
    Button,
    Flex,
    Modal: Object.assign(ModalComponent, { confirm: modalConfirm }),
    Spin,
    Tabs,
    Tooltip,
    ConfigProvider,
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

jest.mock('@/pages/ManageSystem/Components/AddMemberModal', () => ({
  __esModule: true,
  default: ({ open, onCancel, onSuccess }) =>
    open ? (
      <div data-testid='add-member-modal'>
        <button
          type='button'
          onClick={() => {
            onSuccess?.();
            onCancel?.();
          }}
        >
          Complete Add
        </button>
        <button type='button' onClick={onCancel}>
          Cancel Add
        </button>
      </div>
    ) : null,
}));

jest.mock('@/services/roles/api', () => ({
  getSystemMembersApi: jest.fn(),
  getSystemUserRoleApi: jest.fn(),
  updateRoleApi: jest.fn(),
  delRoleApi: jest.fn(),
  addSystemMemberApi: jest.fn(),
}));

import ManageSystem from '@/pages/ManageSystem';
import {
  delRoleApi,
  getSystemMembersApi,
  getSystemUserRoleApi,
  updateRoleApi,
} from '@/services/roles/api';
import { Modal, message } from 'antd';
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

describe('ManageSystem workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMessages();
    mockGetSystemMembersApi.mockResolvedValue({ data: [], success: true, total: 0 } as any);
    mockUpdateRoleApi.mockResolvedValue({ error: null } as any);
    mockDelRoleApi.mockResolvedValue({ error: null } as any);
  });

  it('loads admin overview and refreshes member list after add success', async () => {
    const members = [
      {
        email: 'member@example.com',
        display_name: 'Member Example',
        role: 'member',
        user_id: 'member-1',
        team_id: 'team-1',
      },
    ];
    mockGetSystemUserRoleApi.mockResolvedValue({ user_id: 'owner-1', role: 'owner' } as any);
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
    });

    fireEvent.click(screen.getByTestId('tab-settings'));

    await reloadMembersTable();

    await waitFor(() => {
      expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByTestId('pro-table-row-member@example.com')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByTestId('add-member-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Complete Add' }));

    await waitFor(() => {
      expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(3);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('add-member-modal')).not.toBeInTheDocument();
    });
  });

  it('allows owners to promote, demote, and remove members', async () => {
    const members = [
      {
        email: 'member@example.com',
        display_name: 'Member Example',
        role: 'member',
        user_id: 'member-1',
        team_id: 'team-1',
      },
      {
        email: 'admin@example.com',
        display_name: 'Admin Example',
        role: 'admin',
        user_id: 'admin-1',
        team_id: 'team-1',
      },
    ];

    mockGetSystemUserRoleApi.mockResolvedValue({ user_id: 'owner-1', role: 'owner' } as any);
    mockGetSystemMembersApi.mockResolvedValue({
      data: members,
      success: true,
      total: members.length,
    } as any);

    renderWithProviders(<ManageSystem />);

    fireEvent.click(screen.getByTestId('tab-settings'));

    await reloadMembersTable();

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
      expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(2);
    });

    const adminRow = screen.getByTestId('pro-table-row-admin@example.com');
    fireEvent.click(within(adminRow).getByRole('button', { name: 'Set Member' }));

    await waitFor(() => {
      expect(mockUpdateRoleApi).toHaveBeenCalledWith('team-1', 'admin-1', 'member');
    });

    await waitFor(() => {
      expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(3);
    });

    await confirmConfig.onOk?.();

    await waitFor(() => {
      expect(mockDelRoleApi).toHaveBeenCalledWith('team-1', 'member-1');
    });

    await waitFor(() => {
      expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(4);
    });

    expect(message.success).toHaveBeenCalled();
  });

  it('disables management controls for basic members', async () => {
    const members = [
      {
        email: 'admin@example.com',
        display_name: 'Admin Example',
        role: 'admin',
        user_id: 'admin-1',
        team_id: 'team-1',
      },
    ];

    mockGetSystemUserRoleApi.mockResolvedValue({ user_id: 'member-1', role: 'member' } as any);
    mockGetSystemMembersApi.mockResolvedValue({
      data: members,
      success: true,
      total: members.length,
    } as any);

    renderWithProviders(<ManageSystem />);

    fireEvent.click(screen.getByTestId('tab-settings'));

    await reloadMembersTable();

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
      {
        email: 'member@example.com',
        display_name: 'Member Example',
        role: 'member',
        user_id: 'member-1',
        team_id: 'team-1',
      },
    ];

    mockGetSystemUserRoleApi.mockResolvedValue({ user_id: 'owner-1', role: 'owner' } as any);
    mockGetSystemMembersApi.mockResolvedValue({
      data: members,
      success: true,
      total: members.length,
    } as any);
    mockUpdateRoleApi.mockResolvedValue({ error: 'failure' } as any);
    mockDelRoleApi.mockResolvedValue({ error: 'failure' } as any);

    renderWithProviders(<ManageSystem />);

    fireEvent.click(screen.getByTestId('tab-settings'));

    await reloadMembersTable();

    await waitFor(() => {
      expect(screen.getByTestId('pro-table-row-member@example.com')).toBeInTheDocument();
    });

    const memberRow = screen.getByTestId('pro-table-row-member@example.com');

    fireEvent.click(within(memberRow).getByRole('button', { name: 'Set Admin' }));

    await waitFor(() => {
      expect(mockUpdateRoleApi).toHaveBeenCalledWith('team-1', 'member-1', 'admin');
    });

    expect(message.error).toHaveBeenCalledWith('Action failed!');
    expect(message.success).not.toHaveBeenCalled();
    expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(1);

    fireEvent.click(within(memberRow).getByRole('button', { name: 'Delete' }));

    const confirmConfig = (Modal.confirm as jest.Mock).mock.calls.at(-1)?.[0];
    await confirmConfig.onOk?.();

    await waitFor(() => {
      expect(mockDelRoleApi).toHaveBeenCalledWith('team-1', 'member-1');
    });

    expect(message.error).toHaveBeenCalledWith('Action failed!');
  });

  it.skip('should handle pagination updates from the members table without manual reloads', () => {
    // TODO: Fix expected behavior once table auto-refresh on page change is implemented
  });
});
