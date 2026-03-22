import { toBigNumberOrNaN, toBigNumberOrZero } from '@/services/general/bignumber';
import {
  clearCachedStore,
  decompressGzipData,
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
import type BigNumber from 'bignumber.js';
import {
  LCIAResultTable,
  LciaFlowFactorEntry,
  LciaFlowFactorMap,
  LciaMethodListData,
} from './data';

// Enhanced LCIA Cache Management with Decompression
const CACHE_KEY = 'lcia_methods_cache_manifest';
const CACHE_DB_NAME = 'lcia_cache_db';
const CACHE_DB_VERSION = 1;
const CACHE_STORE_NAME = 'lcia_methods';

export interface LciaCacheManifest {
  version: string;
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
): Promise<void> => {
  return putCachedJsonEntry(db, CACHE_STORE_NAME, filename, data);
};

/**
 * Get decompressed LCIA method from IndexedDB
 */
export const getDecompressedMethod = async <T>(filename: string): Promise<T | null> => {
  try {
    const db = await initDB();
    const cachedEntry = await getCachedJsonEntry<T>(db, CACHE_STORE_NAME, filename);
    return cachedEntry?.data ?? null;
  } catch (error) {
    console.error(`Failed to get decompressed method ${filename}:`, error);
    return null;
  }
};

/**
 * Download, decompress and cache LCIA method
 */
export const cacheAndDecompressMethod = async (filename: string): Promise<boolean> => {
  try {
    // Download the file
    const response = await fetch(`/lciamethods/${filename}`);
    if (!response.ok) {
      console.warn(`⚠️ File not found: ${filename}`);
      return false;
    }

    // Skip decompression for non-gzipped files (like list.json)
    let data: unknown;
    if (filename.endsWith('.json.gz')) {
      const arrayBuffer = await response.arrayBuffer();
      const decompressedText = await decompressGzip(arrayBuffer);
      data = JSON.parse(decompressedText);
    } else {
      const text = await response.text();
      data = JSON.parse(text);
    }

    // Store in IndexedDB
    const db = await initDB();
    await storeDecompressedMethod(db, filename, data);

    return true;
  } catch (error) {
    console.error(`❌ Failed to cache and decompress ${filename}:`, error);
    return false;
  }
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
  const data = await getDecompressedMethod(filename);
  return data !== null;
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
    let listData = await getDecompressedMethod<LciaMethodListData>('list.json');

    // Check if cached list.json has referenceQuantity field (version check)
    const needsUpdate = listData && !listData.files?.[0]?.referenceQuantity;

    if (!listData || needsUpdate) {
      const cached = await cacheAndDecompressMethod('list.json');
      if (!cached) {
        return;
      }
      listData = await getDecompressedMethod<LciaMethodListData>('list.json');
    }

    // Match lciaResults with listData and add unit
    for (const result of lciaResults) {
      const methodId = result.referenceToLCIAMethodDataSet['@refObjectId'];
      const methodInfo = listData?.files?.find((it) => it.id === methodId);
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

const LCIAResultCalculation = async (
  exchangeDataSource: ProcessExchangeData[],
): Promise<LCIAResultTable[] | undefined> => {
  const lciaResults: LCIAResultTable[] = [];

  const flow_factors_file = 'flow_factors.json.gz';
  try {
    // First try to get the list from cache
    let listData = await getDecompressedMethod<LciaMethodListData>('list.json');

    // Check if cached list.json has referenceQuantity field (version check)
    const needsUpdate = listData && !listData.files?.[0]?.referenceQuantity;

    if (!listData || needsUpdate) {
      // If not cached or outdated, cache it first (this will download, decompress and store)
      const cached = await cacheAndDecompressMethod('list.json');
      if (!cached) {
        console.error('Failed to load LCIA methods list');
        return undefined;
      }
      // Now get from cache
      listData = await getDecompressedMethod<LciaMethodListData>('list.json');
    }

    let factors = await getDecompressedMethod<LciaFlowFactorMap>(flow_factors_file);
    if (!factors) {
      // If not cached, cache it first (this will download, decompress and store)
      const cached = await cacheAndDecompressMethod(flow_factors_file);
      if (!cached) {
        console.warn(`Failed to cache file: ${flow_factors_file}`);
        return lciaResults;
      }
      // Now get from cache
      factors = await getDecompressedMethod<LciaFlowFactorMap>(flow_factors_file);
    }

    // Only support current preprocessed object map format
    if (!factors || Array.isArray(factors) || Object.keys(factors).length === 0) {
      console.warn(`No characterisation factors found in file: ${flow_factors_file}`);
      return lciaResults;
    }

    // Use preprocessed object map directly for lookup
    const factorsObj: LciaFlowFactorMap = factors;

    const lciaFlowResults: LciaFlowFactorEntry[] = [];

    exchangeDataSource.forEach((exchange) => {
      const exchangeFlowRef = Array.isArray(exchange.referenceToFlowDataSet)
        ? exchange.referenceToFlowDataSet[0]
        : exchange.referenceToFlowDataSet;
      const exchangeFlowId = exchangeFlowRef?.['@refObjectId'];
      const exchangeDirection = String(exchange.exchangeDirection || '').toUpperCase();
      if (exchangeFlowId && exchangeDirection) {
        const key = `${exchangeFlowId}:${exchangeDirection}`;
        const matchingFactor = factorsObj[key];
        if (matchingFactor) {
          const exchangeAmount = toBigNumberOrNaN(exchange.meanAmount);
          if (
            !exchangeAmount.isNaN() &&
            matchingFactor?.factor &&
            matchingFactor?.factor.length > 0
          ) {
            const newFactor = matchingFactor.factor.map((f) => {
              const factorValue = toBigNumberOrNaN(f.value);
              if (!factorValue.isNaN()) {
                return { ...f, value: exchangeAmount.times(factorValue).toString() };
              } else {
                return { ...f, value: 0 };
              }
            });
            lciaFlowResults.push(...newFactor);
          }
        }
      }
    });

    const lciaFlowResultsAggregated: Array<{ key: string; value: string }> = Array.from(
      lciaFlowResults
        .filter((it) => it && it.key !== undefined && it.key !== null)
        .reduce((map: Map<string, BigNumber>, it) => {
          const key = String(it.key);
          const raw = it.value;
          const val = toBigNumberOrNaN(raw);
          if (!val.isNaN()) {
            map.set(key, (map.get(key) ?? toBigNumberOrZero(0)).plus(val));
          }
          return map;
        }, new Map<string, BigNumber>())
        .entries(),
    )
      .map(([key, sum]) => ({ key, value: sum.toString() }))
      .filter((it) => {
        const bn = toBigNumberOrNaN(it.value);
        return !bn.isNaN() && !bn.isZero();
      });

    if (lciaFlowResultsAggregated.length > 0) {
      for (const result of lciaFlowResultsAggregated) {
        const methodInfo = listData?.files.find((it) => it.id === result.key);
        if (!methodInfo) {
          continue;
        }

        const lciaResult: LCIAResultTable = {
          key: methodInfo.id,
          referenceToLCIAMethodDataSet: {
            '@refObjectId': methodInfo.id,
            '@type': 'lCIA method data set',
            '@uri': `../lciamethods/${methodInfo.id}.xml`,
            '@version': methodInfo.version,
            'common:shortDescription': methodInfo.description,
          },
          meanAmount: result.value,
        };
        lciaResults.push(lciaResult);
      }
    }
    return lciaResults;
  } catch (fileError) {
    console.error(`Error processing file ${flow_factors_file}:`, fileError);
    return undefined;
  }
};

export default LCIAResultCalculation;
