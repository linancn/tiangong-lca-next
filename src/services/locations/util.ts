import {
  decompressGzipData,
  getAllCachedKeys,
  getCachedJsonEntry,
  getLocalStorageJson,
  initIndexedDbStore,
  putCachedJsonEntry,
  setLocalStorageJson,
  sha256Hex,
} from '@/services/general/browserResourceCache';
import { getReferenceRuntimeAssetCacheIdentity } from '../referenceResources/manifest';

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
    const identity = getReferenceRuntimeAssetCacheIdentity(filename);
    if (
      identity &&
      (identity.scope !== 'location' ||
        cachedEntry?.revision !== identity.cacheRevision ||
        cachedEntry?.sha256 !== identity.jsonSha256)
    ) {
      return null;
    }
    if (
      identity &&
      cachedEntry &&
      (await sha256Hex(JSON.stringify(cachedEntry.data))) !== identity.jsonSha256
    ) {
      return null;
    }
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
    const identity = getReferenceRuntimeAssetCacheIdentity(filename);
    if (identity?.scope !== 'location') {
      if (identity) {
        throw new Error(`Reference asset ${filename} is not a location asset.`);
      }
    } else if ((await sha256Hex(arrayBuffer)) !== identity.gzipSha256) {
      throw new Error(`Location gzip digest mismatch for ${filename}.`);
    }
    const decompressedText = await decompressGzipData(arrayBuffer);
    if (identity && (await sha256Hex(decompressedText)) !== identity.jsonSha256) {
      throw new Error(`Location JSON digest mismatch for ${filename}.`);
    }
    const data = JSON.parse(decompressedText);

    const db = await initDB();
    if (identity) {
      await putCachedJsonEntry(db, CACHE_STORE_NAME, filename, data, {
        revision: identity.cacheRevision,
        sha256: identity.jsonSha256,
      });
    } else {
      await putCachedJsonEntry(db, CACHE_STORE_NAME, filename, data);
    }

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
