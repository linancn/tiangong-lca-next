import { buildAuthCallbackUrl, buildExternalUrl, getAppOrigin } from '@/utils/appUrl';
import {
  assignBrowserLocation,
  readBrowserProtocol,
  reloadBrowserPage,
  replaceBrowserLocation,
} from '@/utils/browserNavigation';

describe('appUrl helpers', () => {
  it('returns the browser origin when window is available', () => {
    expect(getAppOrigin()).toBe('http://localhost:8000');
  });

  it('falls back to the production origin when window is unavailable', () => {
    const origin = getAppOrigin(null);
    expect(origin).toBe('https://lca.tiangong.earth');
    expect(buildExternalUrl('/user/login/password_reset', origin)).toBe(
      'https://lca.tiangong.earth/#/user/login/password_reset',
    );
  });

  it('builds absolute app urls for off-app consumers and trims trailing slashes', () => {
    expect(buildExternalUrl('/user/login/password_reset', 'https://demo.example/')).toBe(
      'https://demo.example/#/user/login/password_reset',
    );
  });

  it('builds an auth callback without a hash-history fragment', () => {
    expect(buildAuthCallbackUrl('https://demo.example///')).toBe('https://demo.example/');
    expect(buildAuthCallbackUrl()).toBe('http://localhost:8000/');
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

  it('delegates browser navigation through an explicit Location boundary', () => {
    const location = {
      assign: jest.fn(),
      protocol: 'file:',
      reload: jest.fn(),
      replace: jest.fn(),
    };

    assignBrowserLocation(location, 'https://example.com/callback');
    reloadBrowserPage(location);
    replaceBrowserLocation(location, '/maintenance.html');

    expect(location.assign).toHaveBeenCalledWith('https://example.com/callback');
    expect(location.reload).toHaveBeenCalledTimes(1);
    expect(location.replace).toHaveBeenCalledWith('/maintenance.html');
    expect(readBrowserProtocol(location)).toBe('file:');
  });
});
