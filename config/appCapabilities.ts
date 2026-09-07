export const APP_CAPABILITY_PROFILES = ['full', 'auth-only'] as const;

export type AppCapabilityProfile = (typeof APP_CAPABILITY_PROFILES)[number];

export interface AppCapabilities {
  profile: AppCapabilityProfile;
  productData: boolean;
  teams: boolean;
  review: boolean;
  importExport: boolean;
  edgeFunctions: boolean;
  calculations: boolean;
  oauthApplications: boolean;
  systemRoles: boolean;
}

const fullCapabilities: AppCapabilities = {
  profile: 'full',
  productData: true,
  teams: true,
  review: true,
  importExport: true,
  edgeFunctions: true,
  calculations: true,
  oauthApplications: true,
  systemRoles: true,
};

const authOnlyCapabilities: AppCapabilities = {
  profile: 'auth-only',
  productData: false,
  teams: false,
  review: false,
  importExport: false,
  edgeFunctions: false,
  calculations: false,
  oauthApplications: false,
  systemRoles: false,
};

export const resolveAppCapabilities = (value?: string): AppCapabilities => {
  const profile = value?.trim().toLowerCase();
  return profile === 'auth-only' ? authOnlyCapabilities : fullCapabilities;
};

export const appCapabilities = resolveAppCapabilities(process.env.APP_CAPABILITY_PROFILE);
