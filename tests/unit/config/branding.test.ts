const brandingOriginalEnv = { ...process.env };

const BRANDING_ENV_KEYS = [
  'APP_LIGHT_PRIMARY',
  'APP_DARK_PRIMARY',
  'APP_LIGHT_LOGO',
  'APP_DARK_LOGO',
  'APP_FAVICON',
] as const;

const clearBrandingEnv = () => {
  BRANDING_ENV_KEYS.forEach((key) => {
    delete process.env[key];
  });
};

describe('branding config (config/branding.ts)', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...brandingOriginalEnv };
    clearBrandingEnv();
  });

  afterAll(() => {
    process.env = brandingOriginalEnv;
  });

  it('uses default light and dark branding values when env vars are missing', () => {
    const { lightBrandTheme, darkBrandTheme } = require('../../../config/branding');

    expect(lightBrandTheme).toEqual({
      navTheme: 'light',
      colorPrimary: '#5C246A',
      logo: '/logo.svg',
    });
    expect(darkBrandTheme).toEqual({
      navTheme: 'realDark',
      colorPrimary: '#9e3ffd',
      logo: '/logo_dark.svg',
    });
  });

  it('reads and trims branding values from env vars', () => {
    process.env.APP_LIGHT_PRIMARY = '  #0C246A  ';
    process.env.APP_DARK_PRIMARY = '#123abc';
    process.env.APP_LIGHT_LOGO = '  /brand/light.svg  ';
    process.env.APP_DARK_LOGO = '/brand/dark.svg';

    const { lightBrandTheme, darkBrandTheme } = require('../../../config/branding');

    expect(lightBrandTheme.colorPrimary).toBe('#0C246A');
    expect(lightBrandTheme.logo).toBe('/brand/light.svg');
    expect(darkBrandTheme.colorPrimary).toBe('#123abc');
    expect(darkBrandTheme.logo).toBe('/brand/dark.svg');
  });

  it('falls back when env vars are blank strings', () => {
    process.env.APP_LIGHT_PRIMARY = '   ';
    process.env.APP_DARK_LOGO = '';

    const { lightBrandTheme, darkBrandTheme } = require('../../../config/branding');

    expect(lightBrandTheme.colorPrimary).toBe('#5C246A');
    expect(darkBrandTheme.logo).toBe('/logo_dark.svg');
  });

  it('uses default favicon when env var is missing', () => {
    const { favicon } = require('../../../config/branding');

    expect(favicon).toBe('/favicon.ico');
  });

  it('reads and trims APP_FAVICON from env', () => {
    process.env.APP_FAVICON = '  /custom-favicon.png  ';

    const { favicon } = require('../../../config/branding');

    expect(favicon).toBe('/custom-favicon.png');
  });

  it('falls back to default favicon when env var is blank', () => {
    process.env.APP_FAVICON = '   ';

    const { favicon } = require('../../../config/branding');

    expect(favicon).toBe('/favicon.ico');
  });

  it('returns the correct theme by dark mode flag', () => {
    process.env.APP_LIGHT_PRIMARY = '#101010';
    process.env.APP_DARK_PRIMARY = '#202020';

    const { getBrandTheme } = require('../../../config/branding');

    expect(getBrandTheme(false).colorPrimary).toBe('#101010');
    expect(getBrandTheme(undefined).colorPrimary).toBe('#101010');
    expect(getBrandTheme(true).colorPrimary).toBe('#202020');
    expect(getBrandTheme(true).navTheme).toBe('realDark');
  });
});
