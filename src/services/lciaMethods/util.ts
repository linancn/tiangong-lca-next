import BigNumber from 'bignumber.js';
import * as pako from 'pako';
import { LCIAResultTable } from './data';

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

export interface CachedLciaMethod {
  filename: string;
  data: any; // Decompressed JSON data
  size: number;
  cachedAt: number;
}

/**
 * Initialize IndexedDB for storing decompressed LCIA methods
 */
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        const store = db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'filename' });
        store.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
    };
  });
};

/**
 * Decompress gzipped content
 */
const decompressGzip = async (gzipData: ArrayBuffer): Promise<string> => {
  try {
    const decompressed = pako.ungzip(new Uint8Array(gzipData), { to: 'string' });
    return decompressed;
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
  data: any,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE_NAME);

    const cachedMethod: CachedLciaMethod = {
      filename,
      data,
      size: JSON.stringify(data).length,
      cachedAt: Date.now(),
    };

    const request = store.put(cachedMethod);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

/**
 * Get decompressed LCIA method from IndexedDB
 */
export const getDecompressedMethod = async (filename: string): Promise<any | null> => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const request = store.get(filename);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as CachedLciaMethod | undefined;
        resolve(result ? result.data : null);
      };
    });
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
    console.log(`📦 Downloading and decompressing: ${filename}`);

    // Download the file
    const response = await fetch(`/lciamethods/${filename}`);
    if (!response.ok) {
      console.warn(`⚠️ File not found: ${filename}`);
      return false;
    }

    // Skip decompression for non-gzipped files (like list.json)
    let data: any;
    if (filename.endsWith('.json.gz')) {
      const arrayBuffer = await response.arrayBuffer();
      const originalSize = arrayBuffer.byteLength;
      const decompressedText = await decompressGzip(arrayBuffer);
      data = JSON.parse(decompressedText);
      console.log(
        `✂️ Decompressed ${filename}: ${originalSize} bytes → ${decompressedText.length} chars`,
      );
    } else {
      const text = await response.text();
      const originalSize = text.length;
      data = JSON.parse(text);
      console.log(`📄 Loaded ${filename}: ${originalSize} bytes`);
    }

    // Store in IndexedDB
    const db = await initDB();
    await storeDecompressedMethod(db, filename, data);

    console.log(`✅ Cached decompressed: ${filename}`);
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
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Failed to read cache manifest:', error);
    return null;
  }
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
    const transaction = db.transaction([CACHE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(CACHE_STORE_NAME);

    indexedDBSize = await new Promise<number>((resolve) => {
      let totalSize = 0;
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          totalSize += cursor.value.size || 0;
          cursor.continue();
        } else {
          resolve(totalSize);
        }
      };

      request.onerror = () => resolve(0);
    });
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
    const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });

    console.log('✅ LCIA cache cleared successfully (localStorage + IndexedDB)');
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
  console.log('🔄 Cache cleared. It will be rebuilt automatically with decompression.');
};

/**
 * Check if a method is available in decompressed cache
 */
export const isMethodCached = async (filename: string): Promise<boolean> => {
  try {
    const data = await getDecompressedMethod(filename);
    return data !== null;
  } catch {
    return false;
  }
};

/**
 * Get all cached method filenames
 */
export const getCachedMethodList = async (): Promise<string[]> => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string[]);
    });
  } catch (error) {
    console.error('Failed to get cached method list:', error);
    return [];
  }
};

const LCIAResultCalculation = async (exchangeDataSource: any) => {
  const lciaResults: LCIAResultTable[] = [];

  try {
    // First try to get the list from cache
    let listData = await getDecompressedMethod('list.json');

    if (!listData) {
      // If not cached, fetch from network
      const response = await fetch('/lciamethods/list.json');
      if (!response.ok) {
        console.error('Failed to load LCIA methods list:', response.status);
        return;
      }
      listData = await response.json();

      // Cache the list for future use
      await cacheAndDecompressMethod('list.json');
    }

    const useDecompressionStream = 'DecompressionStream' in window;

    for (const file of listData.files) {
      try {
        // First try to get from cache
        let jsonData = await getDecompressedMethod(file.filename);

        if (!jsonData) {
          // If not cached, fetch and decompress from network
          const gzResponse = await fetch(`/lciamethods/${file.filename}`);
          if (!gzResponse.ok) {
            console.warn(`Failed to load file: ${file.filename}`);
            continue;
          }

          const gzArrayBuffer = await gzResponse.arrayBuffer();

          let decompressed: string;
          if (useDecompressionStream) {
            // Use native DecompressionStream API with stream processing
            const stream = new ReadableStream({
              start(controller) {
                controller.enqueue(new Uint8Array(gzArrayBuffer));
                controller.close();
              },
            });

            const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
            decompressed = await new Response(decompressedStream).text();
          } else {
            // Fallback to pako for older browsers
            decompressed = pako.inflate(new Uint8Array(gzArrayBuffer), {
              to: 'string',
            });
          }

          jsonData = JSON.parse(decompressed);

          // Cache the decompressed data for future use
          await cacheAndDecompressMethod(file.filename);
        }

        const lciaMethodDataSet = jsonData?.LCIAMethodDataSet;
        if (!lciaMethodDataSet) {
          console.warn(`Invalid LCIA method data in file: ${file.filename}`);
          continue;
        }

        const methodInfo = lciaMethodDataSet.LCIAMethodInformation?.dataSetInformation;
        const methodName = methodInfo['common:name'];
        const methodId = methodInfo['common:UUID'];
        const methodVersion =
          lciaMethodDataSet?.administrativeInformation?.publicationAndOwnership?.[
            'common:dataSetVersion'
          ];

        const factors = lciaMethodDataSet?.characterisationFactors?.factor || [];
        if (!Array.isArray(factors) || factors.length === 0) {
          console.warn(`No characterisation factors found in file: ${file.filename}`);
          continue;
        }

        let sumLCIA = new BigNumber(0);
        let matchedExchanges = 0;

        exchangeDataSource.forEach((exchange: any) => {
          const matchingFactor = factors.find((factor: any) => {
            const factorFlowId = factor.referenceToFlowDataSet?.['@refObjectId'];
            const exchangeFlowId = exchange.referenceToFlowDataSet?.['@refObjectId'];
            const factorDirection = String(factor.exchangeDirection || '').toLowerCase();
            const exchangeDirection = String(exchange.exchangeDirection || '').toLowerCase();

            return factorFlowId === exchangeFlowId && factorDirection === exchangeDirection;
          });

          if (matchingFactor) {
            const exchangeAmount = new BigNumber(exchange.meanAmount);
            const factorValue = new BigNumber(matchingFactor.meanValue);

            if (!exchangeAmount.isNaN() && !factorValue.isNaN()) {
              const contribution = exchangeAmount.times(factorValue);
              sumLCIA = sumLCIA.plus(contribution);
              matchedExchanges++;

              // console.log(`Matched exchange: ${exchange.referenceToFlowDataSet?.['@refObjectId']}, Amount: ${exchangeAmount.toString()}, Factor: ${factorValue.toString()}, Contribution: ${contribution.toString()}`);
            }
          }
        });
        if (matchedExchanges > 0) {
          const lciaResult: LCIAResultTable = {
            key: file.id,
            referenceToLCIAMethodDataSet: {
              '@refObjectId': methodId,
              '@type': 'lCIA method data set',
              '@uri': `../lciamethods/${methodId}.xml`,
              '@version': methodVersion,
              'common:shortDescription': methodName,
            },
            meanAmount: sumLCIA.toNumber(),
          };

          lciaResults.push(lciaResult);
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.filename}:`, fileError);
      }
    }
  } catch (error) {
    console.error('Error in LCIA methods processing:', error);
  }

  // console.log(`Total LCIA results calculated: ${lciaResults.length}`,lciaResults);
  return lciaResults;
};

export default LCIAResultCalculation;
