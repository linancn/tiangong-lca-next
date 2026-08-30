export const LOGIN_PATH = '/user/login';
export const OAUTH_CONSENT_PATH = '/oauth/consent';

/**
 * Anonymous entry is limited to login/recovery plus the OAuth consent route.
 * The consent page performs its own getClaims() check so it can preserve the
 * authorization_id across login. Product routes, redirects, and unmatched
 * paths must pass through the normal session guard.
 */
export const ANONYMOUS_ROUTE_PATHS = [
  LOGIN_PATH,
  '/user/login/password_forgot',
  '/user/login/password_reset',
  OAUTH_CONSENT_PATH,
] as const;

const anonymousRoutePaths = new Set<string>(ANONYMOUS_ROUTE_PATHS);

export const isAnonymousAllowedPath = (pathname: string): boolean =>
  anonymousRoutePaths.has(pathname);

/** Keep post-login navigation inside this hash-routed application. */
export const resolveSafeLoginRedirect = (value: string | null | undefined): string => {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/';
  }
  try {
    const parsed = new URL(value, 'https://local.invalid');
    if (parsed.origin !== 'https://local.invalid') {
      return '/';
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
};
