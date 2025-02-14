import component from './zh-CN/component';
import globalHeader from './zh-CN/globalHeader';
import menu from './zh-CN/menu';
import pages from './zh-CN/pages';
import pages_contact from './zh-CN/pages_contact';
import pages_flow from './zh-CN/pages_flow';
import pages_flowproperty from './zh-CN/pages_flowproperty';
import pages_general from './zh-CN/pages_general';
import pages_home from './zh-CN/pages_home';
import pages_model from './zh-CN/pages_model';
import pages_process from './zh-CN/pages_process';
import pages_product from './zh-CN/pages_product';
import pages_source from './zh-CN/pages_source';
import pages_unitgroup from './zh-CN/pages_unitgroup';
import prompts from './zh-CN/prompts';
import pwa from './zh-CN/pwa';
import settingDrawer from './zh-CN/settingDrawer';
import settings from './zh-CN/settings';
import validator from './zh-CN/validator';

export default {
  'navBar.lang': '语言',
  'layout.user.link.help': '帮助',
  'layout.user.link.privacy': '隐私',
  'layout.user.link.terms': '条款',
  'app.preview.down.block': '下载此页面到本地项目',
  'app.welcome.link.fetch-blocks': '获取全部区块',
  'app.welcome.link.block-list': '基于 block 开发，快速构建标准页面',
  ...pages,
  ...globalHeader,
  ...menu,
  ...settingDrawer,
  ...settings,
  ...pwa,
  ...component,
  ...pages_general,
  ...pages_home,
  ...pages_model,
  ...pages_process,
  ...pages_contact,
  ...pages_unitgroup,
  ...pages_flowproperty,
  ...pages_flow,
  ...pages_source,
  ...pages_product,
  ...validator,
  ...prompts,
};
