/**
 * Tests for locations service API functions
 * Path: src/services/locations/api.ts
 */

const mockGetCachedOrFetchLocationFileData = jest.fn();

jest.mock('@/services/locations/util', () => {
  const actual = jest.requireActual('@/services/locations/util');
  return {
    __esModule: true,
    ...actual,
    getCachedOrFetchLocationFileData: (...args: any[]) =>
      mockGetCachedOrFetchLocationFileData(...args),
  };
});

import {
  getILCDLocationAll,
  getILCDLocationByValue,
  getILCDLocationByValues,
  getILCDLocationEntries,
} from '@/services/locations/api';

describe('Locations API (src/services/locations/api.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    expect(mockGetCachedOrFetchLocationFileData).toHaveBeenCalledWith('ILCDLocations.min.json.gz');
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

    expect(mockGetCachedOrFetchLocationFileData).toHaveBeenCalledWith(
      'ILCDLocations_zh.min.json.gz',
    );
    expect(result).toEqual({
      data: [{ file_name: 'ILCDLocations_zh', location: [{ '@value': 'CN', '#text': '中国' }] }],
      success: true,
    });
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
