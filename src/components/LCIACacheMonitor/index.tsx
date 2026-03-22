import { useResourceCacheMonitor } from '@/components/CacheMonitor/useResourceCacheMonitor';
import {
  cacheAndDecompressMethod,
  getCacheManifest,
  getCachedMethodList,
  setCacheManifest,
  type LciaCacheManifest,
} from '../../services/lciaMethods/util';

const CACHE_VERSION = '1.2.4'; // Increment this when you want to force re-cache
const CACHE_FILES = ['flow_factors.json.gz', 'list.json'];

const LCIA_CACHE_LOG_MESSAGES = {
  upToDate: '✅ LCIA methods cache is up to date.',
  start: '🎯 Starting LCIA methods caching...',
  success: (successCount: number) =>
    `🎉 LCIA methods caching completed! ${successCount} files cached successfully.`,
  issues: (successCount: number, totalFiles: number, errorCount: number) =>
    `⚠️  LCIA methods caching completed with issues: ${successCount}/${totalFiles} successful, ${errorCount} errors.`,
  failure: '❌ Failed to cache LCIA methods:',
};

const LCIACacheMonitor = () => {
  useResourceCacheMonitor<LciaCacheManifest>({
    version: CACHE_VERSION,
    files: CACHE_FILES,
    batchSize: 3,
    getManifest: getCacheManifest,
    setManifest: setCacheManifest,
    getCachedFileList: getCachedMethodList,
    cacheFile: cacheAndDecompressMethod,
    logMessages: LCIA_CACHE_LOG_MESSAGES,
  });

  return null; // This component does not render anything.
};

export default LCIACacheMonitor;
