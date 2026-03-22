/**
 * Tests for classifications service utility functions
 * Path: src/services/classifications/util.ts
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
  cacheAndDecompressClassificationFile,
  categoryTypeOptions,
  genClass,
  genClassZH,
  getCachedClassificationFileData,
  getCachedClassificationFileList,
  getCachedOrFetchClassificationFileData,
  getClassificationCacheManifest,
  setClassificationCacheManifest,
} from '@/services/classifications/util';

describe('Classifications Util (src/services/classifications/util.ts)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('exposes the expected category type options', () => {
    expect(categoryTypeOptions.map((item) => item.en)).toEqual([
      'Process',
      'Flow',
      'FlowProperty',
      'UnitGroup',
      'Contact',
      'Source',
      'LCIAMethod',
    ]);
  });

  it('builds classification trees recursively in genClass', () => {
    const result = genClass([
      {
        '@id': 'root',
        '@name': 'Root',
        category: [{ '@id': 'leaf', '@name': 'Leaf' }],
      },
    ]);

    expect(result).toEqual([
      {
        id: 'root',
        value: 'Root',
        label: 'Root',
        children: [{ id: 'leaf', value: 'Leaf', label: 'Leaf', children: [] }],
      },
    ]);
  });

  it('uses translated labels in genClassZH and falls back to English when needed', () => {
    const result = genClassZH(
      [
        {
          '@id': 'root',
          '@name': 'Root',
          category: [{ '@id': 'leaf', '@name': 'Leaf' }],
        },
      ],
      [{ '@id': 'root', '@name': '根' }],
    );

    expect(result).toEqual([
      {
        id: 'root',
        value: 'Root',
        label: '根',
        children: [{ id: 'leaf', value: 'Leaf', label: 'Leaf', children: [] }],
      },
    ]);
  });

  it('gets and sets the classification cache manifest through browser cache helpers', () => {
    const manifest = { version: '1.0.0', files: ['a'], cachedAt: 1, decompressed: true };
    mockGetLocalStorageJson.mockReturnValue(manifest);

    expect(getClassificationCacheManifest()).toEqual(manifest);
    setClassificationCacheManifest(manifest);

    expect(mockGetLocalStorageJson).toHaveBeenCalledWith('classification_cache_manifest');
    expect(mockSetLocalStorageJson).toHaveBeenCalledWith('classification_cache_manifest', manifest);
  });

  it('returns cached classification file names from IndexedDB', async () => {
    mockInitIndexedDbStore.mockResolvedValue('db');
    mockGetAllCachedKeys.mockResolvedValue(['one.json.gz', 'two.json.gz']);

    await expect(getCachedClassificationFileList()).resolves.toEqual([
      'one.json.gz',
      'two.json.gz',
    ]);
    expect(mockGetAllCachedKeys).toHaveBeenCalledWith('db', 'classification_files');
  });

  it('returns an empty file list and logs when cache listing fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockInitIndexedDbStore.mockRejectedValue(new Error('db failed'));

    await expect(getCachedClassificationFileList()).resolves.toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('returns cached classification file data when present', async () => {
    mockInitIndexedDbStore.mockResolvedValue('db');
    mockGetCachedJsonEntry.mockResolvedValue({ data: { hello: 'world' } });

    await expect(getCachedClassificationFileData('file.json.gz')).resolves.toEqual({
      hello: 'world',
    });
    expect(mockGetCachedJsonEntry).toHaveBeenCalledWith(
      'db',
      'classification_files',
      'file.json.gz',
    );
  });

  it('returns null and logs when reading cached classification file data fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockInitIndexedDbStore.mockRejectedValue(new Error('db failed'));

    await expect(getCachedClassificationFileData('file.json.gz')).resolves.toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('downloads, decompresses, parses, and stores a classification file', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
    mockDecompressGzipData.mockResolvedValue(JSON.stringify({ ok: true }));
    mockInitIndexedDbStore.mockResolvedValue('db');

    await expect(cacheAndDecompressClassificationFile('file.json.gz')).resolves.toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/classifications/file.json.gz');
    expect(mockPutCachedJsonEntry).toHaveBeenCalledWith(
      'db',
      'classification_files',
      'file.json.gz',
      {
        ok: true,
      },
    );
  });

  it('returns false when the remote classification file is missing', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

    await expect(cacheAndDecompressClassificationFile('missing.json.gz')).resolves.toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it('returns false when caching a classification file throws', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network failed'));

    await expect(cacheAndDecompressClassificationFile('broken.json.gz')).resolves.toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('returns cached classification file data immediately when available', async () => {
    mockInitIndexedDbStore.mockResolvedValue('db');
    mockGetCachedJsonEntry.mockResolvedValue({ data: { value: 1 } });

    await expect(getCachedOrFetchClassificationFileData('cached.json.gz')).resolves.toEqual({
      value: 1,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches and rereads a classification file when the cache is empty', async () => {
    mockInitIndexedDbStore.mockResolvedValue('db');
    mockGetCachedJsonEntry
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ data: { value: 2 } });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
    mockDecompressGzipData.mockResolvedValue(JSON.stringify({ value: 2 }));

    await expect(getCachedOrFetchClassificationFileData('miss.json.gz')).resolves.toEqual({
      value: 2,
    });
    expect(mockGetCachedJsonEntry).toHaveBeenCalledTimes(2);
  });

  it('returns null when a missing cached file also fails to download', async () => {
    mockInitIndexedDbStore.mockResolvedValue('db');
    mockGetCachedJsonEntry.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

    await expect(getCachedOrFetchClassificationFileData('missing.json.gz')).resolves.toBeNull();
  });
});
