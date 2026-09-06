import { normalizeAppBasePath, withAppBasePath } from '@/utils/appBasePath';

describe('application base path helpers', () => {
  it('defaults blank values to the origin root', () => {
    expect(normalizeAppBasePath(undefined)).toBe('/');
    expect(normalizeAppBasePath('   ')).toBe('/');
    expect(normalizeAppBasePath('/')).toBe('/');
  });

  it('normalizes a project path with exactly one leading and trailing slash', () => {
    expect(normalizeAppBasePath(' /tiangong-lca-next-practice//preview/ ')).toBe(
      '/tiangong-lca-next-practice/preview/',
    );
  });

  it.each([
    'relative/path',
    '//example.test/path',
    '/path?query=true',
    '/path#fragment',
    '/path\\asset',
    '/path/./asset',
    '/path/../asset',
  ])('rejects an unsafe base path: %s', (value) => {
    expect(() => normalizeAppBasePath(value)).toThrow('APP_BASE_PATH must be an absolute URL path');
  });

  it('prefixes root-relative and relative assets with the selected base', () => {
    expect(withAppBasePath('/logo.svg', '/project/')).toBe('/project/logo.svg');
    expect(withAppBasePath('maps/world.json', '/project')).toBe('/project/maps/world.json');
    expect(withAppBasePath('/favicon.ico')).toBe('/favicon.ico');
  });
});
