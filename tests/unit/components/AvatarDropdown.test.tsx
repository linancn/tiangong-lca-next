/**
 * Tests for AvatarDropdown component
 * Path: src/components/RightContent/AvatarDropdown.tsx
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockHistoryPush: jest.Mock<void, [unknown?]> = jest.fn();
const mockHistoryReplace: jest.Mock<void, [unknown?]> = jest.fn();
const mockUseModel: jest.Mock<any, [string]> = jest.fn();
const mockUseIntl: jest.Mock<
  {
    formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) => string;
  },
  []
> = jest.fn(() => ({
  formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) =>
    defaultMessage ?? id,
}));

const mockModalConfirm = jest.fn();
const mockModalDestroyAll = jest.fn();

const setupModuleMocks = () => {
  jest.doMock(
    'umi',
    () => ({
      __esModule: true,
      FormattedMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) => (
        <span>{defaultMessage ?? id}</span>
      ),
    }),
    { virtual: true },
  );

  jest.doMock('react-dom', () => {
    const actual = jest.requireActual('react-dom');
    return {
      ...actual,
      flushSync: (cb: () => void) => cb(),
    };
  });

  jest.doMock(
    '@ant-design/icons',
    () => ({
      __esModule: true,
      AuditOutlined: () => <span data-testid='icon-audit' />,
      LogoutOutlined: () => <span data-testid='icon-logout' />,
      SettingOutlined: () => <span data-testid='icon-setting' />,
      TeamOutlined: () => <span data-testid='icon-team' />,
      UserOutlined: () => <span data-testid='icon-user' />,
    }),
    { virtual: true },
  );

  jest.doMock('antd', () => {
    const React = require('react');

    const Spin = ({ children }: { children?: React.ReactNode }) => (
      <div role='status' aria-label='Loading user menu'>
        {children}
      </div>
    );

    const Button = ({ children, onClick, style }: any) => (
      <button type='button' style={style} onClick={onClick}>
        {children}
      </button>
    );

    const theme = {
      useToken: () => ({
        token: {
          colorPrimary: '#1677ff',
          colorBgContainer: '#ffffff',
          colorFillSecondary: '#f5f5f5',
          colorBorder: '#d9d9d9',
          colorBorderSecondary: '#eeeeee',
          colorSplit: '#f0f0f0',
          colorSuccessBg: '#f6ffed',
          colorSuccess: '#52c41a',
          colorErrorBg: '#fff2f0',
          colorError: '#ff4d4f',
          colorInfoBg: '#e6f7ff',
          colorInfo: '#1677ff',
          colorSuccessBorder: '#b7eb8f',
          colorWarningBg: '#fffbe6',
          colorWarningBorder: '#ffe58f',
          colorWarning: '#faad14',
        },
      }),
    };

    const ModalComponent = ({ open, title, children, onCancel }: any) => {
      if (!open) {
        return null;
      }

      return (
        <div role='dialog'>
          <div>{title}</div>
          <div>{children}</div>
          <button type='button' onClick={onCancel}>
            Close
          </button>
        </div>
      );
    };

    ModalComponent.confirm = (config: any) => {
      mockModalConfirm(config);
      return { destroy: jest.fn() };
    };

    ModalComponent.destroyAll = (...args: any[]) => mockModalDestroyAll(...args);

    return {
      __esModule: true,
      Button,
      Modal: ModalComponent,
      Spin,
      theme,
    };
  });

  jest.doMock(
    'antd-style',
    () => ({
      __esModule: true,
      createStyles: (createFn: any) => () => ({ styles: createFn({ token: {} }) }),
    }),
    { virtual: true },
  );

  jest.doMock(
    '@/components/AllTeams',
    () => ({
      __esModule: true,
      default: (props: any) => (
        <section aria-label='All Teams table' data-table-type={props.tableType}>
          All Teams
        </section>
      ),
    }),
    { virtual: true },
  );

  jest.doMock(
    '@/components/HeaderDropdown',
    () => ({
      __esModule: true,
      default: function HeaderDropdown({ menu, children }: any) {
        const items =
          menu.items?.filter((item: any) => !item.hidden && item.type !== 'divider') ?? [];
        return (
          <div>
            <div data-testid='header-trigger'>{children}</div>
            <nav aria-label='User menu'>
              {items.map((item: any) => (
                <button
                  key={item.key}
                  type='button'
                  onClick={() => menu.onClick({ key: item.key })}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        );
      },
    }),
    { virtual: true },
  );

  jest.doMock(
    '@/services/auth',
    () => ({
      __esModule: true,
      logout: jest.fn(),
    }),
    { virtual: true },
  );

  jest.doMock(
    '@/services/roles/api',
    () => ({
      __esModule: true,
      getUserRoles: jest.fn(),
      getSystemUserRoleApi: jest.fn(),
    }),
    { virtual: true },
  );
};

setupModuleMocks();

const umiMax = require('@umijs/max') as {
  useIntl?: (...args: any[]) => any;
  useModel?: (...args: any[]) => any;
  history?: { push?: (...args: any[]) => any; replace?: (...args: any[]) => any };
};

umiMax.useIntl = () => mockUseIntl();
umiMax.useModel = (model: string) => mockUseModel(model);
umiMax.history = {
  push: mockHistoryPush,
  replace: mockHistoryReplace,
};

const { AvatarDropdown, AvatarName } =
  require('@/components/RightContent/AvatarDropdown') as typeof import('@/components/RightContent/AvatarDropdown');

const { logout: mockedLogout } = require('@/services/auth') as { logout: jest.Mock };

const { getUserRoles: mockedGetUserRoles, getSystemUserRoleApi: mockedGetSystemUserRoleApi } =
  require('@/services/roles/api') as { getUserRoles: jest.Mock; getSystemUserRoleApi: jest.Mock };

describe('AvatarDropdown', () => {
  beforeEach(() => {
    mockHistoryPush.mockReset();
    mockHistoryReplace.mockReset();
    mockUseModel.mockReset();
    mockUseIntl.mockClear();
    mockModalConfirm.mockReset();
    mockModalDestroyAll.mockReset();

    mockedLogout.mockResolvedValue(undefined);
    mockedGetUserRoles.mockResolvedValue({ data: [{ role: 'member' }] });
    mockedGetSystemUserRoleApi.mockResolvedValue({ role: 'admin' });
    window.history.pushState({}, '', '/');
  });

  it('shows a loading indicator when user information is not ready', async () => {
    const setInitialState = jest.fn();
    mockUseModel.mockImplementation((model: string) => {
      if (model === '@@initialState') {
        return { initialState: undefined, setInitialState };
      }
      return {};
    });

    render(<AvatarDropdown>trigger</AvatarDropdown>);

    expect(screen.getByRole('status', { name: /loading user menu/i })).toBeInTheDocument();
    expect(mockHistoryPush).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockedGetSystemUserRoleApi).toHaveBeenCalled();
    });
  });

  it('updates loading hover state and keeps loading when the current user has no name', async () => {
    const setInitialState = jest.fn();
    mockUseModel.mockImplementation((model: string) => {
      if (model === '@@initialState') {
        return { initialState: { currentUser: {} }, setInitialState };
      }
      return {};
    });

    render(<AvatarDropdown>trigger</AvatarDropdown>);

    const loading = screen.getByRole('status', { name: /loading user menu/i }).parentElement;
    expect(loading).not.toBeNull();

    fireEvent.mouseEnter(loading!);
    fireEvent.mouseLeave(loading!);

    expect(screen.getByRole('status', { name: /loading user menu/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedGetSystemUserRoleApi).toHaveBeenCalled();
    });
  });

  it('renders menu items for privileged users and handles navigation and logout', async () => {
    const setInitialState = jest.fn();
    mockUseModel.mockImplementation((model: string) => {
      if (model === '@@initialState') {
        return { initialState: { currentUser: { name: 'Alice' } }, setInitialState };
      }
      return {};
    });

    const user = userEvent.setup();

    render(<AvatarDropdown>avatar</AvatarDropdown>);

    expect(await screen.findByRole('button', { name: 'Account Profile' })).toBeInTheDocument();
    expect(screen.getByText('avatar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Account Profile' }));
    expect(mockHistoryPush).toHaveBeenCalledWith('/account');

    mockHistoryPush.mockClear();

    await user.click(screen.getByRole('button', { name: 'Team Management' }));

    await waitFor(() => {
      expect(mockedGetUserRoles).toHaveBeenCalled();
    });

    expect(mockHistoryPush).toHaveBeenCalledWith('/team?action=edit');

    mockHistoryPush.mockClear();

    await user.click(screen.getByRole('button', { name: 'System Settings' }));
    expect(mockHistoryPush).toHaveBeenCalledWith('/manageSystem');

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    expect(setInitialState).toHaveBeenCalledWith(expect.any(Function));
    const stateUpdater = setInitialState.mock.calls[0]?.[0];
    expect(stateUpdater({ currentUser: { name: 'Alice' }, extra: true })).toEqual({
      currentUser: undefined,
      extra: true,
    });

    await waitFor(() => {
      expect(mockedLogout).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockHistoryReplace).toHaveBeenCalledWith({
        pathname: '/user/login',
        search: 'redirect=%2F',
      });
    });
  });

  it('shows review navigation when user has review role while hiding system settings', async () => {
    const setInitialState = jest.fn();
    mockUseModel.mockImplementation((model: string) => {
      if (model === '@@initialState') {
        return { initialState: { currentUser: { name: 'Riley' } }, setInitialState };
      }
      return {};
    });

    mockedGetSystemUserRoleApi.mockResolvedValue({ role: 'review-member' });

    const user = userEvent.setup();

    render(<AvatarDropdown>avatar</AvatarDropdown>);

    expect(await screen.findByRole('button', { name: 'Account Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'System Settings' })).not.toBeInTheDocument();

    const reviewButton = await screen.findByRole('button', { name: 'Review Management' });
    await user.click(reviewButton);

    expect(mockHistoryPush).toHaveBeenCalledWith('/review');
  });

  it('opens the team selection modal when the user is not part of a team', async () => {
    const setInitialState = jest.fn();
    mockUseModel.mockImplementation((model: string) => {
      if (model === '@@initialState') {
        return { initialState: { currentUser: { name: 'Bob' } }, setInitialState };
      }
      return {};
    });

    mockedGetUserRoles.mockResolvedValue({ data: [{ role: 'rejected' }] });
    mockedGetSystemUserRoleApi.mockResolvedValue({ role: 'member' });

    const user = userEvent.setup();

    render(<AvatarDropdown>avatar</AvatarDropdown>);

    const teamButton = await screen.findByRole('button', { name: 'Team Management' });
    await user.click(teamButton);

    expect(mockModalConfirm).toHaveBeenCalled();
    const confirmConfig = mockModalConfirm.mock.calls[0]?.[0];
    expect(confirmConfig).toBeTruthy();

    if (confirmConfig?.footer) {
      const { getByRole, unmount } = render(<div>{confirmConfig.footer()}</div>);
      await user.click(getByRole('button', { name: 'Join Team' }));
      unmount();
    }

    await waitFor(() => {
      expect(mockModalDestroyAll).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'All Teams table' })).toBeInTheDocument();
    });
  });

  it('routes to team creation from the no-team modal footer', async () => {
    const setInitialState = jest.fn();
    mockUseModel.mockImplementation((model: string) => {
      if (model === '@@initialState') {
        return { initialState: { currentUser: { name: 'Casey' } }, setInitialState };
      }
      return {};
    });

    mockedGetUserRoles.mockResolvedValue({ data: [{ role: 'rejected' }] });
    mockedGetSystemUserRoleApi.mockResolvedValue({ role: 'member' });

    const user = userEvent.setup();

    render(<AvatarDropdown>avatar</AvatarDropdown>);

    await user.click(await screen.findByRole('button', { name: 'Team Management' }));

    const confirmConfig = mockModalConfirm.mock.calls[0]?.[0];
    expect(confirmConfig).toBeTruthy();

    if (confirmConfig?.footer) {
      const { getByRole, unmount } = render(<div>{confirmConfig.footer()}</div>);
      await user.click(getByRole('button', { name: 'Create Team' }));
      unmount();
    }

    expect(mockModalDestroyAll).toHaveBeenCalled();
    expect(mockHistoryPush).toHaveBeenCalledWith('/team?action=create');
  });

  it('replaces the team page query and reloads when creating a team from the current /team page', async () => {
    const setInitialState = jest.fn();
    mockUseModel.mockImplementation((model: string) => {
      if (model === '@@initialState') {
        return { initialState: { currentUser: { name: 'Casey' } }, setInitialState };
      }
      return {};
    });

    mockedGetUserRoles.mockResolvedValue({ data: [{ role: 'rejected' }] });
    mockedGetSystemUserRoleApi.mockResolvedValue({ role: 'member' });
    window.history.pushState({}, '', '/team?view=detail');
    const reloadSpy = jest.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        reload: reloadSpy,
      },
    });

    const user = userEvent.setup();

    render(<AvatarDropdown>avatar</AvatarDropdown>);

    await user.click(await screen.findByRole('button', { name: 'Team Management' }));

    const confirmConfig = mockModalConfirm.mock.calls[mockModalConfirm.mock.calls.length - 1]?.[0];
    expect(confirmConfig).toBeTruthy();

    if (confirmConfig?.footer) {
      const { getByRole, unmount } = render(<div>{confirmConfig.footer()}</div>);
      await user.click(getByRole('button', { name: 'Create Team' }));
      unmount();
    }

    expect(mockHistoryReplace).toHaveBeenCalledWith({
      pathname: '/team',
      search: 'view=detail&action=create',
    });
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('closes the all-teams modal through the modal onCancel action', async () => {
    const setInitialState = jest.fn();
    mockUseModel.mockImplementation((model: string) => {
      if (model === '@@initialState') {
        return { initialState: { currentUser: { name: 'Bob' } }, setInitialState };
      }
      return {};
    });

    mockedGetUserRoles.mockResolvedValue({ data: [{ role: 'rejected' }] });
    mockedGetSystemUserRoleApi.mockResolvedValue({ role: 'member' });

    const user = userEvent.setup();

    render(<AvatarDropdown>avatar</AvatarDropdown>);

    await user.click(await screen.findByRole('button', { name: 'Team Management' }));

    const confirmConfig = mockModalConfirm.mock.calls[mockModalConfirm.mock.calls.length - 1]?.[0];
    expect(confirmConfig).toBeTruthy();

    if (confirmConfig?.footer) {
      const { getByRole, unmount } = render(<div>{confirmConfig.footer()}</div>);
      await user.click(getByRole('button', { name: 'Join Team' }));
      unmount();
    }

    const modal = await screen.findByRole('dialog');
    await user.click(within(modal).getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'All Teams table' })).not.toBeInTheDocument();
    });
  });

  it('does not replace login history when a redirect query already exists during logout', async () => {
    const setInitialState = jest.fn();
    mockUseModel.mockImplementation((model: string) => {
      if (model === '@@initialState') {
        return { initialState: { currentUser: { name: 'Alice' } }, setInitialState };
      }
      return {};
    });

    window.history.pushState({}, '', '/?redirect=%2Fteam');
    const user = userEvent.setup();

    render(<AvatarDropdown>avatar</AvatarDropdown>);

    await user.click(await screen.findByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(mockedLogout).toHaveBeenCalled();
    });
    expect(mockHistoryReplace).not.toHaveBeenCalled();
  });
});

describe('AvatarName', () => {
  beforeEach(() => {
    mockUseModel.mockReset();
  });

  it('renders the current user name from initial state', () => {
    mockUseModel.mockImplementation((model: string) => {
      if (model === '@@initialState') {
        return { initialState: { currentUser: { name: 'Taylor' } } };
      }
      return {};
    });

    const { container } = render(<AvatarName />);

    expect(screen.getByText('Taylor')).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="icon-user"], .anticon-user, [data-icon="user"]'),
    ).not.toBeNull();
  });

  it('renders without crashing when current user is missing', () => {
    mockUseModel.mockImplementation((model: string) => {
      if (model === '@@initialState') {
        return { initialState: {} };
      }
      return {};
    });

    const { container } = render(<AvatarName />);

    expect(
      container.querySelector('[data-testid="icon-user"], .anticon-user, [data-icon="user"]'),
    ).not.toBeNull();
    expect(screen.queryByText('Taylor')).not.toBeInTheDocument();
  });

  it('renders without crashing when initial state is undefined', () => {
    mockUseModel.mockImplementation((model: string) => {
      if (model === '@@initialState') {
        return { initialState: undefined };
      }
      return {};
    });

    const { container } = render(<AvatarName />);

    expect(
      container.querySelector('[data-testid="icon-user"], .anticon-user, [data-icon="user"]'),
    ).not.toBeNull();
    expect(screen.queryByText('Taylor')).not.toBeInTheDocument();
  });
});
