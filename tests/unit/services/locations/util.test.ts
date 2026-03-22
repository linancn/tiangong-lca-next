/**
 * Tests for locations service utility functions
 * Path: src/services/locations/util.ts
 */

const mockDecompressGzipData = jest.fn();
const mockGetAllCachedKeys = jest.fn();
const mockGetCachedJsonEntry = jest.fn();
const mockGetLocalStorageJson = jest.fn();
const mockInitIndexedDbStore = jest.fn();
const mockPutCachedJsonEntry = jest.fn();
const mockSetLocalStorageJson = jest.fn();

jest.mock('@/services/general/browserResourceCache', () => ({
  __esModule: true,
  decompressGzipData: (...args: any[]) => mockDecompressGzipData(...args),
  getAllCachedKeys: (...args: any[]) => mockGetAllCachedKeys(...args),
  getCachedJsonEntry: (...args: any[]) => mockGetCachedJsonEntry(...args),
  getLocalStorageJson: (...args: any[]) => mockGetLocalStorageJson(...args),
  initIndexedDbStore: (...args: any[]) => mockInitIndexedDbStore(...args),
  putCachedJsonEntry: (...args: any[]) => mockPutCachedJsonEntry(...args),
  setLocalStorageJson: (...args: any[]) => mockSetLocalStorageJson(...args),
}));

import {
  cacheAndDecompressLocationFile,
  getCachedLocationFileData,
  getCachedLocationFileList,
  getCachedOrFetchLocationFileData,
  getLocationCacheManifest,
  setLocationCacheManifest,
} from '@/services/locations/util';

describe('Locations Util (src/services/locations/util.ts)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('gets and sets the location cache manifest through browser cache helpers', () => {
    const manifest = { version: '1.0.0', files: ['a'], cachedAt: 1, decompressed: true };
    mockGetLocalStorageJson.mockReturnValue(manifest);

    expect(getLocationCacheManifest()).toEqual(manifest);
    setLocationCacheManifest(manifest);

    expect(mockGetLocalStorageJson).toHaveBeenCalledWith('location_cache_manifest');
    expect(mockSetLocalStorageJson).toHaveBeenCalledWith('location_cache_manifest', manifest);
  });

  it('returns cached location file names from IndexedDB', async () => {
    mockInitIndexedDbStore.mockResolvedValue('db');
    mockGetAllCachedKeys.mockResolvedValue(['one.json.gz', 'two.json.gz']);

    await expect(getCachedLocationFileList()).resolves.toEqual(['one.json.gz', 'two.json.gz']);
    expect(mockGetAllCachedKeys).toHaveBeenCalledWith('db', 'location_files');
  });

  it('returns an empty file list and logs when cache listing fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockInitIndexedDbStore.mockRejectedValue(new Error('db failed'));

    await expect(getCachedLocationFileList()).resolves.toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('returns cached location file data when present', async () => {
    mockInitIndexedDbStore.mockResolvedValue('db');
    mockGetCachedJsonEntry.mockResolvedValue({ data: { hello: 'world' } });

    await expect(getCachedLocationFileData('file.json.gz')).resolves.toEqual({ hello: 'world' });
    expect(mockGetCachedJsonEntry).toHaveBeenCalledWith('db', 'location_files', 'file.json.gz');
  });

  it('returns null and logs when reading cached location file data fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockInitIndexedDbStore.mockRejectedValue(new Error('db failed'));

    await expect(getCachedLocationFileData('file.json.gz')).resolves.toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('downloads, decompresses, parses, and stores a location file', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
    mockDecompressGzipData.mockResolvedValue(JSON.stringify({ ok: true }));
    mockInitIndexedDbStore.mockResolvedValue('db');

    await expect(cacheAndDecompressLocationFile('file.json.gz')).resolves.toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/locations/file.json.gz');
    expect(mockPutCachedJsonEntry).toHaveBeenCalledWith('db', 'location_files', 'file.json.gz', {
      ok: true,
    });
  });

  it('returns false when the remote location file is missing', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

    await expect(cacheAndDecompressLocationFile('missing.json.gz')).resolves.toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it('returns false when caching a location file throws', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network failed'));

    await expect(cacheAndDecompressLocationFile('broken.json.gz')).resolves.toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('returns cached location file data immediately when available', async () => {
    mockInitIndexedDbStore.mockResolvedValue('db');
    mockGetCachedJsonEntry.mockResolvedValue({ data: { value: 1 } });

    await expect(getCachedOrFetchLocationFileData('cached.json.gz')).resolves.toEqual({ value: 1 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches and rereads a location file when the cache is empty', async () => {
    mockInitIndexedDbStore.mockResolvedValue('db');
    mockGetCachedJsonEntry
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ data: { value: 2 } });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
    mockDecompressGzipData.mockResolvedValue(JSON.stringify({ value: 2 }));

    await expect(getCachedOrFetchLocationFileData('miss.json.gz')).resolves.toEqual({ value: 2 });
    expect(mockGetCachedJsonEntry).toHaveBeenCalledTimes(2);
  });

  it('returns null when a missing cached file also fails to download', async () => {
    mockInitIndexedDbStore.mockResolvedValue('db');
    mockGetCachedJsonEntry.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

    await expect(getCachedOrFetchLocationFileData('missing.json.gz')).resolves.toBeNull();
  });
});
