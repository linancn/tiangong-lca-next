import { useEffect } from 'react';
import {
  cacheAndDecompressMethod,
  getCacheManifest,
  getCachedMethodList,
} from '../../services/lciaMethods/util';

const CACHE_KEY = 'lcia_methods_cache_manifest';
const CACHE_VERSION = '1.2.4'; // Increment this when you want to force re-cache

const LCIACacheMonitor = () => {
  useEffect(() => {
    const cacheLciaMethods = async () => {
      try {
        // Check if we've already cached these files
        const cachedManifest = getCacheManifest();
        const currentManifest = {
          version: CACHE_VERSION,
          files: ['flow_factors.json.gz', 'list.json'],
          cachedAt: Date.now(),
          decompressed: true,
        };

        // Check if we need to cache
        let shouldCache = false;
        if (!cachedManifest) {
          shouldCache = true;
        } else {
          if (cachedManifest.version !== currentManifest.version) {
            shouldCache = true;
          } else if (
            JSON.stringify(cachedManifest.files) !== JSON.stringify(currentManifest.files)
          ) {
            shouldCache = true;
          } else if (!cachedManifest.decompressed) {
            shouldCache = true;
          } else {
            const hoursSinceCache = (Date.now() - cachedManifest.cachedAt) / (1000 * 60 * 60);
            if (hoursSinceCache > 24) {
              shouldCache = true;
            } else {
              // Verify that all files are actually in IndexedDB
              const cachedFiles = await getCachedMethodList();
              const missingFiles = currentManifest.files.filter(
                (file) => !cachedFiles.includes(file),
              );

              if (missingFiles.length > 0) {
                shouldCache = true;
              } else {
                console.log('✅ LCIA methods cache is up to date.');
                return;
              }
            }
          }
        }

        if (!shouldCache) return;

        console.log('🎯 Starting LCIA methods caching...');
        let successCount = 0;
        let errorCount = 0;

        // Process files in batches to avoid overwhelming the browser
        const batchSize = 3;
        for (let i = 0; i < currentManifest.files.length; i += batchSize) {
          const batch = currentManifest.files.slice(i, i + batchSize);

          // Process batch in parallel
          const batchPromises = batch.map(async (file) => {
            try {
              const success = await cacheAndDecompressMethod(file);
              return success;
            } catch (error) {
              console.error(`Failed to cache ${file}:`, error);
              return false;
            }
          });

          const results = await Promise.all(batchPromises);

          // Update counters based on results
          for (const success of results) {
            if (success) {
              successCount++;
            } else {
              errorCount++;
            }
          }

          // Small delay between batches
          if (i + batchSize < currentManifest.files.length) {
            await new Promise<void>((resolve) => {
              setTimeout(() => {
                resolve();
              }, 100);
            });
          }
        }

        // Save the cache manifest
        localStorage.setItem(CACHE_KEY, JSON.stringify(currentManifest));

        const totalFiles = currentManifest.files.length;
        if (successCount === totalFiles) {
          console.log(
            `🎉 LCIA methods caching completed! ${successCount} files cached successfully.`,
          );
        } else {
          console.log(
            `⚠️  LCIA methods caching completed with issues: ${successCount}/${totalFiles} successful, ${errorCount} errors.`,
          );
        }
      } catch (error) {
        console.error('❌ Failed to cache LCIA methods:', error);
      }
    };

    // Start caching after the app has mounted
    const timer = setTimeout(() => {
      cacheLciaMethods();
    }, 3000); // 3-second delay

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return null; // This component does not render anything.
};

export default LCIACacheMonitor;
