/**
 * Tests for locations service cache functions
 * Path: src/services/locations/cache.ts
 */

const mockGetILCDLocationEntries = jest.fn();
const mockResolveReferenceResource = jest.fn();

jest.mock('@/services/locations/api', () => ({
  getILCDLocationEntries: (...args: any[]) => mockGetILCDLocationEntries(...args),
}));

jest.mock('@/services/referenceResources/resolver', () => {
  const actual = jest.requireActual('@/services/referenceResources/resolver');
  return {
    __esModule: true,
    ...actual,
    resolveReferenceResource: (...args: any[]) => mockResolveReferenceResource(...args),
  };
});

import { getCachedLocationData, locationCache } from '@/services/locations/cache';

describe('Locations Cache (src/services/locations/cache.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const actual = jest.requireActual('@/services/referenceResources/resolver');
    mockResolveReferenceResource.mockReset();
    mockResolveReferenceResource.mockImplementation(actual.resolveReferenceResource);
    locationCache.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('supports direct get/set/clear operations on the shared cache instance', () => {
    locationCache.set('manual:key', { value: 1 });
    expect(locationCache.get<{ value: number }>('manual:key')).toEqual({ value: 1 });

    locationCache.clear();
    expect(locationCache.get('manual:key')).toBeNull();
  });

  it('clears entries by prefix', () => {
    locationCache.set('ilcd_location:en:CN', [{ '@value': 'CN' }]);
    locationCache.set('other:key', [{ '@value': 'US' }]);

    locationCache.clearPrefix('ilcd_location');

    expect(locationCache.get('ilcd_location:en:CN')).toBeNull();
    expect(locationCache.get('other:key')).toEqual([{ '@value': 'US' }]);
  });

  it('returns an empty array without calling the API when no values are provided', async () => {
    await expect(locationCache.getILCDLocationByValues('en', [])).resolves.toEqual([]);
    expect(mockGetILCDLocationEntries).not.toHaveBeenCalled();
  });

  it('returns an empty array when all values are null or undefined', async () => {
    await expect(
      locationCache.getILCDLocationByValues('en', [null as any, undefined as any]),
    ).resolves.toEqual([]);
    expect(mockGetILCDLocationEntries).not.toHaveBeenCalled();
  });

  it('caches location lookups and reuses the cached value for reordered inputs', async () => {
    mockGetILCDLocationEntries.mockResolvedValue([
      { '@value': 'CN', '#text': 'China' },
      { '@value': 'US', '#text': 'United States' },
    ]);

    const first = await locationCache.getILCDLocationByValues('en', ['US', 'CN']);
    const second = await locationCache.getILCDLocationByValues('en', ['CN', 'US']);

    expect(first).toEqual(second);
    expect(mockGetILCDLocationEntries).toHaveBeenCalledTimes(1);
    expect(mockGetILCDLocationEntries).toHaveBeenCalledWith('en', ['CN', 'US']);
  });

  it('keeps cache entries separate when languages resolve to different location assets', async () => {
    mockGetILCDLocationEntries.mockResolvedValue([{ '@value': 'CN', '#text': 'China' }]);

    const english = await locationCache.getILCDLocationByValues('en', ['CN']);
    const chinese = await locationCache.getILCDLocationByValues('zh', ['CN']);

    expect(chinese).toEqual(english);
    expect(mockGetILCDLocationEntries).toHaveBeenCalledTimes(2);
    expect(mockGetILCDLocationEntries).toHaveBeenNthCalledWith(1, 'en', ['CN']);
    expect(mockGetILCDLocationEntries).toHaveBeenNthCalledWith(2, 'zh', ['CN']);
  });

  it('uses the base location asset in the cache identity when localization is missing', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockResolveReferenceResource.mockReturnValue({
      status: 'missing',
      resourceId: 'ilcd-locations',
      requestedLanguage: 'en',
      usedFallback: false,
      ownerIssue: '#634',
      diagnostic: 'ILCD English location labels are unavailable.',
      baseAsset: {
        language: 'en',
        fileName: 'ILCDLocations.min.json.gz',
      },
    });
    mockGetILCDLocationEntries.mockResolvedValue([{ '@value': 'CN', '#text': 'China' }]);

    const first = await locationCache.getILCDLocationByValues('en', ['CN']);
    const second = await locationCache.getILCDLocationByValues('en', ['CN']);

    expect(second).toEqual(first);
    expect(mockGetILCDLocationEntries).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('returns an empty label set on lookup errors without caching the transient failure', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetILCDLocationEntries.mockRejectedValue(new Error('location unavailable'));

    await expect(locationCache.getILCDLocationByValues('en', ['CN'])).resolves.toEqual([]);
    await expect(locationCache.getILCDLocationByValues('en', ['CN'])).resolves.toEqual([]);

    expect(mockGetILCDLocationEntries).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('preserving raw location codes'),
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });

  it('normalizes null API responses to an empty cached array', async () => {
    mockGetILCDLocationEntries.mockResolvedValue(null);

    const first = await locationCache.getILCDLocationByValues('en', ['CN']);
    const second = await locationCache.getILCDLocationByValues('en', ['CN']);

    expect(first).toEqual([]);
    expect(second).toEqual([]);
    expect(mockGetILCDLocationEntries).toHaveBeenCalledTimes(1);
    expect(mockGetILCDLocationEntries).toHaveBeenCalledWith('en', ['CN']);
  });

  it('exposes getCachedLocationData as a convenience wrapper', async () => {
    mockGetILCDLocationEntries.mockResolvedValue([{ '@value': 'CN', '#text': 'China' }]);

    const result = await getCachedLocationData('zh', ['CN']);

    expect(result).toEqual([{ '@value': 'CN', '#text': 'China' }]);
    expect(mockGetILCDLocationEntries).toHaveBeenCalledWith('zh', ['CN']);
  });
});
