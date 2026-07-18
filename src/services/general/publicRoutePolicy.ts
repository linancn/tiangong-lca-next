export type AppRoutePolicyNode = {
  path?: string;
  routes?: readonly AppRoutePolicyNode[];
};

export type PublicRoutePolicyOptions = {
  exactPublicPaths: readonly string[];
  publicUnknownFallback: boolean;
};

const normalizePathname = (pathname: string): string => {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withLeadingSlash === '/' ? withLeadingSlash : withLeadingSlash.replace(/\/+$/u, '');
};

const escapePatternSegment = (segment: string): string =>
  segment.replace(/[.+^${}()|[\]\\]/gu, '\\$&').replace(/\*/gu, '.*');

const routePatternToRegExp = (pattern: string): RegExp => {
  const normalizedPattern = normalizePathname(pattern);
  if (normalizedPattern === '/') {
    return /^\/$/u;
  }

  const expression = normalizedPattern
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (segment === '*') {
        return '/.*';
      }
      if (segment.startsWith(':')) {
        return segment.endsWith('?') ? '(?:/[^/]+)?' : '/[^/]+';
      }
      return `/${escapePatternSegment(segment)}`;
    })
    .join('');
  return new RegExp(`^${expression}$`, 'u');
};

const collectConfiguredRouteMatchers = (routes: readonly AppRoutePolicyNode[]): readonly RegExp[] =>
  routes.flatMap((route) => [
    ...(route.path && route.path !== '*' ? [routePatternToRegExp(route.path)] : []),
    ...collectConfiguredRouteMatchers(route.routes ?? []),
  ]);

const hasWildcardRoute = (routes: readonly AppRoutePolicyNode[]): boolean =>
  routes.some((route) => route.path === '*' || hasWildcardRoute(route.routes ?? []));

/**
 * Builds a default-deny policy for configured application routes. The explicit
 * wildcard can remain a public 404 without treating a future configured route
 * as public: every new route pattern is protected until deliberately allowlisted.
 */
export function createPublicRoutePolicy(
  routes: readonly AppRoutePolicyNode[],
  options: PublicRoutePolicyOptions,
): (pathname: string) => boolean {
  const exactPublicPaths = new Set(options.exactPublicPaths.map(normalizePathname));
  const configuredRouteMatchers = collectConfiguredRouteMatchers(routes);
  const hasPublicUnknownFallback = options.publicUnknownFallback && hasWildcardRoute(routes);

  return (pathname: string): boolean => {
    const normalizedPathname = normalizePathname(pathname);
    if (exactPublicPaths.has(normalizedPathname)) {
      return true;
    }
    const isConfiguredRoute = configuredRouteMatchers.some((matcher) =>
      matcher.test(normalizedPathname),
    );
    return !isConfiguredRoute && hasPublicUnknownFallback;
  };
}
