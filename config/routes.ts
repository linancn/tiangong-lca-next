/**
 * @name umi 的路由配置
 * @description 只支持 path,component,routes,redirect,wrappers,name,icon 的配置
 * @param path  path 只支持两种占位符配置，第一种是动态参数 :id 的形式，第二种是 * 通配符，通配符只能出现路由字符串的最后。
 * @param component 配置 location 和 path 匹配后用于渲染的 React 组件路径。可以是绝对路径，也可以是相对路径，如果是相对路径，会从 src/pages 开始找起。
 * @param routes 配置子路由，通常在需要为多个路径增加 layout 组件时使用。
 * @param redirect 配置路由跳转
 * @param wrappers 配置路由组件的包装组件，通过包装组件可以为当前的路由组件组合进更多的功能。 比如，可以用于路由级别的权限校验
 * @param name 配置路由的标题，默认读取国际化文件 menu.ts 中 menu.xxxx 的值，如配置 name 为 login，则读取 menu.ts 中 menu.login 的取值作为标题
 * @param icon 配置路由的图标，取值参考 https://ant.design/components/icon-cn， 注意去除风格后缀和大小写，如想要配置图标为 <StepBackwardOutlined /> 则取值应为 stepBackward 或 StepBackward，如想要配置图标为 <UserOutlined /> 则取值应为 user 或者 User
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  {
    path: '/mydata',
    name: 'mydata',
    icon: 'HomeOutlined',
    routes: [
      {
        path: '/mydata',
        redirect: '/mydata/products',
      },
      {
        name: 'products',
        path: '/mydata/products',
        icon: 'AppstoreAddOutlined',
        component: './Products',
      },
      {
        name: 'processes',
        icon: 'ShareAltOutlined',
        path: '/mydata/processes',
        component: './Processes',
      },
      {
        name: 'flows',
        icon: 'NodeExpandOutlined',
        path: '/mydata/flows',
        component: './Flows',
      },
      {
        name: 'flowproperties',
        icon: 'ControlOutlined',
        path: '/mydata/flowproperties',
        component: './Flowproperties',
      },
      {
        name: 'unitgroups',
        icon: 'RetweetOutlined',
        path: '/mydata/unitgroups',
        component: './Unitgroups',
      },
      {
        name: 'sources',
        icon: 'PaperClipOutlined',
        path: '/mydata/sources',
        component: './Sources',
      },
      {
        name: 'contacts',
        icon: 'TeamOutlined',
        path: '/mydata/contacts',
        component: './Contacts',
      },
    ],
  },
  {
    path: '/tgdata',
    name: 'tgdata',
    icon: 'DatabaseOutlined',
    routes: [
      {
        path: '/tgdata',
        redirect: '/tgdata/products',
      },
      {
        name: 'products',
        icon: 'AppstoreAddOutlined',
        path: '/tgdata/products',
        component: './Products',
      },
      {
        name: 'processes',
        icon: 'ShareAltOutlined',
        path: '/tgdata/processes',
        component: './Processes',
      },
      {
        name: 'flows',
        icon: 'NodeExpandOutlined',
        path: '/tgdata/flows',
        component: './Flows',
      },
      {
        name: 'flowproperties',
        icon: 'ControlOutlined',
        path: '/tgdata/flowproperties',
        component: './Flowproperties',
      },
      {
        name: 'unitgroups',
        icon: 'RetweetOutlined',
        path: '/tgdata/unitgroups',
        component: './Unitgroups',
      },
      {
        name: 'sources',
        icon: 'PaperClipOutlined',
        path: '/tgdata/sources',
        component: './Sources',
      },
      {
        name: 'contacts',
        icon: 'TeamOutlined',
        path: '/tgdata/contacts',
        component: './Contacts',
      },
    ],
  },
  {
    path: '/account',
    name: 'account',
    menu: false,
    icon: 'UserOutlined',
    routes: [
      {
        path: '/account',
        redirect: '/account/profile',
      },
      {
        name: 'profile',
        path: '/account/profile',
        component: './Account/profile',
      },
      {
        name: 'passwordChange',
        path: '/account/password_change',
        component: './Account/password_change',
      },
    ],
  },
  {
    path: '/demo',
    menu: false,
    name: 'Demo',
    icon: 'smile',
    component: './Demo',
  },
  {
    path: '/user',
    layout: false,
    routes: [
      {
        name: 'login',
        path: '/user/login',
        component: './User/Login',
      },
      {
        name: 'passwordForget',
        path: '/user/login/password_forgot',
        component: './User/Login/password_forgot',
      },
      {
        name: 'passwordReset',
        path: '/user/login/password_reset',
        component: './User/Login/password_reset',
      },
    ],
  },
  {
    path: '/welcome',
    menu: false,
    name: 'welcome',
    component: './Welcome',
  },
  {
    path: '/admin',
    name: 'admin',
    icon: 'crown',
    access: 'canAdmin',
    routes: [
      {
        path: '/admin',
        redirect: '/admin/sub-page',
      },
      {
        path: '/admin/sub-page',
        name: 'sub-page',
        component: './Admin',
      },
    ],
  },
  {
    path: '/',
    redirect: '/welcome',
  },
  {
    path: '*',
    layout: false,
    component: './404',
  },
];
