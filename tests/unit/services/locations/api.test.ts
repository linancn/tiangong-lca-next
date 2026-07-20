/**
 * Tests for locations service API functions
 * Path: src/services/locations/api.ts
 */

const mockGetCachedOrFetchLocationFileData = jest.fn();
const mockResolveReferenceResource = jest.fn();

jest.mock('@/services/locations/util', () => {
  const actual = jest.requireActual('@/services/locations/util');
  return {
    __esModule: true,
    ...actual,
    getCachedOrFetchLocationFileData: (...args: any[]) =>
      mockGetCachedOrFetchLocationFileData(...args),
  };
});

jest.mock('@/services/referenceResources/resolver', () => {
  const actual = jest.requireActual('@/services/referenceResources/resolver');
  return {
    __esModule: true,
    ...actual,
    resolveReferenceResource: (...args: any[]) => mockResolveReferenceResource(...args),
  };
});

import {
  getILCDLocationAll,
  getILCDLocationByValue,
  getILCDLocationByValues,
  getILCDLocationEntries,
} from '@/services/locations/api';
import { getReferenceResourceDefinition } from '@/services/referenceResources/manifest';

const locationResource = getReferenceResourceDefinition('ilcd-locations');
const LOCATION_EN_FILE = locationResource.runtimeAssets.en!.fileName;
const LOCATION_ZH_FILE = locationResource.runtimeAssets.zh!.fileName;
const LOCATION_ZH_STEM = LOCATION_ZH_FILE.replace(/\.min\.json\.gz$/u, '');

describe('Locations API (src/services/locations/api.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const actual = jest.requireActual('@/services/referenceResources/resolver');
    mockResolveReferenceResource.mockReset();
    mockResolveReferenceResource.mockImplementation(actual.resolveReferenceResource);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects location reads when localization is explicitly missing', async () => {
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

    await expect(getILCDLocationEntries('en', ['all'])).rejects.toThrow(
      'ILCD English location labels are unavailable.',
    );
    expect(mockGetCachedOrFetchLocationFileData).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('returns all location entries when getValues includes all', async () => {
    mockGetCachedOrFetchLocationFileData.mockResolvedValue({
      ILCDLocations: {
        location: [
          { '@value': 'CN', '#text': 'China' },
          { '@value': 'US', '#text': 'United States' },
        ],
      },
    });

    const result = await getILCDLocationEntries('en', ['all']);

    expect(mockGetCachedOrFetchLocationFileData).toHaveBeenCalledWith(LOCATION_EN_FILE);
    expect(result).toEqual([
      { '@value': 'CN', '#text': 'China' },
      { '@value': 'US', '#text': 'United States' },
    ]);
  });

  it('filters location entries by requested values and normalizes single objects', async () => {
    mockGetCachedOrFetchLocationFileData.mockResolvedValue({
      ILCDLocations: {
        location: { '@value': 'CN', '#text': 'China' },
      },
    });

    const result = await getILCDLocationEntries('en', ['CN']);

    expect(result).toEqual([{ '@value': 'CN', '#text': 'China' }]);
  });

  it('returns an empty array when location filters are empty after normalization', async () => {
    mockGetCachedOrFetchLocationFileData.mockResolvedValue({
      ILCDLocations: {
        location: [{ '@value': 'CN', '#text': 'China' }],
      },
    });

    await expect(getILCDLocationEntries('en', [''])).resolves.toEqual([]);
  });

  it('returns an empty array when the location payload is missing', async () => {
    mockGetCachedOrFetchLocationFileData.mockResolvedValue({
      ILCDLocations: {
        location: null,
      },
    });

    await expect(getILCDLocationEntries('en', ['all'])).resolves.toEqual([]);
  });

  it('wraps all locations in the legacy response shape with zh file name', async () => {
    mockGetCachedOrFetchLocationFileData.mockResolvedValue({
      ILCDLocations: {
        location: [{ '@value': 'CN', '#text': '中国' }],
      },
    });

    const result = await getILCDLocationAll('zh');

    expect(mockGetCachedOrFetchLocationFileData).toHaveBeenCalledWith(LOCATION_ZH_FILE);
    expect(result).toEqual({
      data: [{ file_name: LOCATION_ZH_STEM, location: [{ '@value': 'CN', '#text': '中国' }] }],
      success: true,
    });
  });

  it('merges an exactly aligned localized location set with localized fields taking precedence', async () => {
    mockGetCachedOrFetchLocationFileData
      .mockResolvedValueOnce({
        ILCDLocations: {
          location: [
            { '@value': 'CN', '#text': 'China', continent: 'Asia' },
            { '@value': 'US', '#text': 'United States' },
          ],
        },
      })
      .mockResolvedValueOnce({
        ILCDLocations: {
          location: [
            { '@value': 'CN', '#text': '中国' },
            { '@value': 'US', '#text': '美国' },
          ],
        },
      });

    const result = await getILCDLocationEntries('zh', ['all']);

    expect(result).toEqual([
      { '@value': 'CN', '#text': '中国', continent: 'Asia' },
      { '@value': 'US', '#text': '美国' },
    ]);
    expect(mockGetCachedOrFetchLocationFileData).toHaveBeenNthCalledWith(1, LOCATION_EN_FILE);
    expect(mockGetCachedOrFetchLocationFileData).toHaveBeenNthCalledWith(2, LOCATION_ZH_FILE);
  });

  it('fails closed when the localized location asset cannot be loaded', async () => {
    mockGetCachedOrFetchLocationFileData
      .mockResolvedValueOnce({
        ILCDLocations: {
          location: [{ '@value': 'CN', '#text': 'China' }],
        },
      })
      .mockRejectedValueOnce(new Error('localized asset unavailable'));

    await expect(getILCDLocationEntries('zh', ['CN'])).rejects.toThrow(
      'localized asset unavailable',
    );
  });

  it('fails closed when localized location identities differ from the base', async () => {
    mockGetCachedOrFetchLocationFileData
      .mockResolvedValueOnce({
        ILCDLocations: {
          location: [
            { '@value': 'CN', '#text': 'China' },
            { '@value': 'US', '#text': 'United States' },
          ],
        },
      })
      .mockResolvedValueOnce({
        ILCDLocations: {
          location: [
            { '@value': 'CN', '#text': '中国' },
            { '@value': 'DE', '#text': '德国' },
          ],
        },
      });

    await expect(getILCDLocationEntries('zh', ['all'])).rejects.toThrow(
      'Localized location structure differs from the base at index 1.',
    );
  });

  it('fails closed when localized locations do not cover every base identity', async () => {
    mockGetCachedOrFetchLocationFileData
      .mockResolvedValueOnce({
        ILCDLocations: {
          location: [
            { '@value': 'CN', '#text': 'China' },
            { '@value': 'US', '#text': 'United States' },
          ],
        },
      })
      .mockResolvedValueOnce({
        ILCDLocations: {
          location: [{ '@value': 'CN', '#text': '中国' }],
        },
      });

    await expect(getILCDLocationEntries('zh', ['all'])).rejects.toThrow(
      'Localized locations do not exactly cover the base structure.',
    );
  });

  it('returns a failure payload when loading all locations throws', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetCachedOrFetchLocationFileData.mockResolvedValue(null);

    const result = await getILCDLocationAll('en');

    expect(result).toEqual({ data: [], success: false });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('returns raw location query data for getILCDLocationByValues', async () => {
    mockGetCachedOrFetchLocationFileData.mockResolvedValue({
      ILCDLocations: {
        location: [
          { '@value': 'CN', '#text': 'China' },
          { '@value': 'US', '#text': 'United States' },
        ],
      },
    });

    const result = await getILCDLocationByValues('en', ['US']);

    expect(result).toEqual({
      data: [{ '@value': 'US', '#text': 'United States' }],
      success: true,
    });
  });

  it('returns a failure payload when getILCDLocationByValues cannot load entries', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetCachedOrFetchLocationFileData.mockRejectedValueOnce(new Error('location load failed'));

    const result = await getILCDLocationByValues('en', ['US']);

    expect(result).toEqual({ data: [], success: false });
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('formats the location label when a matching text value exists', async () => {
    mockGetCachedOrFetchLocationFileData.mockResolvedValue({
      ILCDLocations: {
        location: [{ '@value': 'US', '#text': 'United States' }],
      },
    });

    const result = await getILCDLocationByValue('en', 'US');

    expect(result).toEqual({ data: 'US (United States)', success: true });
  });

  it('falls back to the raw location code when no text match exists', async () => {
    mockGetCachedOrFetchLocationFileData.mockResolvedValue({
      ILCDLocations: {
        location: [{ '@value': 'CN', '#text': 'China' }],
      },
    });

    const result = await getILCDLocationByValue('en', 'JP');

    expect(result).toEqual({ data: 'JP', success: true });
  });
});
