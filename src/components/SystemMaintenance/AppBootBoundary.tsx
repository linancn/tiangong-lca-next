import { replaceBrowserLocation } from '@/utils/browserNavigation';
import type { ReactNode } from 'react';
import { Component, useEffect } from 'react';

declare global {
  interface Window {
    __TIANGONG_APP_MOUNTED__?: boolean;
    __TIANGONG_APP_BOOT_TIMEOUT__?: number;
  }
}

export function getStaticFallbackUrl(
  reason: string,
  location: Pick<Location, 'href' | 'protocol'> = window.location,
): string {
  if (location.protocol === 'file:') {
    const url = new URL('./maintenance.html', location.href);
    url.searchParams.set('reason', reason);
    return url.toString();
  }
  return `/maintenance.html?reason=${encodeURIComponent(reason)}`;
}

export function AppBootMarker({ children }: { children: ReactNode }) {
  useEffect(() => {
    window.__TIANGONG_APP_MOUNTED__ = true;
    if (window.__TIANGONG_APP_BOOT_TIMEOUT__ !== undefined) {
      window.clearTimeout(window.__TIANGONG_APP_BOOT_TIMEOUT__);
      window.__TIANGONG_APP_BOOT_TIMEOUT__ = undefined;
    }
  }, []);

  return <>{children}</>;
}

interface StaticFallbackErrorBoundaryState {
  failed: boolean;
}

export class StaticFallbackErrorBoundary extends Component<
  { children: ReactNode },
  StaticFallbackErrorBoundaryState
> {
  state: StaticFallbackErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): StaticFallbackErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch() {
    replaceBrowserLocation(window.location, getStaticFallbackUrl('render-failure'));
  }

  render() {
    if (this.state.failed) {
      return (
        <a href={getStaticFallbackUrl('render-failure')}>
          The application could not start. Open the service status page.
        </a>
      );
    }
    return this.props.children;
  }
}
