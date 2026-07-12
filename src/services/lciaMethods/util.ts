import {
  clearCachedStore,
  decompressGzipData,
  deleteCachedJsonEntry,
  getAllCachedKeys,
  getCachedJsonEntry,
  getCachedStoreSize,
  getLocalStorageJson,
  initIndexedDbStore,
  putCachedJsonEntry,
  setLocalStorageJson,
} from '@/services/general/browserResourceCache';
import { getLangJson } from '@/services/general/util';
import type { ProcessExchangeData } from '@/services/processes/data';
import { buildStaticCalculationFailure, calculateStaticLcia } from './calculation';
import { LciaFlowFactorMap, LciaMethodListData, LCIAResultTable } from './data';
import { computeLciaSha256, STATIC_LCIA_CACHE_MANIFEST, toLciaArtifactLocatorId } from './evidence';

// Enhanced LCIA Cache Management with Decompression
const CACHE_KEY = 'lcia_methods_cache_manifest';
const CACHE_DB_NAME = 'lcia_cache_db';
const CACHE_DB_VERSION = 1;
const CACHE_STORE_NAME = 'lcia_methods';

export interface LciaCacheManifest {
  version: string;
  cacheSchemaVersion?: 'lcia.browser_cache_manifest.v2';
  bundleVersion?: string;
  sourceSnapshotSha256?: string;
  files: string[];
  cachedAt: number;
  decompressed: boolean; // Track if files are stored decompressed
}

export type CachedLciaMethod<T = unknown> =
  import('@/services/general/browserResourceCache').CachedJsonEntry<T>;

/**
 * Initialize IndexedDB for storing decompressed LCIA methods
 */
const initDB = (): Promise<IDBDatabase> => {
  return initIndexedDbStore(CACHE_DB_NAME, CACHE_DB_VERSION, CACHE_STORE_NAME);
};

/**
 * Decompress gzipped content using native browser API
 */
const decompressGzip = async (gzipData: ArrayBuffer): Promise<string> => {
  try {
    return await decompressGzipData(gzipData);
  } catch (error) {
    throw new Error(`Failed to decompress data: ${error}`);
  }
};

/**
 * Store decompressed LCIA method in IndexedDB
 */
const storeDecompressedMethod = async (
  db: IDBDatabase,
  filename: string,
  data: unknown,
  sha256?: string,
): Promise<void> => {
  return putCachedJsonEntry(db, CACHE_STORE_NAME, filename, data, { sha256 });
};

const expectedCacheFile = (filename: string) => {
  if (filename === STATIC_LCIA_CACHE_MANIFEST.files.list.path) {
    return STATIC_LCIA_CACHE_MANIFEST.files.list;
  }
  if (filename === STATIC_LCIA_CACHE_MANIFEST.files.factors.path) {
    return STATIC_LCIA_CACHE_MANIFEST.files.factors;
  }
  return null;
};

/**
 * Get decompressed LCIA method from IndexedDB
 */
export const getDecompressedMethodEntry = async <T>(
  filename: string,
): Promise<CachedLciaMethod<T> | null> => {
  try {
    const db = await initDB();
    return await getCachedJsonEntry<T>(db, CACHE_STORE_NAME, filename);
  } catch (error) {
    console.error(`Failed to get decompressed method ${filename}:`, error);
    return null;
  }
};

export const getDecompressedMethod = async <T>(filename: string): Promise<T | null> =>
  (await getDecompressedMethodEntry<T>(filename))?.data ?? null;

/**
 * Download, decompress and cache LCIA method
 */
export const cacheAndDecompressMethod = async (filename: string): Promise<boolean> => {
  try {
    const expected = expectedCacheFile(filename);
    if (!expected) {
      console.warn(`⚠️ File is not part of the reviewed LCIA bundle: ${filename}`);
      return false;
    }

    // Download the file
    const response = await fetch(`/lciamethods/${filename}`);
    if (!response.ok) {
      console.warn(`⚠️ File not found: ${filename}`);
      return false;
    }

    // Verify the exact downloaded bytes before parsing or writing anything to IndexedDB.
    const arrayBuffer = await response.arrayBuffer();
    const sha256 = await computeLciaSha256(arrayBuffer);
    if (arrayBuffer.byteLength !== expected.byte_size || sha256 !== expected.sha256) {
      console.error(`❌ Rejected unreviewed LCIA bundle bytes: ${filename}`);
      return false;
    }

    let data: unknown;
    if (filename.endsWith('.json.gz')) {
      const decompressedText = await decompressGzip(arrayBuffer);
      data = JSON.parse(decompressedText);
    } else {
      const text = new TextDecoder().decode(arrayBuffer);
      data = JSON.parse(text);
    }

    // Store in IndexedDB
    const db = await initDB();
    await storeDecompressedMethod(db, filename, data, sha256);

    return true;
  } catch (error) {
    console.error(`❌ Failed to cache and decompress ${filename}:`, error);
    return false;
  }
};

/**
 * Read one reviewed LCIA cache entry. Old entries without a digest and entries with
 * a different digest are evicted and downloaded exactly once before failing closed.
 */
export const getVerifiedDecompressedMethodEntry = async <T>(
  filename: string,
): Promise<CachedLciaMethod<T> | null> => {
  const expected = expectedCacheFile(filename);
  if (!expected) {
    return null;
  }
  let entry = await getDecompressedMethodEntry<T>(filename);
  if (entry?.sha256 === expected.sha256) {
    return entry;
  }

  try {
    const db = await initDB();
    if (entry) {
      await deleteCachedJsonEntry(db, CACHE_STORE_NAME, filename);
    }
  } catch (error) {
    console.warn(`Failed to evict stale LCIA cache entry ${filename}:`, error);
    return null;
  }

  if (!(await cacheAndDecompressMethod(filename))) {
    return null;
  }
  entry = await getDecompressedMethodEntry<T>(filename);
  return entry?.sha256 === expected.sha256 ? entry : null;
};

/**
 * Get the current cache manifest from localStorage
 */
export const getCacheManifest = (): LciaCacheManifest | null => {
  return getLocalStorageJson<LciaCacheManifest>(CACHE_KEY);
};

export const setCacheManifest = (manifest: LciaCacheManifest): void => {
  setLocalStorageJson(CACHE_KEY, manifest);
};

/**
 * Get cache statistics and status
 */
export const getCacheStatus = async () => {
  const manifest = getCacheManifest();

  if (!manifest) {
    return {
      isCached: false,
      fileCount: 0,
      version: null,
      age: 0,
      ageHours: 0,
      decompressed: false,
      indexedDBSize: 0,
    };
  }

  const age = Date.now() - manifest.cachedAt;
  const ageHours = age / (1000 * 60 * 60);

  // Calculate IndexedDB cache size
  let indexedDBSize = 0;
  try {
    const db = await initDB();
    indexedDBSize = await getCachedStoreSize(db, CACHE_STORE_NAME);
  } catch (error) {
    console.warn('Failed to calculate IndexedDB size:', error);
  }

  return {
    isCached: true,
    fileCount: manifest.files.length,
    version: manifest.version,
    age,
    ageHours,
    cachedAt: new Date(manifest.cachedAt),
    isStale: ageHours > 24,
    decompressed: manifest.decompressed || false,
    indexedDBSize: Math.round(indexedDBSize / 1024), // KB
  };
};

/**
 * Clear the LCIA cache (both localStorage and IndexedDB)
 */
export const clearCache = async (): Promise<boolean> => {
  try {
    // Clear localStorage
    localStorage.removeItem(CACHE_KEY);

    // Clear IndexedDB
    const db = await initDB();
    await clearCachedStore(db, CACHE_STORE_NAME);

    return true;
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
    return false;
  }
};

/**
 * Force refresh cache by clearing it first
 */
export const forceRefreshCache = async (): Promise<void> => {
  await clearCache();
};

/**
 * Check if a method is available in decompressed cache
 */
export const isMethodCached = async (filename: string): Promise<boolean> => {
  const entry = await getVerifiedDecompressedMethodEntry(filename);
  return entry !== null;
};

/**
 * Get all cached method filenames
 */
export const getCachedMethodList = async (): Promise<string[]> => {
  try {
    const db = await initDB();
    return await getAllCachedKeys(db, CACHE_STORE_NAME);
  } catch (error) {
    console.error('Failed to get cached method list:', error);
    return [];
  }
};

// Helper function to get referenceQuantity from list.json by lciaResults
export const getReferenceQuantityFromMethod = async (
  lciaResults: LCIAResultTable[] | undefined,
): Promise<void> => {
  try {
    if (!lciaResults) {
      return undefined;
    }
    const listData = (await getVerifiedDecompressedMethodEntry<LciaMethodListData>('list.json'))
      ?.data;
    if (!listData) return;

    // Match lciaResults with listData and add unit
    for (const result of lciaResults) {
      const methodId = result.referenceToLCIAMethodDataSet['@refObjectId'];
      const artifactLocatorId = toLciaArtifactLocatorId(
        methodId,
        result.referenceToLCIAMethodDataSet['@version'],
      );
      const methodInfo = listData?.files?.find((it) => it.id === artifactLocatorId);
      if (methodInfo?.referenceQuantity?.['common:shortDescription']) {
        result.referenceQuantityDesc = getLangJson(
          methodInfo.referenceQuantity['common:shortDescription'],
        );
      }
    }
  } catch (error) {
    console.warn('Failed to get referenceQuantity:', error);
  }
};

export const LCIAResultCalculationWithEvidence = async (
  exchangeDataSource: ProcessExchangeData[],
): ReturnType<typeof calculateStaticLcia> => {
  const flowFactorsFile = 'flow_factors.json.gz';
  const listEntry = await getVerifiedDecompressedMethodEntry<LciaMethodListData>('list.json');
  const factorEntry = await getVerifiedDecompressedMethodEntry<LciaFlowFactorMap>(flowFactorsFile);
  try {
    if (!listEntry) {
      console.error('Failed to load LCIA methods list');
      return await buildStaticCalculationFailure(exchangeDataSource, 'method_list_unavailable', {
        factorSha256: factorEntry?.sha256,
      });
    }

    if (!factorEntry) {
      console.warn(`Failed to cache file: ${flowFactorsFile}`);
      return await buildStaticCalculationFailure(exchangeDataSource, 'factor_map_unavailable', {
        listSha256: listEntry.sha256,
      });
    }

    if (!listEntry?.data) {
      return await buildStaticCalculationFailure(
        exchangeDataSource,
        'method_list_cache_read_failed',
        { factorSha256: factorEntry?.sha256 },
      );
    }
    if (
      !factorEntry?.data ||
      Array.isArray(factorEntry.data) ||
      Object.keys(factorEntry.data).length === 0
    ) {
      console.warn(`No characterisation factors found in file: ${flowFactorsFile}`);
      return await buildStaticCalculationFailure(
        exchangeDataSource,
        'factor_map_empty_or_invalid',
        { listSha256: listEntry.sha256, factorSha256: factorEntry.sha256 },
      );
    }

    return await calculateStaticLcia({
      exchanges: exchangeDataSource,
      listData: listEntry.data,
      factors: factorEntry.data,
      observedListSha256: listEntry.sha256,
      observedFactorSha256: factorEntry.sha256,
    });
  } catch (fileError) {
    console.error(`Error processing file ${flowFactorsFile}:`, fileError);
    return await buildStaticCalculationFailure(
      exchangeDataSource,
      fileError instanceof Error ? fileError.message : String(fileError),
      { listSha256: listEntry?.sha256, factorSha256: factorEntry?.sha256 },
    );
  }
};

const LCIAResultCalculation = async (
  exchangeDataSource: ProcessExchangeData[],
): Promise<LCIAResultTable[]> =>
  (await LCIAResultCalculationWithEvidence(exchangeDataSource)).results;

export default LCIAResultCalculation;
