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
  SelectLang,
} from '@/components';
import LCIACacheMonitor from '@/components/LCIACacheMonitor';
import { Link, getIntl, history } from '@umijs/max';

import { getCurrentUser as queryCurrentUser } from '@/services/auth';
import { LOGIN_PATH, isAnonymousAllowedPath } from '@/services/general/publicRoutePolicy';
import { resolveBrowserRuntimeLocale } from '@/services/general/runtimeLocale';
import { getSystemUserRoleApi } from '@/services/roles/api';
import styles from '@/style/custom.less';
import { DashboardOutlined, DatabaseOutlined, LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { ConfigProvider, theme as antdTheme } from 'antd';
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

/**
 * Umi asks this runtime hook for the locale before mounting its providers, so
 * supported aliases are canonicalized before any visible app render.
 */
export const locale = {
  getLocale: resolveBrowserRuntimeLocale,
};

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
}> {
  const fetchUserInfo = async (): Promise<Auth.CurrentUser | null> => {
    try {
      const msg = await queryCurrentUser();
      if (!msg) {
        history.push(LOGIN_PATH);
        return null;
      }
      return {
        ...msg,
        access: await getSystemAccess(),
      };
    } catch (error) {
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

  const { location } = history;
  if (!isAnonymousAllowedPath(location.pathname)) {
    const currentUser = await fetchUserInfo();
    return {
      fetchUserInfo,
      currentUser,
      settings: updatedSettings as Partial<LayoutSettings>,
      isDarkMode,
    };
  }
  return {
    fetchUserInfo,
    settings: updatedSettings as Partial<LayoutSettings>,
    isDarkMode,
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
    actionsRender: () => {
      const publicActions = [
        <DarkMode
          key='DarkMode'
          handleClick={handleClickFunction}
          isDarkMode={initialState?.isDarkMode}
        />,
        <SelectLang key='SelectLang' />,
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

      if (canViewDashboard) {
        actions.splice(
          5,
          0,
          <HeaderActionIcon
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
    avatarProps: initialState?.currentUser
      ? {
          title: <AvatarName />,
          render: () => {
            return (
              <AvatarDropdown>
                <div className='tg-global-header-avatar-trigger'>
                  <AvatarName />
                </div>
              </AvatarDropdown>
            );
          },
        }
      : undefined,
    waterMarkProps: {
      // content: initialState?.currentUser?.name,
    },
    footerRender: () => <Footer />,
    onPageChange: () => {
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
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // 初始渲染兜底：onPageChange 只在路由变化时触发，首次进入需要再判断一次
      if (!initialState?.currentUser && !isAnonymousAllowedPath(history.location.pathname)) {
        history.push(LOGIN_PATH);
        return null;
      }
      // if (initialState?.loading) return <PageLoading />;
      return (
        <ConfigProvider
          theme={{
            cssVar: true,
            token: {
              colorPrimary: initialState?.settings?.colorPrimary,
            },
            algorithm: initialState?.isDarkMode
              ? antdTheme.darkAlgorithm
              : antdTheme.defaultAlgorithm,
          }}
        >
          <>
            {children}
            {isDev && (
              <SettingDrawer
                disableUrlParams
                enableDarkTheme
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
        </ConfigProvider>
      );
    },
    menuDataRender: (menuDataProps) => {
      if (!initialState?.currentUser) {
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
