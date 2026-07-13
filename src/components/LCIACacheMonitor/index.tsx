import { useResourceCacheMonitor } from '@/components/CacheMonitor/useResourceCacheMonitor';
import { STATIC_LCIA_CACHE_MANIFEST } from '../../services/lciaMethods/evidence';
import {
  cacheAndDecompressMethod,
  getCacheManifest,
  getCachedMethodList,
  setCacheManifest,
  type LciaCacheManifest,
} from '../../services/lciaMethods/util';

const CACHE_VERSION = 'lcia.browser_cache_manifest.v2';
const CACHE_FILES = ['flow_factors.json.gz', 'list.json'];
const CACHE_MANIFEST_METADATA = {
  cacheSchemaVersion: CACHE_VERSION,
  bundleVersion: STATIC_LCIA_CACHE_MANIFEST.bundle_version,
  sourceSnapshotSha256: STATIC_LCIA_CACHE_MANIFEST.source_snapshot_sha256,
} as const;
export const isLciaCacheManifestCurrent = (cached: LciaCacheManifest, current: LciaCacheManifest) =>
  cached.cacheSchemaVersion === current.cacheSchemaVersion &&
  cached.bundleVersion === current.bundleVersion &&
  cached.sourceSnapshotSha256 === current.sourceSnapshotSha256;

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
    manifestMetadata: CACHE_MANIFEST_METADATA,
    isManifestCurrent: isLciaCacheManifestCurrent,
    persistManifestOnPartialSuccess: false,
    logMessages: LCIA_CACHE_LOG_MESSAGES,
  });

  return null; // This component does not render anything.
};

export default LCIACacheMonitor;
