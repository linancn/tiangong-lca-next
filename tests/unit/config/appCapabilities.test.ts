import { APP_CAPABILITY_PROFILES, resolveAppCapabilities } from '../../../config/appCapabilities';

describe('application capability profiles', () => {
  it('keeps the existing complete application as the default profile', () => {
    expect(APP_CAPABILITY_PROFILES).toEqual(['full', 'auth-only']);
    expect(resolveAppCapabilities()).toEqual({
      profile: 'full',
      productData: true,
      teams: true,
      review: true,
      importExport: true,
      edgeFunctions: true,
      calculations: true,
      oauthApplications: true,
      systemRoles: true,
    });
  });

  it('fails unknown values back to full and disables every backend-dependent auth-only surface', () => {
    expect(resolveAppCapabilities('unknown').profile).toBe('full');
    expect(resolveAppCapabilities(' AUTH-ONLY ')).toEqual({
      profile: 'auth-only',
      productData: false,
      teams: false,
      review: false,
      importExport: false,
      edgeFunctions: false,
      calculations: false,
      oauthApplications: false,
      systemRoles: false,
    });
  });
});
