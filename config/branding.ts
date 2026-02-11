type BrandNavTheme = 'light' | 'realDark';

export interface BrandTheme {
  navTheme: BrandNavTheme;
  colorPrimary: string;
  logo: string;
}

const readBrandEnv = (value: string | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

export const lightBrandTheme: BrandTheme = {
  navTheme: 'light',
  colorPrimary: readBrandEnv(process.env.APP_LIGHT_PRIMARY, '#5C246A'),
  logo: readBrandEnv(process.env.APP_LIGHT_LOGO, '/logo.svg'),
};

export const darkBrandTheme: BrandTheme = {
  navTheme: 'realDark',
  colorPrimary: readBrandEnv(process.env.APP_DARK_PRIMARY, '#9e3ffd'),
  logo: readBrandEnv(process.env.APP_DARK_LOGO, '/logo_dark.svg'),
};

export const favicon = readBrandEnv(process.env.APP_FAVICON, '/favicon.ico');

export const getBrandTheme = (isDarkMode?: boolean): BrandTheme =>
  isDarkMode ? darkBrandTheme : lightBrandTheme;
