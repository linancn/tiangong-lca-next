// LCIA Cache Management Utilities

const CACHE_KEY = 'lcia_methods_cache_manifest';

export interface LciaCacheManifest {
  version: string;
  files: string[];
  cachedAt: number;
}

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
export const getCacheStatus = () => {
  const manifest = getCacheManifest();

  if (!manifest) {
    return {
      isCached: false,
      fileCount: 0,
      version: null,
      age: 0,
      ageHours: 0,
    };
  }

  const age = Date.now() - manifest.cachedAt;
  const ageHours = age / (1000 * 60 * 60);

  return {
    isCached: true,
    fileCount: manifest.files.length,
    version: manifest.version,
    age,
    ageHours,
    cachedAt: new Date(manifest.cachedAt),
    isStale: ageHours > 24,
  };
};

/**
 * Clear the LCIA cache
 */
export const clearCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('LCIA cache cleared successfully');
    return true;
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return false;
  }
};

/**
 * Force refresh cache by clearing it first
 */
export const forceRefreshCache = () => {
  clearCache();
  // The cache will be rebuilt on next component mount
  console.log('Cache cleared. It will be rebuilt automatically.');
};

/**
 * Get cache size estimation (approximate)
 */
export const getCacheSizeEstimate = () => {
  try {
    const manifest = getCacheManifest();
    if (!manifest) return 0;

    // Rough estimation: each file is probably 10-100KB
    // This is just an estimate since we can't accurately measure browser cache
    return manifest.files.length * 50; // KB estimate
  } catch {
    return 0;
  }
};
