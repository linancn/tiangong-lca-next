import { useResourceCacheMonitor } from '@/components/CacheMonitor/useResourceCacheMonitor';
import {
  cacheAndDecompressClassificationFile,
  getCachedClassificationFileList,
  getClassificationCacheManifest,
  setClassificationCacheManifest,
  type ClassificationCacheManifest,
} from '@/services/classifications/util';

const CLASSIFICATION_CACHE_VERSION = '1.1.0';
const CLASSIFICATION_GZ_FILES = [
  'ILCDClassification.min.json.gz',
  'ILCDClassification_zh.min.json.gz',
  'ILCDFlowCategorization.min.json.gz',
  'ILCDFlowCategorization_zh.min.json.gz',
];

const CLASSIFICATION_CACHE_LOG_MESSAGES = {
  upToDate: '✅ Classification cache is up to date.',
  start: '🎯 Starting classification files caching...',
  success: (successCount: number) =>
    `🎉 Classification caching completed! ${successCount} files cached successfully.`,
  issues: (successCount: number, totalFiles: number, errorCount: number) =>
    `⚠️  Classification caching completed with issues: ${successCount}/${totalFiles} successful, ${errorCount} errors.`,
  failure: '❌ Failed to cache classification files:',
};

const ClassificationCacheMonitor = () => {
  useResourceCacheMonitor<ClassificationCacheManifest>({
    version: CLASSIFICATION_CACHE_VERSION,
    files: CLASSIFICATION_GZ_FILES,
    batchSize: 2,
    getManifest: getClassificationCacheManifest,
    setManifest: setClassificationCacheManifest,
    getCachedFileList: getCachedClassificationFileList,
    cacheFile: cacheAndDecompressClassificationFile,
    logMessages: CLASSIFICATION_CACHE_LOG_MESSAGES,
  });

  return null;
};

export default ClassificationCacheMonitor;
