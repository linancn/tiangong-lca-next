import component from './zh-CN/component';
import globalHeader from './zh-CN/globalHeader';
import menu from './zh-CN/menu';
import pages from './zh-CN/pages';
import pages_contact from './zh-CN/pages_contact';
import pages_general from './zh-CN/pages_general';
import pwa from './zh-CN/pwa';
import settingDrawer from './zh-CN/settingDrawer';
import settings from './zh-CN/settings';

export default {
  'navBar.lang': '语言',
  'layout.user.link.help': '帮助',
  'layout.user.link.privacy': '隐私',
  'layout.user.link.terms': '条款',
  'app.preview.down.block': '下载此页面到本地项目',
  'app.welcome.link.fetch-blocks': '获取全部区块',
  'app.welcome.link.block-list': '基于 block 开发，快速构建标准页面',
  'options.edit': '编辑',
  'options.cancel': '取消',
  'options.reset': '重置',
  'options.submit': '提交',
  'options.option': '配置',
  'options.createsuccess': '创建成功',
  'options.editsuccess': '编辑成功',
  'options.deleteMessage': '你确定删除该条数据?',
  'options.view': '查看',
  ...pages,
  ...globalHeader,
  ...menu,
  ...settingDrawer,
  ...settings,
  ...pwa,
  ...component,
  ...pages_general,
  ...pages_contact,
};
