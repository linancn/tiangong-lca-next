import { buildExternalUrl, getAppOrigin } from '@/utils/appUrl';

describe('appUrl helpers', () => {
  it('returns the browser origin when window is available', () => {
    expect(getAppOrigin()).toBe('http://localhost:8000');
  });

  it('falls back to the production origin when window is unavailable', () => {
    const originalWindow = global.window;
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: undefined,
    });

    try {
      expect(getAppOrigin()).toBe('https://lca.tiangong.earth');
      expect(buildExternalUrl('/user/login/password_reset')).toBe(
        'https://lca.tiangong.earth/#/user/login/password_reset',
      );
    } finally {
      Object.defineProperty(global, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it('builds absolute app urls for off-app consumers and trims trailing slashes', () => {
    expect(buildExternalUrl('/user/login/password_reset', 'https://demo.example/')).toBe(
      'https://demo.example/#/user/login/password_reset',
    );
  });

  it('normalizes already-hashed route input before building absolute URLs', () => {
    expect(buildExternalUrl('/#/user/login/password_reset', 'https://demo.example')).toBe(
      'https://demo.example/#/user/login/password_reset',
    );
    expect(buildExternalUrl('#/user/login/password_reset', 'https://demo.example')).toBe(
      'https://demo.example/#/user/login/password_reset',
    );
  });

  it('normalizes empty and relative route input for off-app URLs', () => {
    expect(buildExternalUrl('', 'https://demo.example')).toBe('https://demo.example/#/');
    expect(buildExternalUrl('user/login/password_reset', 'https://demo.example')).toBe(
      'https://demo.example/#/user/login/password_reset',
    );
  });
});
