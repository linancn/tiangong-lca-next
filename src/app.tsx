import {
  AvatarDropdown,
  AvatarName,
  DarkMode,
  ExportTidasPackage,
  Footer,
  HeaderActionIcon,
  ImportTidasPackage,
  LcaTaskCenter,
  Notification,
  Question,
  SelectLangAction,
} from '@/components';
import AccessDenied from '@/components/AccessDenied';
import { renderAccessibleCollapsedButton } from '@/components/AccessibleCollapsedButton';
import AccessibleSettingDrawer from '@/components/AccessibleSettingDrawer';
import LCIACacheMonitor from '@/components/LCIACacheMonitor';
import SystemMaintenance from '@/components/SystemMaintenance';
import {
  AppBootMarker,
  StaticFallbackErrorBoundary,
} from '@/components/SystemMaintenance/AppBootBoundary';
import { Link, getIntl, history } from '@umijs/max';

import { getCurrentUser as queryCurrentUser } from '@/services/auth';
import { LOGIN_PATH, isAnonymousAllowedPath } from '@/services/general/publicRoutePolicy';
import { resolveBrowserRuntimeLocale } from '@/services/general/runtimeLocale';
import {
  getSystemStatus,
  isSystemMaintenanceActive,
  type SystemStatus,
} from '@/services/general/systemStatus';
import { getSystemUserRoleApi } from '@/services/roles/api';
import { bindTidasPackageTaskCenterOwner } from '@/services/tidasPackage/taskCenter';
import styles from '@/style/custom.less';
import { AntdAppApiRegistrar } from '@/contexts/AntdAppContext';
import { AntdThemeSync, createAntdThemeConfig } from '@/contexts/AntdThemeSync';
import { DashboardOutlined, DatabaseOutlined, LinkOutlined, MenuOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import type { RunTimeLayoutConfig, RuntimeAntdConfig } from '@umijs/max';
import type { ReactNode } from 'react';
import { getBrandTheme } from '../config/branding';
import defaultSettings, { defaultAppTitle, getLocalizedAppTitle } from '../config/defaultSettings';
import ClassificationCacheMonitor from './components/ClassificationCacheMonitor';
import LocationCacheMonitor from './components/LocationCacheMonitor';
import { errorConfig } from './requestErrorConfig';

const isDev = process.env.NODE_ENV === 'development';
const dashboardPath = '/dashboard/national-carbon';
const dataProcessingPath = '/data-processing';
const systemAccessByRole = new Map<string, Auth.CurrentUser['access']>([
  ['admin', 'admin'],
  ['owner', 'admin'],
  ['data_product_manager', 'data_product_manager'],
]);

export const antd: RuntimeAntdConfig = (memo) => {
  const isDarkMode = localStorage.getItem('isDarkMode') === 'true';
  const brandTheme = getBrandTheme(isDarkMode);
  return {
    ...memo,
    theme: {
      ...memo.theme,
      ...createAntdThemeConfig(isDarkMode, brandTheme.colorPrimary),
      token: {
        ...memo.theme?.token,
        colorPrimary: brandTheme.colorPrimary,
      },
      components: {
        ...memo.theme?.components,
        Divider: {
          ...memo.theme?.components?.Divider,
          orientationMargin: 0,
        },
      },
    },
  };
};

/**
 * Umi asks this runtime hook for the locale before mounting its providers, so
 * supported aliases are canonicalized before any visible app render.
 */
export const locale = {
  getLocale: resolveBrowserRuntimeLocale,
};

/**
 * Wraps every Umi route, including routes that opt out of ProLayout with
 * `layout: false`, in the shared boot-success and render-failure boundary.
 */
export function rootContainer(container: ReactNode) {
  return (
    <StaticFallbackErrorBoundary>
      <AppBootMarker>{container}</AppBootMarker>
    </StaticFallbackErrorBoundary>
  );
}

/**
 * Umi applies the Ant Design plugin's inner provider after this hook, placing
 * the registrar inside the one global `<App>` for every route shape.
 */
export function innerProvider(container: ReactNode) {
  return <AntdAppApiRegistrar>{container}</AntdAppApiRegistrar>;
}

async function getSystemAccess(): Promise<Auth.CurrentUser['access'] | undefined> {
  try {
    const systemUserRole = await getSystemUserRoleApi();
    return systemAccessByRole.get(systemUserRole?.role ?? '');
  } catch {
    return undefined;
  }
}

/**
 * @see  https://umijs.org/zh-CN/plugins/plugin-initial-state
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: Auth.CurrentUser | null;
  loading?: boolean;
  isDarkMode?: boolean;
  fetchUserInfo?: () => Promise<Auth.CurrentUser | null>;
  systemStatus?: SystemStatus;
}> {
  const fetchUserInfo = async (): Promise<Auth.CurrentUser | null> => {
    try {
      const msg = await queryCurrentUser();
      if (!msg) {
        bindTidasPackageTaskCenterOwner(null);
        history.push(LOGIN_PATH);
        return null;
      }
      bindTidasPackageTaskCenterOwner(msg.userid);
      return {
        ...msg,
        access: await getSystemAccess(),
      };
    } catch (error) {
      bindTidasPackageTaskCenterOwner(null);
      history.push(LOGIN_PATH);
    }
    return null;
  };

  const isDarkMode = localStorage.getItem('isDarkMode') === 'true';
  const brandTheme = getBrandTheme(isDarkMode);
  const updatedSettings = {
    ...defaultSettings,
    ...brandTheme,
  };

  // Maintenance is intentionally checked before authentication. This is a
  // single startup read; a browser refresh is required to check it again.
  const systemStatus = await getSystemStatus();
  if (isSystemMaintenanceActive(systemStatus)) {
    bindTidasPackageTaskCenterOwner(null);
    return {
      fetchUserInfo,
      settings: updatedSettings as Partial<LayoutSettings>,
      isDarkMode,
      systemStatus,
    };
  }

  const { location } = history;
  if (!isAnonymousAllowedPath(location.pathname)) {
    const currentUser = await fetchUserInfo();
    return {
      fetchUserInfo,
      currentUser,
      settings: updatedSettings as Partial<LayoutSettings>,
      isDarkMode,
      systemStatus,
    };
  }
  bindTidasPackageTaskCenterOwner(null);
  return {
    fetchUserInfo,
    settings: updatedSettings as Partial<LayoutSettings>,
    isDarkMode,
    systemStatus,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => {
  const { formatMessage, locale } = getIntl();
  const appTitle =
    getLocalizedAppTitle(locale) ??
    formatMessage({ id: 'pages.name', defaultMessage: defaultAppTitle });
  const canViewDashboard = initialState?.currentUser?.access === 'admin';
  const canViewDataProcessing = initialState?.currentUser?.access === 'data_product_manager';
  const maintenanceActive = isSystemMaintenanceActive(initialState?.systemStatus);
  const handleClickFunction = () => {
    setInitialState((prevState: any) => {
      const newState = {
        ...prevState,
        isDarkMode: !prevState.isDarkMode,
      };
      localStorage.setItem('isDarkMode', newState.isDarkMode.toString());
      const brandTheme = getBrandTheme(newState.isDarkMode);
      const updatedSettings = {
        ...newState.settings,
        ...brandTheme,
      };

      return { ...newState, settings: updatedSettings };
    });
  };
  return {
    actionsRender: (headerProps = {}) => {
      if (maintenanceActive) {
        return [];
      }
      const publicActions = [
        <DarkMode
          key='DarkMode'
          handleClick={handleClickFunction}
          isDarkMode={initialState?.isDarkMode}
        />,
        <SelectLangAction key='SelectLang' />,
        <Question key='doc' />,
      ];
      if (!initialState?.currentUser) {
        return publicActions;
      }

      const actions = [
        <LCIACacheMonitor key='LCIACacheMonitor' />,
        <ClassificationCacheMonitor key='ClassificationCacheMonitor' />,
        <LocationCacheMonitor key='LocaltionCacheMonitor' />,
        <ImportTidasPackage key='ImportTidasPackage' />,
        <ExportTidasPackage key='ExportTidasPackage' />,
        <LcaTaskCenter key='LcaTaskCenter' />,
        <Notification key='Notification' />,
        ...publicActions,
      ];

      if (headerProps.isMobile) {
        actions.unshift(
          <button
            aria-label={formatMessage({
              id: 'app.setting.navigationmode',
              defaultMessage: 'Navigation Mode',
            })}
            className='tg-pro-layout-mobile-menu-action'
            key='mobile-navigation'
            type='button'
            onClick={(event) => {
              const nativeTrigger = event.currentTarget
                .closest('[data-testid="pro-layout-global-header"]')
                ?.querySelector<HTMLElement>('.ant-pro-global-header-collapsed-button');
              if (nativeTrigger) {
                nativeTrigger.click();
                return;
              }
              headerProps.onCollapse?.(!headerProps.collapsed);
            }}
          >
            <MenuOutlined aria-hidden />
          </button>,
        );
      }

      if (canViewDashboard) {
        actions.splice(
          5,
          0,
          <HeaderActionIcon
            aria-label={formatMessage({
              id: 'menu.dashboard.nationalCarbon',
              defaultMessage: 'Data Dashboard',
            })}
            key='NationalCarbonDashboard'
            icon={<DashboardOutlined />}
            onClick={() => history.push(dashboardPath)}
            title={formatMessage({
              id: 'menu.dashboard.nationalCarbon',
              defaultMessage: 'Data Dashboard',
            })}
          />,
        );
      }

      if (canViewDataProcessing) {
        actions.splice(
          5,
          0,
          <HeaderActionIcon
            aria-label={formatMessage({
              id: 'menu.dataProcessing',
              defaultMessage: 'Data Processing',
            })}
            key='DataProcessing'
            icon={<DatabaseOutlined />}
            onClick={() => history.push(dataProcessingPath)}
            title={formatMessage({
              id: 'menu.dataProcessing',
              defaultMessage: 'Data Processing',
            })}
          />,
        );
      }

      return actions;
    },
    avatarProps:
      !maintenanceActive && initialState?.currentUser
        ? {
            title: <AvatarName />,
            render: () => {
              return (
                <AvatarDropdown>
                  <button
                    aria-haspopup='menu'
                    aria-label={formatMessage({
                      id: 'menu.account.center',
                      defaultMessage: 'Account Center',
                    })}
                    className='tg-global-header-avatar-trigger'
                    data-testid='docs-capture-authenticated'
                    type='button'
                  >
                    <AvatarName />
                  </button>
                </AvatarDropdown>
              );
            },
          }
        : undefined,
    footerRender: maintenanceActive ? undefined : () => <Footer />,
    onPageChange: () => {
      if (maintenanceActive) {
        return;
      }
      const { location } = history;
      // Only the login and account-recovery flow can render anonymously.
      if (!initialState?.currentUser && !isAnonymousAllowedPath(location.pathname)) {
        history.push(LOGIN_PATH);
      }
    },
    links: isDev
      ? [
          <Link key='openapi' to='/umi/plugin/openapi' target='_blank'>
            <LinkOutlined />
            <span>
              {formatMessage({
                id: 'component.globalHeader.openapiDocumentation',
                defaultMessage: 'OpenAPI documentation',
              })}
            </span>
          </Link>,
        ]
      : [],
    menuHeaderRender: undefined,
    // Route-level access checks must use the same catalog-backed boundary as page-level checks.
    unAccessible: <AccessDenied />,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      const renderedChildren = maintenanceActive ? (
        <SystemMaintenance status={initialState!.systemStatus!} />
      ) : (
        children
      );
      // 初始渲染兜底：onPageChange 只在路由变化时触发，首次进入需要再判断一次
      if (
        !maintenanceActive &&
        !initialState?.currentUser &&
        !isAnonymousAllowedPath(history.location.pathname)
      ) {
        history.push(LOGIN_PATH);
        return null;
      }
      // if (initialState?.loading) return <PageLoading />;
      return (
        <>
          <AntdThemeSync
            colorPrimary={initialState?.settings?.colorPrimary}
            isDarkMode={Boolean(initialState?.isDarkMode)}
          />
          {renderedChildren}
          {isDev && !maintenanceActive && (
            <AccessibleSettingDrawer
              closeLabel={`${formatMessage({ id: 'app.settings.close', defaultMessage: 'Close' })} ${formatMessage({ id: 'app.setting.pagestyle', defaultMessage: 'Page style setting' })}`}
              disableUrlParams
              enableDarkTheme
              openLabel={`${formatMessage({ id: 'app.settings.open', defaultMessage: 'Open' })} ${formatMessage({ id: 'app.setting.pagestyle', defaultMessage: 'Page style setting' })}`}
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState: any) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )}
        </>
      );
    },
    menuDataRender: (menuDataProps) => {
      if (maintenanceActive || !initialState?.currentUser) {
        return [];
      }
      const location = history.location;
      const searchParams = new URLSearchParams(location.search);
      const tid = searchParams.get('tid');
      if (tid) {
        const teamMenus = menuDataProps.filter(
          (item) => item.path === '/tgdata' || item.path === '/codata',
        );
        return teamMenus.map((menu) => {
          return {
            ...menu,
            children: menu?.children?.map((item) => {
              return {
                ...item,
                path: item.path + '?tid=' + tid,
              };
            }),
          };
        });
      } else {
        return menuDataProps;
      }
    },
    menuItemRender: (menuItemProps, defaultDom) => {
      if (menuItemProps.isUrl || !menuItemProps.path) {
        return defaultDom;
      }
      return (
        <Link to={menuItemProps.path}>
          {/* {menuItemProps.pro_layout_parentKeys &&
            menuItemProps.pro_layout_parentKeys.length > 0 && (
              <span className={styles.menu_icon_margin}>{menuItemProps.icon}</span>
            )} */}
          <span className={styles.menu_icon_margin}>{menuItemProps.icon}</span>
          <span>{menuItemProps.name}</span>
        </Link>
      );
    },
    ...initialState?.settings,
    collapsedButtonRender: (_, defaultDom) =>
      renderAccessibleCollapsedButton(
        formatMessage({
          id: 'app.setting.navigationmode',
          defaultMessage: 'Navigation Mode',
        }),
        defaultDom,
      ),
    title: appTitle,
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request = {
  ...errorConfig,
};
