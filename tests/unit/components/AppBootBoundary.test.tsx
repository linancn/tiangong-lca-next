import {
  AppBootMarker,
  getStaticFallbackUrl,
  StaticFallbackErrorBoundary,
} from '@/components/SystemMaintenance/AppBootBoundary';
import { render, screen } from '@testing-library/react';

const mockReplace = jest.fn();

jest.mock('@/utils/browserNavigation', () => ({
  __esModule: true,
  replaceBrowserLocation: (...args: unknown[]) => mockReplace(...args),
}));

function BrokenChild(): never {
  throw new Error('render failed');
}

describe('AppBootBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.useFakeTimers();
    mockReplace.mockClear();
    window.__TIANGONG_APP_MOUNTED__ = false;
    window.__TIANGONG_APP_BOOT_TIMEOUT__ = undefined;
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    console.error = originalConsoleError;
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

    expect(mockReplace).toHaveBeenCalledWith(
      window.location,
      '/maintenance.html?reason=render-failure',
    );
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/maintenance.html?reason=render-failure',
    );
  });

  it('builds a file URL for the Electron static fallback', () => {
    expect(
      getStaticFallbackUrl('boot-timeout', {
        href: 'file:///Applications/TianGong/resources/app/index.html',
        protocol: 'file:',
      }),
    ).toBe('file:///Applications/TianGong/resources/app/maintenance.html?reason=boot-timeout');
  });
});
