/**
 * Tests for LCIA Methods utility functions
 * Path: src/services/lciaMethods/util.ts
 */

const mockGetLangJson = jest.fn((value: any) => {
  if (Array.isArray(value)) {
    return (
      value.find((item: any) => item?.['@xml:lang'] === 'en')?.['#text'] ?? value[0]?.['#text']
    );
  }
  if (value && typeof value === 'object') {
    return value['#text'] ?? value.en ?? '';
  }
  return value ?? '';
});

jest.mock('@/services/general/util', () => {
  const actual: any = jest.requireActual('@/services/general/util');
  return {
    __esModule: true,
    ...actual,
    getLangJson: (...args: any[]) => mockGetLangJson.apply(null, args),
  };
});

import LCIAResultCalculation, {
  cacheAndDecompressMethod,
  clearCache,
  forceRefreshCache,
  getCachedMethodList,
  getCacheManifest,
  getCacheStatus,
  getDecompressedMethod,
  getReferenceQuantityFromMethod,
  isMethodCached,
} from '@/services/lciaMethods/util';

// Mock IndexedDB
class MockIDBRequest {
  result: any = null;
  error: any = null;
  onsuccess: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  succeed(result: any) {
    this.result = result;
    if (this.onsuccess) {
      this.onsuccess({ target: this });
    }
  }

  fail(error: any) {
    this.error = error;
    if (this.onerror) {
      this.onerror({ target: this });
    }
  }
}

class MockIDBObjectStore {
  private data: Map<string, any> = new Map();
  private cursorShouldFail = false;

  get(key: string): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      request.succeed(this.data.get(key));
    }, 0);
    return request;
  }

  put(value: any): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.data.set(value.filename, value);
      request.succeed(value);
    }, 0);
    return request;
  }

  delete(key: string): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.data.delete(key);
      request.succeed(undefined);
    }, 0);
    return request;
  }

  clear(): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.data.clear();
      request.succeed(undefined);
    }, 0);
    return request;
  }

  getAllKeys(): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      request.succeed(Array.from(this.data.keys()));
    }, 0);
    return request;
  }

  createIndex() {
    return this;
  }

  openCursor(): MockIDBRequest {
    const request = new MockIDBRequest();
    const entries = Array.from(this.data.values());
    let index = 0;

    const emit = () => {
      if (this.cursorShouldFail) {
        request.fail(new Error('Cursor failure'));
        return;
      }

      if (!request.onsuccess) {
        return;
      }

      if (index < entries.length) {
        const cursor = {
          value: entries[index],
          continue: () => {
            index += 1;
            setTimeout(emit, 0);
          },
        };
        request.onsuccess({ target: { result: cursor } });
      } else {
        request.onsuccess({ target: { result: null } });
      }
    };

    setTimeout(emit, 0);
    return request;
  }

  setCursorShouldFail(shouldFail: boolean) {
    this.cursorShouldFail = shouldFail;
  }

  // Test helper methods
  _getData() {
    return this.data;
  }

  _setData(key: string, value: any) {
    this.data.set(key, value);
  }
}

class MockIDBTransaction {
  constructor(private store: MockIDBObjectStore) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  objectStore(_name: string): MockIDBObjectStore {
    return this.store;
  }
}

class MockIDBDatabase {
  objectStoreNames = { contains: () => false };
  private store = new MockIDBObjectStore();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transaction(_storeNames: string[], _mode: string): MockIDBTransaction {
    return new MockIDBTransaction(this.store);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createObjectStore(_name: string, _options: any): MockIDBObjectStore {
    return this.store;
  }

  // Test helper methods
  _getStore() {
    return this.store;
  }
}

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    },
    _store: store,
  };
};

describe('LCIA Methods Utility Functions', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;
  let mockDB: MockIDBDatabase;

  const setCachedMethod = (
    filename: string,
    data: any,
    size: number = JSON.stringify(data).length,
  ) => {
    mockDB._getStore()._setData(filename, {
      filename,
      data,
      size,
      cachedAt: Date.now(),
    });
  };

  beforeEach(() => {
    // Create fresh localStorage mock
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock IndexedDB
    mockDB = new MockIDBDatabase();
    const mockIndexedDB = {
      open: jest.fn(() => {
        const request = new MockIDBRequest();
        (request as any).onupgradeneeded = null;
        setTimeout(() => {
          if ((request as any).onupgradeneeded) {
            // Pass the database in the event's target.result
            (request as any).onupgradeneeded({
              target: {
                result: mockDB,
                transaction: null,
              },
            });
          }
          request.succeed(mockDB);
        }, 0);
        return request;
      }),
    };
    Object.defineProperty(global, 'indexedDB', {
      value: mockIndexedDB,
      writable: true,
    });

    // Mock DecompressionStream
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class MockDecompressionStream {
      // eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-unused-vars
      constructor(_format: string) {}
    }
    Object.defineProperty(global, 'DecompressionStream', {
      value: MockDecompressionStream,
      writable: true,
    });

    // Mock ReadableStream
    class MockReadableStream {
      constructor(underlyingSource?: any) {
        if (underlyingSource?.start) {
          const controller = {
            enqueue: jest.fn(),
            close: jest.fn(),
          };
          underlyingSource.start(controller);
        }
      }
      pipeThrough() {
        return this;
      }
    }
    Object.defineProperty(global, 'ReadableStream', {
      value: MockReadableStream,
      writable: true,
    });

    // Mock Response for decompression
    global.Response = class MockResponse {
      body: any;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(body?: any, _init?: any) {
        this.body = body;
      }
      async text() {
        return JSON.stringify({ id: 'test', name: 'Test Method' });
      }
      async json() {
        return { id: 'test', name: 'Test Method' };
      }
      async blob() {
        return new Blob([JSON.stringify({ id: 'test', name: 'Test Method' })]);
      }
    } as any;

    jest.clearAllMocks();
    mockGetLangJson.mockReset();
    mockGetLangJson.mockImplementation((value: any) => {
      if (Array.isArray(value)) {
        return (
          value.find((item: any) => item?.['@xml:lang'] === 'en')?.['#text'] ?? value[0]?.['#text']
        );
      }
      if (value && typeof value === 'object') {
        return value['#text'] ?? value.en ?? '';
      }
      return value ?? '';
    });
  });

  describe('getDecompressedMethod', () => {
    it('should get method from IndexedDB successfully', async () => {
      const mockFilename = 'test-method_01.00.000.json.gz';
      const mockData = { id: 'test-method', name: 'Test Method' };

      // Pre-populate IndexedDB mock
      const store = mockDB.transaction([], 'readwrite').objectStore('');
      await new Promise<void>((resolve) => {
        const request = store.put({
          filename: mockFilename,
          data: mockData,
          size: JSON.stringify(mockData).length,
          cachedAt: Date.now(),
        });
        request.onsuccess = () => resolve();
      });

      const result = await getDecompressedMethod(mockFilename);

      expect(result).toEqual(mockData);
    });

    it('should return null when method not found in IndexedDB', async () => {
      const result = await getDecompressedMethod('nonexistent-method.json.gz');

      expect(result).toBeNull();
    });

    it('should return null when IndexedDB fails', async () => {
      const originalOpen = global.indexedDB.open;
      (global.indexedDB.open as any) = jest.fn(() => {
        const request = new MockIDBRequest();
        setTimeout(() => request.fail(new Error('DB Error')), 0);
        return request;
      });

      const result = await getDecompressedMethod('test.json.gz');

      expect(result).toBeNull();
      (global.indexedDB.open as any) = originalOpen;
    });
  });

  describe('cacheAndDecompressMethod', () => {
    it('should cache method successfully for gzipped file', async () => {
      const mockFilename = 'test-method_01.00.000.json.gz';
      const mockDecompressedData = { id: 'test-method', name: 'Test Method' };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
      });

      // Mock Response.text() to return decompressed data
      const originalResponse = global.Response;
      global.Response = class MockResponse {
        async text() {
          return JSON.stringify(mockDecompressedData);
        }
      } as any;

      const result = await cacheAndDecompressMethod(mockFilename);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(`/lciamethods/${mockFilename}`);

      global.Response = originalResponse;
    });

    it('should cache method successfully for non-gzipped file', async () => {
      const mockFilename = 'list.json';
      const mockData = { methods: ['method1', 'method2'] };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockData)),
      });

      const result = await cacheAndDecompressMethod(mockFilename);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(`/lciamethods/${mockFilename}`);
    });

    it('should return false when fetch fails', async () => {
      const mockFilename = 'test-method.json.gz';

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await cacheAndDecompressMethod(mockFilename);

      expect(result).toBe(false);
    });

    it('should return false when decompression fails', async () => {
      const mockFilename = 'corrupt-method.json.gz';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
      });

      // Mock Response to throw error
      const originalResponse = global.Response;
      global.Response = class MockResponse {
        async text() {
          throw new Error('Decompression failed');
        }
      } as any;

      const result = await cacheAndDecompressMethod(mockFilename);

      expect(result).toBe(false);
      global.Response = originalResponse;
    });
  });

  describe('getCacheManifest', () => {
    it('should return cache manifest when valid', () => {
      const mockManifest = {
        version: '1.0.0',
        cachedMethods: ['method1.json.gz', 'method2.json.gz'],
        timestamp: Date.now(),
      };

      localStorageMock._store['lcia_methods_cache_manifest'] = JSON.stringify(mockManifest);

      const result = getCacheManifest();

      expect(result).toEqual(mockManifest);
    });

    it('should return null when manifest does not exist', () => {
      const result = getCacheManifest();

      expect(result).toBeNull();
    });

    it('should return null when manifest is invalid JSON', () => {
      localStorageMock._store['lcia_methods_cache_manifest'] = 'invalid json';

      const result = getCacheManifest();

      expect(result).toBeNull();
    });
  });

  describe('getCacheStatus', () => {
    it('should return cache status with valid manifest', async () => {
      const cachedAt = Date.now();
      const mockManifest = {
        version: '1.0.0',
        files: ['method1.json.gz', 'method2.json.gz'],
        cachedAt,
        decompressed: true,
      };

      localStorageMock._store['lcia_methods_cache_manifest'] = JSON.stringify(mockManifest);

      const result = await getCacheStatus();

      expect(result.isCached).toBe(true);
      expect(result.fileCount).toBe(2);
      expect(result.version).toBe('1.0.0');
      expect(result.decompressed).toBe(true);
      expect(typeof result.age).toBe('number');
      expect(typeof result.ageHours).toBe('number');
    });

    it('should return uncached status when no manifest', async () => {
      const result = await getCacheStatus();

      expect(result.isCached).toBe(false);
      expect(result.fileCount).toBe(0);
      expect(result.version).toBeNull();
    });

    it('should calculate cache age correctly', async () => {
      const oneHourAgo = Date.now() - 1000 * 60 * 60;
      const mockManifest = {
        version: '1.0.0',
        files: ['method1.json.gz'],
        cachedAt: oneHourAgo,
        decompressed: true,
      };

      localStorageMock._store['lcia_methods_cache_manifest'] = JSON.stringify(mockManifest);

      const result = await getCacheStatus();

      expect(result.isCached).toBe(true);
      expect(result.ageHours).toBeGreaterThanOrEqual(1);
      expect(result.ageHours).toBeLessThan(1.1);
    });

    it('should mark cache as stale when older than 24 hours', async () => {
      const twoDaysAgo = Date.now() - 1000 * 60 * 60 * 48;
      const mockManifest = {
        version: '1.0.0',
        files: ['method1.json.gz'],
        cachedAt: twoDaysAgo,
        decompressed: true,
      };

      localStorageMock._store['lcia_methods_cache_manifest'] = JSON.stringify(mockManifest);

      const result = await getCacheStatus();

      expect(result.isCached).toBe(true);
      expect(result.isStale).toBe(true);
    });

    it('should calculate indexedDB size from cursor iteration', async () => {
      const cachedAt = Date.now();
      localStorageMock._store['lcia_methods_cache_manifest'] = JSON.stringify({
        version: '1.0.0',
        files: ['method1.json.gz'],
        cachedAt,
      });

      setCachedMethod('method1.json.gz', { id: '1' }, 1536);
      setCachedMethod('method2.json.gz', { id: '2' }, 512);

      const result = await getCacheStatus();

      expect(result.indexedDBSize).toBe(2);
      expect(result.decompressed).toBe(false);
    });

    it('should fall back to zero indexedDB size when cursor request errors', async () => {
      localStorageMock._store['lcia_methods_cache_manifest'] = JSON.stringify({
        version: '1.0.0',
        files: ['method1.json.gz'],
        cachedAt: Date.now(),
      });

      mockDB._getStore().setCursorShouldFail(true);
      const result = await getCacheStatus();

      expect(result.isCached).toBe(true);
      expect(result.indexedDBSize).toBe(0);
    });
  });

  describe('clearCache', () => {
    it('should clear all LCIA method cache', async () => {
      localStorageMock._store['lcia_methods_cache_manifest'] = JSON.stringify({
        version: '1.0.0',
        files: ['method1.json.gz', 'method2.json.gz'],
        cachedAt: Date.now(),
        decompressed: true,
      });
      localStorageMock._store['other_data'] = 'should not be removed';

      // Add some data to IndexedDB
      const store = mockDB._getStore();
      store._setData('method1.json.gz', { filename: 'method1.json.gz', data: {} });
      store._setData('method2.json.gz', { filename: 'method2.json.gz', data: {} });

      const result = await clearCache();

      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('lcia_methods_cache_manifest');
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('other_data');
      // IndexedDB should be cleared
      expect(store._getData().size).toBe(0);
    });

    it('should return false when clearing fails', async () => {
      localStorageMock._store['lcia_method_test.json.gz'] = '{"id": "test"}';

      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Cannot remove item');
      });

      const result = await clearCache();

      expect(result).toBe(false);
    });
  });

  describe('forceRefreshCache', () => {
    it('should clear cache', async () => {
      localStorageMock._store['lcia_cache_manifest'] = '{"version": "1.0.0"}';
      localStorageMock._store['lcia_method_test.json.gz'] = '{"id": "test"}';

      await forceRefreshCache();

      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('isMethodCached', () => {
    it('should return true when method is cached', async () => {
      const mockFilename = 'test-method.json.gz';
      const mockData = { id: 'test-method', data: {} };

      const store = mockDB._getStore();
      store._setData(mockFilename, mockData);

      const result = await isMethodCached(mockFilename);

      expect(result).toBe(true);
    });

    it('should return false when method is not cached', async () => {
      const result = await isMethodCached('nonexistent-method.json.gz');

      expect(result).toBe(false);
    });

    it('should return false when cached data is invalid JSON', async () => {
      const mockFilename = 'corrupt-method.json.gz';
      // Don't set any data - this simulates corrupt/missing data
      // Since getDecompressedMethod will return null for nonexistent data

      const result = await isMethodCached(mockFilename);

      expect(result).toBe(false);
    });
  });

  describe('getCachedMethodList', () => {
    it('should return list of cached methods', async () => {
      const store = mockDB._getStore();
      store._setData('method1.json.gz', { id: '1' });
      store._setData('method2.json.gz', { id: '2' });

      const result = await getCachedMethodList();

      expect(result).toContain('method1.json.gz');
      expect(result).toContain('method2.json.gz');
      expect(result.length).toBe(2);
    });

    it('should return empty array when no methods cached', async () => {
      const result = await getCachedMethodList();

      expect(result).toEqual([]);
    });

    it('should return empty array when indexedDB open fails', async () => {
      const originalOpen = global.indexedDB.open;
      (global.indexedDB.open as any) = jest.fn(() => {
        const request = new MockIDBRequest();
        setTimeout(() => request.fail(new Error('open failed')), 0);
        return request;
      });

      const result = await getCachedMethodList();

      expect(result).toEqual([]);
      (global.indexedDB.open as any) = originalOpen;
    });
  });

  describe('getReferenceQuantityFromMethod', () => {
    it('should return early when lcia results are undefined', async () => {
      global.fetch = jest.fn();

      const result = await getReferenceQuantityFromMethod(undefined);

      expect(result).toBeUndefined();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should enrich results from cached list.json without network refresh', async () => {
      setCachedMethod('list.json', {
        files: [
          {
            id: 'method-1',
            referenceQuantity: {
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'kg CO2-eq' }],
            },
          },
        ],
      });

      const lciaResults: any[] = [
        {
          referenceToLCIAMethodDataSet: {
            '@refObjectId': 'method-1',
          },
        },
      ];
      global.fetch = jest.fn();

      await getReferenceQuantityFromMethod(lciaResults);

      expect(lciaResults[0].referenceQuantityDesc).toBe('kg CO2-eq');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should refresh stale list.json cache and enrich reference quantity', async () => {
      setCachedMethod('list.json', {
        files: [{ id: 'method-1' }],
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            files: [
              {
                id: 'method-1',
                referenceQuantity: {
                  'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'kg refreshed' }],
                },
              },
            ],
          }),
        ),
      });

      const lciaResults: any[] = [
        {
          referenceToLCIAMethodDataSet: {
            '@refObjectId': 'method-1',
          },
        },
      ];

      await getReferenceQuantityFromMethod(lciaResults);

      expect(global.fetch).toHaveBeenCalledWith('/lciamethods/list.json');
      expect(lciaResults[0].referenceQuantityDesc).toBe('kg refreshed');
    });

    it('should stop when stale list.json cannot be refreshed', async () => {
      setCachedMethod('list.json', {
        files: [{ id: 'method-1' }],
      });
      global.fetch = jest.fn().mockResolvedValue({ ok: false });

      const lciaResults: any[] = [
        {
          referenceToLCIAMethodDataSet: {
            '@refObjectId': 'method-1',
          },
        },
      ];

      await getReferenceQuantityFromMethod(lciaResults);

      expect(lciaResults[0].referenceQuantityDesc).toBeUndefined();
    });
  });

  describe('LCIAResultCalculation', () => {
    it('should aggregate factors and return LCIA results for matching flow-direction keys', async () => {
      setCachedMethod('list.json', {
        files: [
          {
            id: 'method-1',
            version: '01.00.000',
            description: [{ '@xml:lang': 'en', '#text': 'Method 1' }],
            referenceQuantity: {
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'kg CO2-eq' }],
            },
          },
        ],
      });
      setCachedMethod('flow_factors.json.gz', {
        'flow-1:OUTPUT': {
          factor: [
            { key: 'method-1', value: '2' },
            { key: 'method-1', value: '1.5' },
            { key: 'method-2', value: 'bad-number' },
          ],
        },
      });

      const result = await LCIAResultCalculation([
        {
          referenceToFlowDataSet: { '@refObjectId': 'flow-1' },
          exchangeDirection: 'output',
          meanAmount: '3',
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result?.[0].key).toBe('method-1');
      expect(result?.[0].meanAmount).toBe('10.5');
    });

    it('should return empty array when flow factors are empty', async () => {
      setCachedMethod('list.json', {
        files: [
          {
            id: 'method-1',
            version: '01.00.000',
            description: [],
            referenceQuantity: {
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'kg CO2-eq' }],
            },
          },
        ],
      });
      setCachedMethod('flow_factors.json.gz', {});

      const result = await LCIAResultCalculation([
        {
          referenceToFlowDataSet: { '@refObjectId': 'flow-1' },
          exchangeDirection: 'OUTPUT',
          meanAmount: '2',
        },
      ]);

      expect(result).toEqual([]);
    });

    it('should return undefined when list.json is unavailable and refresh fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false });

      const result = await LCIAResultCalculation([
        {
          referenceToFlowDataSet: { '@refObjectId': 'flow-1' },
          exchangeDirection: 'OUTPUT',
          meanAmount: '2',
        },
      ]);

      expect(global.fetch).toHaveBeenCalledWith('/lciamethods/list.json');
      expect(result).toBeUndefined();
    });

    it('should return empty array when flow factor refresh fails', async () => {
      setCachedMethod('list.json', {
        files: [
          {
            id: 'method-1',
            version: '01.00.000',
            description: [],
            referenceQuantity: {
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'kg CO2-eq' }],
            },
          },
        ],
      });
      global.fetch = jest.fn().mockResolvedValue({ ok: false });

      const result = await LCIAResultCalculation([
        {
          referenceToFlowDataSet: { '@refObjectId': 'flow-1' },
          exchangeDirection: 'OUTPUT',
          meanAmount: '2',
        },
      ]);

      expect(global.fetch).toHaveBeenCalledWith('/lciamethods/flow_factors.json.gz');
      expect(result).toEqual([]);
    });

    it('should refresh stale list.json before calculating', async () => {
      setCachedMethod('list.json', {
        files: [{ id: 'method-1', version: '01.00.000', description: [] }],
      });
      setCachedMethod('flow_factors.json.gz', {
        'flow-1:OUTPUT': {
          factor: [{ key: 'method-1', value: '1' }],
        },
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            files: [
              {
                id: 'method-1',
                version: '01.00.000',
                description: [{ '@xml:lang': 'en', '#text': 'Updated Method' }],
                referenceQuantity: {
                  'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'kg refreshed' }],
                },
              },
            ],
          }),
        ),
      });

      const result = await LCIAResultCalculation([
        {
          referenceToFlowDataSet: { '@refObjectId': 'flow-1' },
          exchangeDirection: 'OUTPUT',
          meanAmount: '5',
        },
      ]);

      expect(global.fetch).toHaveBeenCalledWith('/lciamethods/list.json');
      expect(result?.[0].key).toBe('method-1');
      expect(result?.[0].meanAmount).toBe('5');
    });
  });
});
