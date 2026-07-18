import { useResourceCacheMonitor } from '@/components/CacheMonitor/useResourceCacheMonitor';
import { locationCache } from '@/services/locations/cache';
import {
  cacheAndDecompressLocationFile,
  getCachedLocationFileList,
  getLocationCacheManifest,
  setLocationCacheManifest,
  type LocationCacheManifest,
} from '@/services/locations/util';
import {
  getReferenceResourceCacheFiles,
  getReferenceResourceCacheVersion,
} from '@/services/referenceResources/manifest';

const LOCATION_CACHE_VERSION = getReferenceResourceCacheVersion('location');
const LOCATION_GZ_FILES = [...getReferenceResourceCacheFiles('location')];
const clearLocationMemoryCache = () => locationCache.clear();

const LOCATION_CACHE_LOG_MESSAGES = {
  upToDate: '✅ Location cache is up to date.',
  start: '🎯 Starting location files caching...',
  success: (successCount: number) =>
    `🎉 Location caching completed! ${successCount} files cached successfully.`,
  issues: (successCount: number, totalFiles: number, errorCount: number) =>
    `⚠️  Location caching completed with issues: ${successCount}/${totalFiles} successful, ${errorCount} errors.`,
  failure: '❌ Failed to cache location files:',
};

const LocationCacheMonitor = () => {
  useResourceCacheMonitor<LocationCacheManifest>({
    version: LOCATION_CACHE_VERSION,
    files: LOCATION_GZ_FILES,
    batchSize: 2,
    getManifest: getLocationCacheManifest,
    setManifest: setLocationCacheManifest,
    getCachedFileList: getCachedLocationFileList,
    cacheFile: cacheAndDecompressLocationFile,
    persistManifestOnPartialSuccess: false,
    onCacheUpdated: clearLocationMemoryCache,
    logMessages: LOCATION_CACHE_LOG_MESSAGES,
  });

  return null;
};

export default LocationCacheMonitor;
