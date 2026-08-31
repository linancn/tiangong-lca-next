const DEFAULT_APP_ORIGIN = 'https://lca.tiangong.earth';

const normalizeAppPath = (path: string) => {
  if (!path) {
    return '/';
  }

  if (path.startsWith('/#/')) {
    return path.slice(2);
  }

  if (path.startsWith('#/')) {
    return path.slice(1);
  }

  return path.startsWith('/') ? path : `/${path}`;
};

const normalizeOrigin = (origin: string) => origin.replace(/\/+$/, '');

type AppOriginWindow = { location: Pick<Location, 'origin'> };

export const getAppOrigin = (
  browserWindow: AppOriginWindow | null | undefined = (
    globalThis as typeof globalThis & { window?: AppOriginWindow }
  ).window,
) => browserWindow?.location.origin ?? DEFAULT_APP_ORIGIN;

const buildHashHistoryPath = (path: string) => `/#${normalizeAppPath(path)}`;

/**
 * Serialize an app route path into an absolute URL for consumers outside Umi's
 * runtime, such as email redirects, exported HTML, or persisted links. React UI
 * navigation should use Umi Link/history with plain route paths instead.
 */
export const buildExternalUrl = (path: string, origin: string = getAppOrigin()) =>
  `${normalizeOrigin(origin)}${buildHashHistoryPath(path)}`;

/**
 * Build an auth callback that leaves the URL fragment exclusively to Supabase.
 * Hash-history routes cannot share that fragment with implicit-flow tokens.
 */
export const buildAuthCallbackUrl = (origin: string = getAppOrigin()) =>
  `${normalizeOrigin(origin)}/`;
