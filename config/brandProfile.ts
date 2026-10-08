import type { SupportedAppLocale } from '../src/services/general/localeRegistry';
import atlas from './brands/atlas.json';
import tiangong from './brands/tiangong.json';

export type BrandId = 'tiangong' | 'atlas';
type LocalizedBrandText = Record<SupportedAppLocale, string>;

export interface BrandProfile {
  id: BrandId;
  displayName: string;
  localizedName: LocalizedBrandText;
  title: LocalizedBrandText;
  slogan: LocalizedBrandText;
  messages: Partial<Record<SupportedAppLocale, Record<string, string>>>;
  theme: Record<'light' | 'dark', { colorPrimary: string; logo: string }>;
  favicon: string;
  links: { homepage: string; source: string; terms: string; privacy: string };
  assets: {
    iconDirectory: string;
    manifestThemeColor: string;
    manifestBackgroundColor: string;
  };
  desktop: {
    appId: string;
    productName: string;
    shortcutName: string;
    downloadPrefix: string;
  };
}

const profiles: Record<BrandId, BrandProfile> = {
  tiangong: { ...tiangong, id: 'tiangong' },
  atlas: { ...atlas, id: 'atlas' },
};

/** Brand is a build input, independent of backend environment and user permissions. */
export function resolveBrandProfile(value?: string): BrandProfile {
  const id = value?.trim().toLowerCase() || 'tiangong';
  if (id !== 'tiangong' && id !== 'atlas') {
    throw new Error(`Unsupported APP_BRAND "${value}". Expected tiangong or atlas.`);
  }
  return profiles[id];
}

export const brandProfile = resolveBrandProfile(process.env.APP_BRAND);
