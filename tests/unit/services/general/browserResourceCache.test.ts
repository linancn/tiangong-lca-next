import {
  decompressGzipData,
  deleteCachedJsonEntry,
  getAllCachedKeys,
  putCachedJsonEntry,
  sha256Hex,
} from '@/services/general/browserResourceCache';

describe('browserResourceCache', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hashes text and binary payloads and fails closed without Web Crypto', async () => {
    const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    const digest = jest.fn().mockResolvedValue(new Uint8Array([0, 15, 255]).buffer);

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { subtle: { digest } },
    });

    try {
      await expect(sha256Hex('cache-text')).resolves.toBe('000fff');
      expect(digest).toHaveBeenLastCalledWith('SHA-256', new TextEncoder().encode('cache-text'));

      const binaryPayload = new Uint8Array([1, 2, 3]).buffer;
      await expect(sha256Hex(binaryPayload)).resolves.toBe('000fff');
      expect(digest).toHaveBeenLastCalledWith('SHA-256', new Uint8Array(binaryPayload));

      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: undefined,
      });
      await expect(sha256Hex('unsupported')).rejects.toThrow(
        'Web Crypto SHA-256 is not supported in this browser.',
      );
    } finally {
      if (cryptoDescriptor) {
        Object.defineProperty(globalThis, 'crypto', cryptoDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'crypto');
      }
    }
  });

  it('fails explicitly when the browser cannot decompress gzip data', async () => {
    const original = globalThis.DecompressionStream;
    Object.defineProperty(globalThis, 'DecompressionStream', {
      configurable: true,
      value: undefined,
    });

    await expect(decompressGzipData(new ArrayBuffer(0))).rejects.toThrow(
      'DecompressionStream is not supported in this browser.',
    );

    Object.defineProperty(globalThis, 'DecompressionStream', {
      configurable: true,
      value: original,
    });
  });

  it('streams gzip bytes through the browser decompressor', async () => {
    const enqueue = jest.fn();
    const close = jest.fn();
    const pipeThrough = jest.fn(() => 'decompressed-stream');
    const stream = { pipeThrough };
    const readableStream = jest.fn((options: any) => {
      options.start({ enqueue, close });
      return stream;
    });
    const decompressionStream = jest.fn(() => 'gzip-transform');
    const text = jest.fn().mockResolvedValue('{"ok":true}');
    const response = jest.fn(() => ({ text }));
    const originalReadableStream = globalThis.ReadableStream;
    const originalDecompressionStream = globalThis.DecompressionStream;
    const originalResponse = globalThis.Response;
    Object.defineProperties(globalThis, {
      ReadableStream: { configurable: true, value: readableStream },
      DecompressionStream: { configurable: true, value: decompressionStream },
      Response: { configurable: true, value: response },
    });

    const input = new Uint8Array([1, 2, 3]).buffer;
    await expect(decompressGzipData(input)).resolves.toBe('{"ok":true}');
    expect(enqueue).toHaveBeenCalledWith(new Uint8Array(input));
    expect(close).toHaveBeenCalled();
    expect(decompressionStream).toHaveBeenCalledWith('gzip');
    expect(pipeThrough).toHaveBeenCalledWith(decompressionStream.mock.instances[0]);
    expect(response).toHaveBeenCalledWith('decompressed-stream');

    Object.defineProperties(globalThis, {
      ReadableStream: { configurable: true, value: originalReadableStream },
      DecompressionStream: { configurable: true, value: originalDecompressionStream },
      Response: { configurable: true, value: originalResponse },
    });
  });

  it('stores entries without optional digest metadata and surfaces IndexedDB write errors', async () => {
    const request: any = {};
    const put = jest.fn((entry: unknown) => {
      void entry;
      return request;
    });
    const transaction: any = { objectStore: () => ({ put }) };
    const db: any = {
      transaction: jest.fn(() => transaction),
    };

    const promise = putCachedJsonEntry(db, 'cache-store', 'list.json', { files: [] });
    const error = new Error('write failed');
    request.error = error;
    request.onerror();

    await expect(promise).rejects.toBe(error);
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'list.json', data: { files: [] } }),
    );
    expect(put.mock.calls[0][0]).not.toHaveProperty('sha256');
  });

  it('falls back to the transaction error when a request error is absent', async () => {
    const request: any = {};
    const put = jest.fn(() => request);
    const transactionError = new Error('transaction failed');
    const transaction: any = {
      error: transactionError,
      objectStore: () => ({ put }),
    };
    const db: any = {
      transaction: jest.fn(() => transaction),
    };

    const promise = putCachedJsonEntry(db, 'cache-store', 'list.json', { files: [] });
    request.onerror();

    await expect(promise).rejects.toBe(transactionError);
  });

  it('persists optional digest and revision metadata together', async () => {
    const request: any = {};
    const put = jest.fn(() => request);
    const transaction: any = { objectStore: () => ({ put }) };
    const db: any = {
      transaction: jest.fn(() => transaction),
    };

    let settled = false;
    const promise = putCachedJsonEntry(
      db,
      'cache-store',
      'list.json',
      { files: [] },
      {
        revision: 'revision-2',
        sha256: 'a'.repeat(64),
      },
    ).then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    transaction.oncomplete();
    await promise;

    expect(settled).toBe(true);
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({ revision: 'revision-2', sha256: 'a'.repeat(64) }),
    );
  });

  it('rejects when the IndexedDB write transaction aborts', async () => {
    const request: any = {};
    const put = jest.fn(() => request);
    const transaction: any = { objectStore: () => ({ put }) };
    const db: any = {
      transaction: jest.fn(() => transaction),
    };
    const error = new Error('transaction aborted');

    const promise = putCachedJsonEntry(db, 'cache-store', 'list.json', { files: [] });
    transaction.error = error;
    transaction.onabort();

    await expect(promise).rejects.toBe(error);
  });

  it('uses the request error when a write transaction fails without its own error', async () => {
    const request: any = { error: new Error('request failed') };
    const put = jest.fn(() => request);
    const transaction: any = { objectStore: () => ({ put }) };
    const db: any = {
      transaction: jest.fn(() => transaction),
    };

    const promise = putCachedJsonEntry(db, 'cache-store', 'list.json', { files: [] });
    transaction.onerror();

    await expect(promise).rejects.toBe(request.error);
  });

  it('uses a deterministic fallback when an aborted write exposes no IndexedDB error', async () => {
    const request: any = {};
    const put = jest.fn(() => request);
    const transaction: any = { objectStore: () => ({ put }) };
    const db: any = {
      transaction: jest.fn(() => transaction),
    };

    const promise = putCachedJsonEntry(db, 'cache-store', 'list.json', { files: [] });
    transaction.onabort();

    await expect(promise).rejects.toThrow('Failed to write cache entry list.json.');
  });

  it('surfaces IndexedDB delete errors', async () => {
    const request: any = {};
    const db: any = {
      transaction: jest.fn(() => ({ objectStore: () => ({ delete: () => request }) })),
    };

    const promise = deleteCachedJsonEntry(db, 'cache-store', 'list.json');
    const error = new Error('delete failed');
    request.error = error;
    request.onerror();

    await expect(promise).rejects.toBe(error);
  });

  it('stringifies cache keys returned from IndexedDB', async () => {
    const request: any = {};
    const db: any = {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          getAllKeys: jest.fn(() => request),
        })),
      })),
    };

    const promise = getAllCachedKeys(db, 'cache-store');
    request.result = [1, 'two'];
    request.onsuccess();

    await expect(promise).resolves.toEqual(['1', 'two']);
  });

  it('falls back to an empty key list when IndexedDB returns no keys payload', async () => {
    const request: any = {};
    const db: any = {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          getAllKeys: jest.fn(() => request),
        })),
      })),
    };

    const promise = getAllCachedKeys(db, 'cache-store');
    request.result = undefined;
    request.onsuccess();

    await expect(promise).resolves.toEqual([]);
  });
});
