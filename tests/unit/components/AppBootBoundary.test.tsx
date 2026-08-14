import {
  AppBootMarker,
  getStaticFallbackUrl,
  StaticFallbackErrorBoundary,
} from '@/components/SystemMaintenance/AppBootBoundary';
import { render, screen } from '@testing-library/react';

function BrokenChild(): never {
  throw new Error('render failed');
}

describe('AppBootBoundary', () => {
  const originalLocation = window.location;
  const originalConsoleError = console.error;
  const replace = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    replace.mockClear();
    window.__TIANGONG_APP_MOUNTED__ = false;
    window.__TIANGONG_APP_BOOT_TIMEOUT__ = undefined;
    console.error = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        href: 'http://localhost:8000/tgdata',
        protocol: 'http:',
        replace,
      },
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    console.error = originalConsoleError;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('marks a committed React tree as mounted and clears the boot timeout', () => {
    const staleFallback = jest.fn();
    window.__TIANGONG_APP_BOOT_TIMEOUT__ = window.setTimeout(staleFallback, 15000);

    render(
      <AppBootMarker>
        <div>application</div>
      </AppBootMarker>,
    );
    jest.advanceTimersByTime(15000);

    expect(window.__TIANGONG_APP_MOUNTED__).toBe(true);
    expect(window.__TIANGONG_APP_BOOT_TIMEOUT__).toBeUndefined();
    expect(staleFallback).not.toHaveBeenCalled();
  });

  it('marks the app mounted when loading.js has not registered a timeout', () => {
    render(
      <AppBootMarker>
        <div>application</div>
      </AppBootMarker>,
    );
    expect(window.__TIANGONG_APP_MOUNTED__).toBe(true);
  });

  it('redirects a failed React render to the standalone status page', () => {
    render(
      <StaticFallbackErrorBoundary>
        <BrokenChild />
      </StaticFallbackErrorBoundary>,
    );

    expect(replace).toHaveBeenCalledWith('/maintenance.html?reason=render-failure');
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/maintenance.html?reason=render-failure',
    );
  });

  it('builds a file URL for the Electron static fallback', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        href: 'file:///Applications/TianGong/resources/app/index.html',
        protocol: 'file:',
        replace,
      },
    });

    expect(getStaticFallbackUrl('boot-timeout')).toBe(
      'file:///Applications/TianGong/resources/app/maintenance.html?reason=boot-timeout',
    );
  });
});
