import { AvatarDropdown, AvatarName, DarkMode, Footer, Question, SelectLang } from '@/components';
import { Link, history } from '@umijs/max';

import { currentUser as queryCurrentUser } from '@/services/ant-design-pro/api';
import styles from '@/style/custom.less';
import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { useIntl } from 'umi';
import { default as defaultSettings } from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';

const isDev = process.env.NODE_ENV === 'development';
const loginPath = '/user/login';

/**
 * @see  https://umijs.org/zh-CN/plugins/plugin-initial-state
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser | null;
  loading?: boolean;
  isDarkMode?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | null>;
}> {
  const fetchUserInfo = async (): Promise<API.CurrentUser | null> => {
    try {
      const msg = queryCurrentUser({
        skipErrorHandler: true,
      });
      return msg;
    } catch (error) {
      history.push(loginPath);
    }
    return null;
  };

  const isDarkMode = localStorage.getItem('isDarkMode') === 'true';
  const updatedSettings = {
    ...defaultSettings,
    navTheme: isDarkMode ? 'realDark' : defaultSettings.navTheme,
    colorPrimary: isDarkMode ? '#9e3ffd' : defaultSettings.colorPrimary,
    logo: isDarkMode ? '/logo_dark.svg' : defaultSettings.logo,
  };

  // 如果不是登录页面，执行
  const { location } = history;
  if (location.pathname !== loginPath) {
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
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { formatMessage } = useIntl();
  const handleClickFunction = () => {
    setInitialState((prevState: any) => {
      const newState = {
        ...prevState,
        isDarkMode: !prevState.isDarkMode,
      };
      localStorage.setItem('isDarkMode', newState.isDarkMode.toString());
      const updatedSettings = {
        ...newState.settings,
        navTheme: newState.isDarkMode ? 'realDark' : 'light',
        colorPrimary: newState.isDarkMode ? '#9e3ffd' : '#5C246A',
        logo: newState.isDarkMode ? '/logo_dark.svg' : defaultSettings.logo,
      };

      return { ...newState, settings: updatedSettings };
    });
  };
  return {
    actionsRender: () => [
      <DarkMode
        key="DarkMode"
        handleClick={handleClickFunction}
        isDarkMode={initialState?.isDarkMode}
      />,
      <SelectLang key="SelectLang" />,
      <Question key="doc" />,
    ],
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: <AvatarName />,
      render: (_, avatarChildren) => {
        return <AvatarDropdown>{avatarChildren}</AvatarDropdown>;
      },
    },
    waterMarkProps: {
      // content: initialState?.currentUser?.name,
    },
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.push(loginPath);
      }
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: isDev
      ? [
          <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
            <LinkOutlined />
            <span>OpenAPI 文档</span>
          </Link>,
        ]
      : [],
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
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
      );
    },
    menuDataRender: (menuDataProps) => {
      const location = history.location;
      const searchParams = new URLSearchParams(location.search);
      const tid = searchParams.get('tid');
      if (tid) {
        const teamMenus = menuDataProps.filter((item) => item.path !== '/mydata');
        return (
          teamMenus?.map((menu) => {
            return {
              ...menu,
              children: menu?.children?.map((item) => {
                return {
                  ...item,
                  path: item.path + '?tid=' + tid,
                };
              }),
            };
          }) ?? []
        );
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
    title: formatMessage({ id: 'pages.name', defaultMessage: 'TianGong LCA Data Platform' }),
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
