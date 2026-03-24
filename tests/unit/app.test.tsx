// @ts-nocheck
import { fireEvent, render, screen } from '@testing-library/react';

const mockQueryCurrentUser = jest.fn();
const mockGetLocalizedAppTitle = jest.fn(() => 'Localized TianGong');
const mockHistory = {
  location: {
    pathname: '/tgdata',
    search: '',
  },
  push: jest.fn(),
};
const mockGetIntl = jest.fn(() => ({
  locale: 'en-US',
  formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@/components', () => ({
  __esModule: true,
  AvatarDropdown: ({ children }: any) => <div data-testid='avatar-dropdown'>{children}</div>,
  AvatarName: () => <span data-testid='avatar-name'>Avatar Name</span>,
  DarkMode: 'dark-mode',
  ExportTidasPackage: 'export-tidas-package',
  Footer: () => <div data-testid='footer'>Footer</div>,
  ImportTidasPackage: 'import-tidas-package',
  LcaTaskCenter: 'lca-task-center',
  Notification: 'notification-center',
  Question: 'question-link',
  SelectLang: 'select-lang',
}));

jest.mock('@/components/LCIACacheMonitor', () => ({
  __esModule: true,
  default: 'lcia-cache-monitor',
}));

jest.mock('@/components/ClassificationCacheMonitor', () => ({
  __esModule: true,
  default: 'classification-cache-monitor',
}));

jest.mock('@/components/LocationCacheMonitor', () => ({
  __esModule: true,
  default: 'location-cache-monitor',
}));

jest.mock('@/components/TidasPackageActions', () => ({
  __esModule: true,
  default: 'tidas-package-actions',
}));

jest.mock('@/services/auth', () => ({
  __esModule: true,
  getCurrentUser: (...args: any[]) => mockQueryCurrentUser(...args),
}));

jest.mock('../../config/defaultSettings', () => ({
  __esModule: true,
  default: {
    navTheme: 'light',
    colorPrimary: '#1677ff',
  },
  defaultAppTitle: 'Tiangong LCA',
  getLocalizedAppTitle: (...args: any[]) => mockGetLocalizedAppTitle(...args),
}));

jest.mock('@/requestErrorConfig', () => ({
  __esModule: true,
  errorConfig: {
    errorConfig: {
      errorHandler: jest.fn(),
    },
  },
}));

jest.mock('@umijs/max', () => ({
  __esModule: true,
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  getIntl: () => mockGetIntl(),
  history: mockHistory,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  LinkOutlined: () => <span data-testid='link-icon'>link-icon</span>,
}));

jest.mock('antd', () => ({
  __esModule: true,
  ConfigProvider: ({ children, theme }: any) => (
    <div
      data-testid='config-provider'
      data-css-var={String(theme?.cssVar)}
      data-color-primary={theme?.token?.colorPrimary ?? ''}
      data-algorithm={theme?.algorithm ?? ''}
    >
      {children}
    </div>
  ),
  theme: {
    darkAlgorithm: 'dark-algorithm',
    defaultAlgorithm: 'default-algorithm',
  },
}));

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
  SettingDrawer: ({ settings, onSettingChange }: any) => (
    <button
      type='button'
      data-testid='setting-drawer'
      onClick={() => onSettingChange?.({ navTheme: 'dark' })}
    >
      {JSON.stringify(settings)}
    </button>
  ),
}));

describe('app runtime config', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    window.localStorage.clear();
    window.localStorage.setItem('isDarkMode', 'false');
    mockHistory.location.pathname = '/tgdata';
    mockHistory.location.search = '';
    mockQueryCurrentUser.mockResolvedValue({ name: 'Current User', access: 'admin' });
    mockGetLocalizedAppTitle.mockReturnValue('Localized TianGong');
  });

  it('getInitialState returns current user and merged settings on protected routes', async () => {
    const { getInitialState } = require('@/app');
    window.localStorage.setItem('isDarkMode', 'true');

    const state = await getInitialState();

    expect(mockQueryCurrentUser).toHaveBeenCalledTimes(1);
    expect(state.currentUser).toEqual({ name: 'Current User', access: 'admin' });
    expect(state.isDarkMode).toBe(true);
    expect(state.settings).toMatchObject({
      navTheme: 'realDark',
      colorPrimary: '#9e3ffd',
      logo: '/logo_dark.svg',
    });
  });

  it('getInitialState redirects to login when fetching the current user fails', async () => {
    const { getInitialState } = require('@/app');
    mockQueryCurrentUser.mockRejectedValueOnce(new Error('unauthorized'));

    const state = await getInitialState();

    expect(mockHistory.push).toHaveBeenCalledWith('/user/login');
    expect(state.currentUser).toBeNull();
  });

  it('getInitialState redirects to login when the current user lookup returns null', async () => {
    const { getInitialState } = require('@/app');
    mockQueryCurrentUser.mockResolvedValueOnce(null);

    const state = await getInitialState();

    expect(mockHistory.push).toHaveBeenCalledWith('/user/login');
    expect(state.currentUser).toBeNull();
  });

  it('getInitialState skips user loading on login routes', async () => {
    const { getInitialState } = require('@/app');
    mockHistory.location.pathname = '/user/login';

    const state = await getInitialState();

    expect(mockQueryCurrentUser).not.toHaveBeenCalled();
    expect(state.currentUser).toBeUndefined();
    expect(typeof state.fetchUserInfo).toBe('function');
  });

  it('layout redirects on page change, transforms menu data, and wraps menu items with links', () => {
    const { layout } = require('@/app');
    const setInitialState = jest.fn();
    mockHistory.location.pathname = '/tgdata';
    mockHistory.location.search = '?tid=team-1';

    const runtimeLayout = layout({
      initialState: {
        currentUser: undefined,
        isDarkMode: false,
        settings: { navTheme: 'light' },
      },
      setInitialState,
    });

    expect(runtimeLayout.title).toBe('Localized TianGong');
    runtimeLayout.onPageChange?.();
    expect(mockHistory.push).toHaveBeenCalledWith('/user/login');

    const transformedMenu = runtimeLayout.menuDataRender?.([
      {
        path: '/tgdata',
        children: [{ path: '/tgdata/processes' }],
      },
      {
        path: '/codata',
        children: [{ path: '/codata/flows' }],
      },
      {
        path: '/mydata',
        children: [{ path: '/mydata/contacts' }],
      },
    ]);

    expect(transformedMenu).toEqual([
      {
        path: '/tgdata',
        children: [{ path: '/tgdata/processes?tid=team-1' }],
      },
      {
        path: '/codata',
        children: [{ path: '/codata/flows?tid=team-1' }],
      },
    ]);

    expect(
      runtimeLayout.menuDataRender?.([
        {
          path: '/tgdata',
        },
      ]),
    ).toEqual([
      {
        path: '/tgdata',
        children: undefined,
      },
    ]);

    expect(
      runtimeLayout.menuDataRender?.([
        {
          path: '/mydata',
          children: [{ path: '/mydata/contacts' }],
        },
      ]),
    ).toEqual([]);

    mockHistory.location.search = '';
    const originalMenu = [{ path: '/mydata', children: [{ path: '/mydata/contacts' }] }];
    expect(runtimeLayout.menuDataRender?.(originalMenu)).toEqual(originalMenu);

    const renderedMenuItem = runtimeLayout.menuItemRender?.(
      { path: '/team', icon: <span>icon</span>, name: 'Team' },
      <span>fallback</span>,
    );

    expect(renderedMenuItem.props.to).toBe('/team');
    expect(renderedMenuItem.props.children[1].props.children).toBe('Team');
    expect(
      runtimeLayout.menuItemRender?.({ isUrl: true }, <span>fallback</span>)?.props.children,
    ).toBe('fallback');
  });

  it('falls back to the default formatted app title when no localized title is available', () => {
    mockGetLocalizedAppTitle.mockReturnValueOnce(undefined);
    const { layout } = require('@/app');
    const setInitialState = jest.fn();

    const runtimeLayout = layout({
      initialState: {
        currentUser: { name: 'Alice' },
        isDarkMode: false,
        settings: { navTheme: 'light' },
      },
      setInitialState,
    });

    expect(runtimeLayout.title).toBe('Tiangong LCA');
  });

  it('layout exposes action items, toggles dark mode, and guards children rendering', () => {
    const { layout } = require('@/app');
    const setInitialState = jest.fn();
    mockHistory.location.pathname = '/review';
    mockHistory.location.search = '';

    const runtimeLayout = layout({
      initialState: {
        currentUser: { name: 'Alice' },
        isDarkMode: false,
        settings: { navTheme: 'light', colorPrimary: '#0C246A' },
      },
      setInitialState,
    });

    const actions = runtimeLayout.actionsRender?.();
    expect(actions).toHaveLength(10);
    expect(actions[0].type).toBe('lcia-cache-monitor');
    expect(actions[1].type).toBe('classification-cache-monitor');
    expect(actions[2].type).toBe('location-cache-monitor');
    expect(actions[3].type).toBe('import-tidas-package');
    expect(actions[4].type).toBe('export-tidas-package');
    expect(actions[5].type).toBe('lca-task-center');
    expect(actions[6].type).toBe('notification-center');
    expect(actions[7].type).toBe('dark-mode');
    expect(actions[8].type).toBe('select-lang');
    expect(actions[9].type).toBe('question-link');

    actions[7].props.handleClick();
    expect(setInitialState).toHaveBeenCalledTimes(1);
    const updater = setInitialState.mock.calls[0][0];
    const nextState = updater({
      isDarkMode: false,
      settings: { navTheme: 'light' },
    });
    expect(nextState.isDarkMode).toBe(true);
    expect(nextState.settings).toMatchObject({
      navTheme: 'realDark',
      colorPrimary: '#9e3ffd',
      logo: '/logo_dark.svg',
    });
    expect(window.localStorage.getItem('isDarkMode')).toBe('true');

    expect(runtimeLayout.avatarProps?.title.type()).toEqual(
      <span data-testid='avatar-name'>Avatar Name</span>,
    );
    expect(runtimeLayout.avatarProps?.render?.().props.children.type).toBe('div');
    expect(runtimeLayout.footerRender?.().type()).toEqual(<div data-testid='footer'>Footer</div>);
    expect(runtimeLayout.bgLayoutImgList).toBeUndefined();

    const children = runtimeLayout.childrenRender?.(<div data-testid='child'>child</div>);
    render(children);
    expect(screen.getByTestId('config-provider')).toHaveAttribute('data-css-var', 'true');
    expect(screen.getByTestId('config-provider')).toHaveAttribute('data-color-primary', '#0C246A');
    expect(screen.getByTestId('config-provider')).toHaveAttribute(
      'data-algorithm',
      'default-algorithm',
    );
    expect(screen.getByTestId('child')).toHaveTextContent('child');

    mockHistory.location.pathname = '/processes';
    const guardedLayout = layout({
      initialState: {
        currentUser: undefined,
        isDarkMode: false,
        settings: { navTheme: 'light' },
      },
      setInitialState,
    });
    expect(guardedLayout.childrenRender?.(<div>child</div>)).toBeNull();
    expect(mockHistory.push).toHaveBeenCalledWith('/user/login');
  });

  it('uses the dark theme algorithm when dark mode is enabled', () => {
    const { layout } = require('@/app');
    const setInitialState = jest.fn();
    mockHistory.location.pathname = '/review';

    const runtimeLayout = layout({
      initialState: {
        currentUser: { name: 'Alice' },
        isDarkMode: true,
        settings: { navTheme: 'realDark', colorPrimary: '#9e3ffd' },
      },
      setInitialState,
    });

    render(runtimeLayout.childrenRender?.(<div data-testid='child'>child</div>));

    expect(screen.getByTestId('config-provider')).toHaveAttribute(
      'data-algorithm',
      'dark-algorithm',
    );
  });

  it('renders the development setting drawer and applies settings changes', () => {
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { layout } = require('@/app');
    const setInitialState = jest.fn();

    const runtimeLayout = layout({
      initialState: {
        currentUser: { name: 'Alice' },
        isDarkMode: false,
        settings: { navTheme: 'light' },
      },
      setInitialState,
    });

    const rendered = runtimeLayout.childrenRender?.(<div data-testid='child'>child</div>);
    render(rendered);

    fireEvent.click(screen.getByTestId('setting-drawer'));

    expect(setInitialState).toHaveBeenCalledWith(expect.any(Function));
    const updater = setInitialState.mock.calls[0][0];
    expect(updater({ currentUser: { name: 'Alice' } })).toEqual({
      currentUser: { name: 'Alice' },
      settings: { navTheme: 'dark' },
    });

    process.env.NODE_ENV = previousEnv;
  });
});
