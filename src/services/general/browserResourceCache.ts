export interface CachedJsonEntry<T = unknown> {
  filename: string;
  data: T;
  size: number;
  cachedAt: number;
}

export const initIndexedDbStore = (
  dbName: string,
  dbVersion: number,
  storeName: string,
): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: 'filename' });
        store.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
    };
  });
};

export const decompressGzipData = async (gzipData: ArrayBuffer): Promise<string> => {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream is not supported in this browser.');
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(gzipData));
      controller.close();
    },
  });

  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
  const response = new Response(decompressedStream);
  return response.text();
};

export const putCachedJsonEntry = async (
  db: IDBDatabase,
  storeName: string,
  filename: string,
  data: unknown,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    const cachedEntry: CachedJsonEntry = {
      filename,
      data,
      size: JSON.stringify(data).length,
      cachedAt: Date.now(),
    };

    const request = store.put(cachedEntry);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getCachedJsonEntry = async <T>(
  db: IDBDatabase,
  storeName: string,
  filename: string,
): Promise<CachedJsonEntry<T> | null> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(filename);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result as CachedJsonEntry<T> | undefined;
      resolve(result ?? null);
    };
  });
};

export const getAllCachedKeys = async (db: IDBDatabase, storeName: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAllKeys();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(((request.result as string[]) || []).map(String));
  });
};

export const clearCachedStore = async (db: IDBDatabase, storeName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getCachedStoreSize = async (db: IDBDatabase, storeName: string): Promise<number> => {
  return new Promise((resolve) => {
    let totalSize = 0;
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        totalSize += cursor.value.size || 0;
        cursor.continue();
        return;
      }

      resolve(totalSize);
    };

    request.onerror = () => resolve(0);
  });
};

export const getLocalStorageJson = <T>(key: string): T | null => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
};

export const setLocalStorageJson = (key: string, value: unknown): void => {
  localStorage.setItem(key, JSON.stringify(value));
};
