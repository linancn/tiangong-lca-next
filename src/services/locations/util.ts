import {
  decompressGzipData,
  getAllCachedKeys,
  getCachedJsonEntry,
  getLocalStorageJson,
  initIndexedDbStore,
  putCachedJsonEntry,
  setLocalStorageJson,
} from '@/services/general/browserResourceCache';

const CACHE_KEY = 'location_cache_manifest';
const CACHE_DB_NAME = 'location_cache_db';
const CACHE_DB_VERSION = 1;
const CACHE_STORE_NAME = 'location_files';

export interface LocationCacheManifest {
  version: string;
  files: string[];
  cachedAt: number;
  decompressed: boolean;
}

const initDB = (): Promise<IDBDatabase> => {
  return initIndexedDbStore(CACHE_DB_NAME, CACHE_DB_VERSION, CACHE_STORE_NAME);
};

export const getLocationCacheManifest = (): LocationCacheManifest | null => {
  return getLocalStorageJson<LocationCacheManifest>(CACHE_KEY);
};

export const setLocationCacheManifest = (manifest: LocationCacheManifest): void => {
  setLocalStorageJson(CACHE_KEY, manifest);
};

export const getCachedLocationFileList = async (): Promise<string[]> => {
  try {
    const db = await initDB();
    return await getAllCachedKeys(db, CACHE_STORE_NAME);
  } catch (error) {
    console.error('Failed to get location cached file list:', error);
    return [];
  }
};

export const getCachedLocationFileData = async <T>(filename: string): Promise<T | null> => {
  try {
    const db = await initDB();
    const cachedEntry = await getCachedJsonEntry<T>(db, CACHE_STORE_NAME, filename);
    return cachedEntry?.data ?? null;
  } catch (error) {
    console.error(`Failed to read location cached file ${filename}:`, error);
    return null;
  }
};

export const cacheAndDecompressLocationFile = async (filename: string): Promise<boolean> => {
  try {
    const response = await fetch(`/locations/${filename}`);
    if (!response.ok) {
      console.warn(`Location source file not found: ${filename}`);
      return false;
    }

    const arrayBuffer = await response.arrayBuffer();
    const decompressedText = await decompressGzipData(arrayBuffer);
    const data = JSON.parse(decompressedText);

    const db = await initDB();
    await putCachedJsonEntry(db, CACHE_STORE_NAME, filename, data);

    return true;
  } catch (error) {
    console.error(`Failed to cache location file ${filename}:`, error);
    return false;
  }
};

export const getCachedOrFetchLocationFileData = async <T>(filename: string): Promise<T | null> => {
  const cachedData = await getCachedLocationFileData<T>(filename);
  if (cachedData) {
    return cachedData;
  }

  const cached = await cacheAndDecompressLocationFile(filename);
  if (!cached) {
    return null;
  }

  return getCachedLocationFileData<T>(filename);
};
