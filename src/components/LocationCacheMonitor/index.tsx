import { useResourceCacheMonitor } from '@/components/CacheMonitor/useResourceCacheMonitor';
import {
  cacheAndDecompressLocationFile,
  getCachedLocationFileList,
  getLocationCacheManifest,
  setLocationCacheManifest,
  type LocationCacheManifest,
} from '@/services/locations/util';

const LOCATION_CACHE_VERSION = '1.1.0';
const LOCATION_GZ_FILES = ['ILCDLocations.min.json.gz', 'ILCDLocations_zh.min.json.gz'];

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
    logMessages: LOCATION_CACHE_LOG_MESSAGES,
  });

  return null;
};

export default LocationCacheMonitor;
