const defaultSettingsOriginalEnv = { ...process.env };

const DEFAULT_SETTINGS_ENV_KEYS = [
  'APP_LAYOUT',
  'APP_TITLE_ZH_CN',
  'APP_TITLE_EN_US',
  'APP_LOGIN_SUBTITLE_ZH_CN',
  'APP_LOGIN_SUBTITLE_EN_US',
] as const;

const clearDefaultSettingsEnv = () => {
  DEFAULT_SETTINGS_ENV_KEYS.forEach((key) => {
    delete process.env[key];
  });
};

describe('default settings config (config/defaultSettings.ts)', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...defaultSettingsOriginalEnv };
    clearDefaultSettingsEnv();
  });

  afterAll(() => {
    process.env = defaultSettingsOriginalEnv;
  });

  it('uses defaults when env vars are missing', () => {
    const {
      default: settings,
      defaultAppTitle,
      defaultLoginSubtitle,
    } = require('../../../config/defaultSettings');

    expect(settings.layout).toBe('mix');
    expect(settings.title).toBe(defaultAppTitle);
    expect(defaultLoginSubtitle).toBe("World's Largest Open LCA Data Platform");
  });

  it('reads APP_LAYOUT from env when value is supported', () => {
    process.env.APP_LAYOUT = ' top ';

    const settings = require('../../../config/defaultSettings').default;

    expect(settings.layout).toBe('top');
  });

  it('falls back to default layout when APP_LAYOUT is unsupported', () => {
    process.env.APP_LAYOUT = 'grid';

    const settings = require('../../../config/defaultSettings').default;

    expect(settings.layout).toBe('mix');
  });

  it('resolves localized app title env values by locale', () => {
    process.env.APP_TITLE_ZH_CN = '  开源生命周期平台  ';
    process.env.APP_TITLE_EN_US = '  Open LCA Platform  ';

    const { getLocalizedAppTitle } = require('../../../config/defaultSettings');

    expect(getLocalizedAppTitle('zh-CN')).toBe('开源生命周期平台');
    expect(getLocalizedAppTitle('en-US')).toBe('Open LCA Platform');
  });

  it('returns undefined for unsupported locale app title', () => {
    process.env.APP_TITLE_EN_US = 'Open LCA Platform';

    const { getLocalizedAppTitle } = require('../../../config/defaultSettings');

    expect(getLocalizedAppTitle('fr-FR')).toBeUndefined();
  });

  it('resolves localized login subtitle env values by locale', () => {
    process.env.APP_LOGIN_SUBTITLE_ZH_CN = '  中文副标题  ';
    process.env.APP_LOGIN_SUBTITLE_EN_US = '  English subtitle  ';

    const { getLocalizedLoginSubtitle } = require('../../../config/defaultSettings');

    expect(getLocalizedLoginSubtitle('zh-CN')).toBe('中文副标题');
    expect(getLocalizedLoginSubtitle('en-US')).toBe('English subtitle');
  });
});
