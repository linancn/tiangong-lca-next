// @ts-nocheck
import ManageSystemPage from '@/pages/ManageSystem';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const mockDelRoleApi = jest.fn();
const mockGetSystemMembersApi = jest.fn();
const mockGetSystemUserRoleApi = jest.fn();
const mockUpdateRoleApi = jest.fn();

function mockGetManageSystemState() {
  const scopedGlobal = globalThis as typeof globalThis & {
    __manageSystemTestState?: {
      modalConfirm: jest.Mock;
      message: Record<string, jest.Mock>;
    };
  };

  if (!scopedGlobal.__manageSystemTestState) {
    scopedGlobal.__manageSystemTestState = {
      modalConfirm: jest.fn(),
      message: {
        success: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warning: jest.fn(),
        loading: jest.fn(),
      },
    };
  }

  return scopedGlobal.__manageSystemTestState;
}

const mockToText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(mockToText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return mockToText(node.props.children);
  return '';
};

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ id, defaultMessage }: any) => defaultMessage ?? id,
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ id, defaultMessage }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  delRoleApi: (...args: any[]) => mockDelRoleApi(...args),
  getSystemMembersApi: (...args: any[]) => mockGetSystemMembersApi(...args),
  getSystemUserRoleApi: (...args: any[]) => mockGetSystemUserRoleApi(...args),
  updateRoleApi: (...args: any[]) => mockUpdateRoleApi(...args),
}));

jest.mock('@/components/AllTeams', () => ({
  __esModule: true,
  default: ({ tableType, systemUserRole }: any) => (
    <div data-testid='all-teams'>{`${tableType}:${systemUserRole ?? 'none'}`}</div>
  ),
}));

jest.mock('@/pages/ManageSystem/Components/AddMemberModal', () => ({
  __esModule: true,
  default: ({ open, onCancel, onSuccess }: any) =>
    open ? (
      <div data-testid='add-member-modal'>
        <button type='button' onClick={() => onSuccess?.()}>
          modal-success
        </button>
        <button type='button' onClick={() => onCancel?.()}>
          modal-cancel
        </button>
      </div>
    ) : null,
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const PageContainer = ({ title, children }: any) => (
    <section>
      <h1>{mockToText(title)}</h1>
      {children}
    </section>
  );

  const ProTable = ({ actionRef, request, columns, toolBarRender, headerTitle }: any) => {
    const [rows, setRows] = React.useState<any[]>([]);
    const requestRef = React.useRef(request);
    const pageInfoRef = React.useRef({ current: 1, pageSize: 10 });

    requestRef.current = request;

    const reload = React.useCallback(async () => {
      const result = await requestRef.current?.(pageInfoRef.current, {});
      setRows(result?.data ?? []);
      return result;
    }, []);

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = { reload };
      }
      reload();
    }, [actionRef, reload]);

    return (
      <section data-testid='pro-table'>
        <div data-testid='header-title'>{mockToText(headerTitle)}</div>
        <div data-testid='toolbar'>{toolBarRender?.()}</div>
        {rows.map((row) => (
          <div key={row.user_id} data-testid={`row-${row.user_id}`}>
            {columns.map((column: any, index: number) => (
              <div key={index}>
                {column.render
                  ? column.render(row[column.dataIndex], row, index)
                  : row[column.dataIndex]}
              </div>
            ))}
          </div>
        ))}
      </section>
    );
  };

  return {
    __esModule: true,
    PageContainer,
    ProTable,
  };
});

jest.mock('antd', () => {
  const React = require('react');
  const { modalConfirm, message } = mockGetManageSystemState();

  const Button = ({ children, onClick, disabled, 'aria-label': ariaLabel, ...rest }: any) => (
    <button
      type='button'
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onClick?.();
        }
      }}
      {...rest}
    >
      {children}
    </button>
  );

  const Flex = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ children }: any) => <div data-testid='spin'>{children}</div>;

  const Tabs = ({ items = [], activeKey, onChange }: any) => {
    const currentItem = items.find((item: any) => item.key === activeKey) ?? items[0];

    return (
      <div>
        <div>
          {items.map((item: any) => (
            <button key={item.key} type='button' onClick={() => onChange?.(item.key)}>
              {mockToText(item.label)}
            </button>
          ))}
        </div>
        <div data-testid='active-tab'>{currentItem?.children}</div>
      </div>
    );
  };

  const Tooltip = ({ title, children }: any) => {
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        'aria-label': children.props['aria-label'] ?? mockToText(title),
      });
    }
    return <>{children}</>;
  };

  const theme = {
    useToken: () => ({ token: { colorPrimary: '#1677ff' } }),
  };

  return {
    __esModule: true,
    Button,
    Flex,
    Modal: {
      confirm: (config: any) => modalConfirm(config),
    },
    Spin,
    Tabs,
    Tooltip,
    message,
    theme,
  };
});

const memberRows = [
  {
    user_id: 'member-1',
    team_id: 'team-1',
    role: 'member',
    display_name: 'Member User',
    email: 'member@example.com',
  },
  {
    user_id: 'admin-2',
    team_id: 'team-1',
    role: 'admin',
    display_name: 'Admin User',
    email: 'admin@example.com',
  },
  {
    user_id: 'owner-3',
    team_id: 'team-1',
    role: 'owner',
    display_name: 'Owner User',
    email: 'owner@example.com',
  },
];

describe('ManageSystem page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetManageSystemState().modalConfirm.mockImplementation(({ onOk }: any) => onOk?.());
    mockGetSystemMembersApi.mockResolvedValue({
      success: true,
      data: memberRows,
      total: memberRows.length,
    });
    mockUpdateRoleApi.mockResolvedValue({ error: null });
    mockDelRoleApi.mockResolvedValue({ error: null });
  });

  it('loads the teams tab with the authenticated system role', async () => {
    mockGetSystemUserRoleApi.mockResolvedValueOnce({ user_id: 'admin-1', role: 'admin' });

    render(<ManageSystemPage />);

    expect(await screen.findByTestId('all-teams')).toHaveTextContent('manageSystem:admin');
    expect(screen.getByRole('heading', { name: 'menu.manageSystem' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'pages.manageSystem.tabs.teams' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'pages.manageSystem.tabs.members' }),
    ).toBeInTheDocument();
  });

  it('loads member management, opens the add-member modal, and reloads after success', async () => {
    mockGetSystemUserRoleApi.mockResolvedValueOnce({ user_id: 'owner-1', role: 'owner' });

    render(<ManageSystemPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'pages.manageSystem.tabs.members' }));

    await waitFor(() => {
      expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId('header-title')).toHaveTextContent(
      'System Management / Member Management',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByTestId('add-member-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'modal-success' }));

    await waitFor(() => {
      expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(2);
    });
  });

  it('closes the add-member modal without reloading when the user cancels', async () => {
    mockGetSystemUserRoleApi.mockResolvedValueOnce({ user_id: 'owner-1', role: 'owner' });

    render(<ManageSystemPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'pages.manageSystem.tabs.members' }));

    await waitFor(() => {
      expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByTestId('add-member-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'modal-cancel' }));

    await waitFor(() => {
      expect(screen.queryByTestId('add-member-modal')).not.toBeInTheDocument();
    });
    expect(mockGetSystemMembersApi).toHaveBeenCalledTimes(1);
  });

  it('allows owners to promote, demote, and remove members from the member table', async () => {
    mockGetSystemUserRoleApi.mockResolvedValueOnce({ user_id: 'owner-1', role: 'owner' });

    render(<ManageSystemPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'pages.manageSystem.tabs.members' }));

    const memberRow = await screen.findByTestId('row-member-1');
    const adminRow = await screen.findByTestId('row-admin-2');

    fireEvent.click(within(memberRow).getByRole('button', { name: 'Set Admin' }));

    await waitFor(() => {
      expect(mockUpdateRoleApi).toHaveBeenCalledWith('team-1', 'member-1', 'admin');
    });

    fireEvent.click(within(adminRow).getByRole('button', { name: 'Set Member' }));

    await waitFor(() => {
      expect(mockUpdateRoleApi).toHaveBeenCalledWith('team-1', 'admin-2', 'member');
    });

    fireEvent.click(within(memberRow).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockDelRoleApi).toHaveBeenCalledWith('team-1', 'member-1', 'member');
    });
    expect(mockGetManageSystemState().message.success).toHaveBeenCalled();
  });

  it('disables member-management actions for non-admin users', async () => {
    mockGetSystemUserRoleApi.mockResolvedValueOnce({ user_id: 'member-7', role: 'member' });

    render(<ManageSystemPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'pages.manageSystem.tabs.members' }));

    const memberRow = await screen.findByTestId('row-member-1');
    const adminRow = await screen.findByTestId('row-admin-2');

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(within(memberRow).getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(within(memberRow).getByRole('button', { name: 'Set Admin' })).toBeDisabled();
    expect(within(adminRow).getByRole('button', { name: 'Set Member' })).toBeDisabled();
  });

  it('shows an error message when role updates fail', async () => {
    mockGetSystemUserRoleApi.mockResolvedValueOnce({ user_id: 'owner-1', role: 'owner' });
    mockUpdateRoleApi.mockResolvedValueOnce({ error: 'boom' });
    mockDelRoleApi.mockResolvedValueOnce({ error: 'boom' });

    render(<ManageSystemPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'pages.manageSystem.tabs.members' }));

    const memberRow = await screen.findByTestId('row-member-1');

    fireEvent.click(within(memberRow).getByRole('button', { name: 'Set Admin' }));

    await waitFor(() => {
      expect(mockGetManageSystemState().message.error).toHaveBeenCalled();
    });

    fireEvent.click(within(memberRow).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockGetManageSystemState().message.error).toHaveBeenCalledTimes(2);
    });
  });

  it('short-circuits member loading when the authenticated role is missing', async () => {
    mockGetSystemUserRoleApi.mockResolvedValueOnce(null);

    render(<ManageSystemPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'pages.manageSystem.tabs.members' }));

    await waitFor(() => {
      expect(screen.getByTestId('pro-table')).toBeInTheDocument();
    });
    expect(mockGetSystemMembersApi).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('logs member-loading failures and falls back to an empty table', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetSystemUserRoleApi.mockResolvedValueOnce({ user_id: 'owner-1', role: 'owner' });
    mockGetSystemMembersApi.mockRejectedValueOnce(new Error('member load failed'));

    render(<ManageSystemPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'pages.manageSystem.tabs.members' }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    expect(screen.getByTestId('pro-table')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('logs auth-loading failures and keeps rendering the teams tab', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetSystemUserRoleApi.mockRejectedValueOnce(new Error('auth failed'));

    render(<ManageSystemPage />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    expect(screen.getByTestId('all-teams')).toHaveTextContent('manageSystem:none');
    consoleErrorSpy.mockRestore();
  });

  it('logs thrown update and delete failures without crashing the member table', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetSystemUserRoleApi.mockResolvedValueOnce({ user_id: 'owner-1', role: 'owner' });
    mockUpdateRoleApi.mockRejectedValueOnce(new Error('update threw'));
    mockDelRoleApi.mockRejectedValueOnce(new Error('delete threw'));

    render(<ManageSystemPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'pages.manageSystem.tabs.members' }));

    const memberRow = await screen.findByTestId('row-member-1');

    fireEvent.click(within(memberRow).getByRole('button', { name: 'Set Admin' }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(within(memberRow).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });

    consoleErrorSpy.mockRestore();
  });

  it('renders an empty fallback for unknown member roles', async () => {
    mockGetSystemUserRoleApi.mockResolvedValueOnce({ user_id: 'owner-1', role: 'owner' });
    mockGetSystemMembersApi.mockResolvedValueOnce({
      success: true,
      total: 1,
      data: [
        {
          user_id: 'mystery-1',
          team_id: 'team-1',
          role: 'guest',
          display_name: 'Mystery User',
          email: 'mystery@example.com',
        },
      ],
    });

    render(<ManageSystemPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'pages.manageSystem.tabs.members' }));

    const mysteryRow = await screen.findByTestId('row-mystery-1');
    expect(within(mysteryRow).getByText('mystery@example.com')).toBeInTheDocument();
    expect(within(mysteryRow).getByText('Mystery User')).toBeInTheDocument();
  });
});
