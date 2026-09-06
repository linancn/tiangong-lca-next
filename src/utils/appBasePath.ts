const INVALID_BASE_PATH_CHARACTER = /[?#\\]/u;

export function normalizeAppBasePath(value: string | undefined): string {
  const candidate = value?.trim() || '/';

  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    INVALID_BASE_PATH_CHARACTER.test(candidate) ||
    candidate.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error(
      `APP_BASE_PATH must be an absolute URL path without query, fragment, backslash, or dot segments: ${candidate}`,
    );
  }

  const segments = candidate.split('/').filter(Boolean);
  return segments.length === 0 ? '/' : `/${segments.join('/')}/`;
}

export const appBasePath = normalizeAppBasePath(process.env.APP_BASE_PATH);

export function withAppBasePath(path: string, basePath: string = appBasePath): string {
  const normalizedBasePath = normalizeAppBasePath(basePath);
  return `${normalizedBasePath}${path.replace(/^\/+/, '')}`;
}
