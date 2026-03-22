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

export const getAppOrigin = () =>
  typeof window !== 'undefined' ? window.location.origin : DEFAULT_APP_ORIGIN;

export const buildAppHashPath = (path: string) => `/#${normalizeAppPath(path)}`;

export const buildAppAbsoluteUrl = (path: string, origin: string = getAppOrigin()) =>
  `${normalizeOrigin(origin)}${buildAppHashPath(path)}`;
