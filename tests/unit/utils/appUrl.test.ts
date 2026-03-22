import { buildAppAbsoluteUrl, buildAppHashPath, getAppOrigin } from '@/utils/appUrl';

describe('appUrl helpers', () => {
  it('builds hash paths for empty, relative, and already-hashed app routes', () => {
    expect(buildAppHashPath('')).toBe('/#/');
    expect(buildAppHashPath('user/login')).toBe('/#/user/login');
    expect(buildAppHashPath('/user/login')).toBe('/#/user/login');
    expect(buildAppHashPath('/#/user/login')).toBe('/#/user/login');
    expect(buildAppHashPath('#/user/login')).toBe('/#/user/login');
  });

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
      expect(buildAppAbsoluteUrl('/user/login/password_reset')).toBe(
        'https://lca.tiangong.earth/#/user/login/password_reset',
      );
    } finally {
      Object.defineProperty(global, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it('builds absolute app urls and trims trailing slashes from custom origins', () => {
    expect(buildAppAbsoluteUrl('/user/login/password_reset', 'https://demo.example/')).toBe(
      'https://demo.example/#/user/login/password_reset',
    );
  });
});
