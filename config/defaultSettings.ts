import { ProLayoutProps } from '@ant-design/pro-components';
import { lightBrandTheme } from './branding';

const DEFAULT_LAYOUT = 'mix';
const DEFAULT_TITLE = 'TianGong LCA Data Platform';
const DEFAULT_LOGIN_SUBTITLE = "World's Largest Open LCA Data Platform";
const APP_LAYOUT_OPTIONS = ['side', 'top', 'mix'] as const;

type AppLayout = (typeof APP_LAYOUT_OPTIONS)[number];
type SupportedLocale = 'zh-CN' | 'en-US';

const readSettingEnv = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const readLayoutEnv = (value: string | undefined): AppLayout => {
  const normalized = readSettingEnv(value)?.toLowerCase();
  if (normalized && APP_LAYOUT_OPTIONS.includes(normalized as AppLayout)) {
    return normalized as AppLayout;
  }

  return DEFAULT_LAYOUT;
};

const normalizeLocale = (locale?: string): SupportedLocale | undefined => {
  const lowerLocale = locale?.trim().toLowerCase();
  if (lowerLocale === 'zh-cn') {
    return 'zh-CN';
  }
  if (lowerLocale === 'en-us') {
    return 'en-US';
  }

  return undefined;
};

const getLocalizedEnvValue = (
  locale: string | undefined,
  values: Partial<Record<SupportedLocale, string | undefined>>,
): string | undefined => {
  const normalizedLocale = normalizeLocale(locale);
  if (!normalizedLocale) {
    return undefined;
  }

  return values[normalizedLocale];
};

const appTitleEnvValues: Partial<Record<SupportedLocale, string | undefined>> = {
  'zh-CN': readSettingEnv(process.env.APP_TITLE_ZH_CN),
  'en-US': readSettingEnv(process.env.APP_TITLE_EN_US),
};

const loginSubtitleEnvValues: Partial<Record<SupportedLocale, string | undefined>> = {
  'zh-CN': readSettingEnv(process.env.APP_LOGIN_SUBTITLE_ZH_CN),
  'en-US': readSettingEnv(process.env.APP_LOGIN_SUBTITLE_EN_US),
};

export const getLocalizedAppTitle = (locale?: string): string | undefined =>
  getLocalizedEnvValue(locale, appTitleEnvValues);

export const getLocalizedLoginSubtitle = (locale?: string): string | undefined =>
  getLocalizedEnvValue(locale, loginSubtitleEnvValues);

export const defaultAppTitle = DEFAULT_TITLE;
export const defaultLoginSubtitle = DEFAULT_LOGIN_SUBTITLE;
/**
 * @name
 */
const Settings: ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
} = {
  navTheme: lightBrandTheme.navTheme,
  colorPrimary: lightBrandTheme.colorPrimary,
  layout: readLayoutEnv(process.env.APP_LAYOUT),
  contentWidth: 'Fluid',
  fixedHeader: false,
  fixSiderbar: true,
  colorWeak: false,
  title: defaultAppTitle,
  pwa: true,
  logo: lightBrandTheme.logo,
  iconfontUrl: '',
  token: {
    // 参见ts声明，demo 见文档，通过token 修改样式
    //https://procomponents.ant.design/components/layout#%E9%80%9A%E8%BF%87-token-%E4%BF%AE%E6%94%B9%E6%A0%B7%E5%BC%8F
  },
};

export default Settings;
