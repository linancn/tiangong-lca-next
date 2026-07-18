export const LOGIN_PATH = '/user/login';

/**
 * Anonymous access is limited to the login and account-recovery flow. Product
 * routes, redirects, and unmatched paths must all pass through the session
 * guard before any application content is rendered.
 */
export const ANONYMOUS_ROUTE_PATHS = [
  LOGIN_PATH,
  '/user/login/password_forgot',
  '/user/login/password_reset',
] as const;

const anonymousRoutePaths = new Set<string>(ANONYMOUS_ROUTE_PATHS);

export const isAnonymousAllowedPath = (pathname: string): boolean =>
  anonymousRoutePaths.has(pathname);
