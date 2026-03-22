import { useEffect } from 'react';

export interface ResourceCacheManifest {
  version: string;
  files: string[];
  cachedAt: number;
  decompressed: boolean;
}

interface CacheMonitorLogMessages {
  upToDate: string;
  start: string;
  success: (successCount: number, totalFiles: number) => string;
  issues: (successCount: number, totalFiles: number, errorCount: number) => string;
  failure: string;
}

interface UseResourceCacheMonitorOptions<TManifest extends ResourceCacheManifest> {
  version: string;
  files: string[];
  batchSize: number;
  getManifest: () => TManifest | null;
  setManifest: (manifest: TManifest) => void;
  getCachedFileList: () => Promise<string[]>;
  cacheFile: (filename: string) => Promise<boolean>;
  logMessages: CacheMonitorLogMessages;
  startDelayMs?: number;
  batchDelayMs?: number;
  maxCacheAgeHours?: number;
}

export const useResourceCacheMonitor = <TManifest extends ResourceCacheManifest>(
  options: UseResourceCacheMonitorOptions<TManifest>,
) => {
  const {
    version,
    files,
    batchSize,
    getManifest,
    setManifest,
    getCachedFileList,
    cacheFile,
    logMessages,
    startDelayMs = 3000,
    batchDelayMs = 100,
    maxCacheAgeHours = 24,
  } = options;

  useEffect(() => {
    const cacheResources = async () => {
      try {
        const cachedManifest = getManifest();
        const currentManifest = {
          version,
          files,
          cachedAt: Date.now(),
          decompressed: true,
        } as TManifest;

        if (
          cachedManifest &&
          cachedManifest.version === currentManifest.version &&
          JSON.stringify(cachedManifest.files) === JSON.stringify(currentManifest.files) &&
          cachedManifest.decompressed
        ) {
          const hoursSinceCache = (Date.now() - cachedManifest.cachedAt) / (1000 * 60 * 60);
          if (hoursSinceCache <= maxCacheAgeHours) {
            const cachedFiles = await getCachedFileList();
            const missingFiles = currentManifest.files.filter(
              (file) => !cachedFiles.includes(file),
            );

            if (missingFiles.length === 0) {
              console.log(logMessages.upToDate);
              return;
            }
          }
        }

        console.log(logMessages.start);
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < currentManifest.files.length; i += batchSize) {
          const batch = currentManifest.files.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(async (file) => {
              try {
                return await cacheFile(file);
              } catch (error) {
                console.error(`Failed to cache ${file}:`, error);
                return false;
              }
            }),
          );

          for (const success of results) {
            if (success) {
              successCount++;
            } else {
              errorCount++;
            }
          }

          if (i + batchSize < currentManifest.files.length) {
            await new Promise<void>((resolve) => {
              setTimeout(resolve, batchDelayMs);
            });
          }
        }

        setManifest(currentManifest);

        if (successCount === currentManifest.files.length) {
          console.log(logMessages.success(successCount, currentManifest.files.length));
        } else {
          console.log(logMessages.issues(successCount, currentManifest.files.length, errorCount));
        }
      } catch (error) {
        console.error(logMessages.failure, error);
      }
    };

    const timer = setTimeout(() => {
      void cacheResources();
    }, startDelayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [
    batchDelayMs,
    batchSize,
    cacheFile,
    files,
    getCachedFileList,
    getManifest,
    logMessages,
    maxCacheAgeHours,
    setManifest,
    startDelayMs,
    version,
  ]);
};
