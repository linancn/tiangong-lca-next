import { brandProfile } from './brandProfile';

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
  colorPrimary: readBrandEnv(process.env.APP_LIGHT_PRIMARY, brandProfile.theme.light.colorPrimary),
  logo: readBrandEnv(process.env.APP_LIGHT_LOGO, brandProfile.theme.light.logo),
};

export const darkBrandTheme: BrandTheme = {
  navTheme: 'realDark',
  colorPrimary: readBrandEnv(process.env.APP_DARK_PRIMARY, brandProfile.theme.dark.colorPrimary),
  logo: readBrandEnv(process.env.APP_DARK_LOGO, brandProfile.theme.dark.logo),
};

export const favicon = readBrandEnv(process.env.APP_FAVICON, brandProfile.favicon);

export const getBrandTheme = (isDarkMode?: boolean): BrandTheme =>
  isDarkMode ? darkBrandTheme : lightBrandTheme;
