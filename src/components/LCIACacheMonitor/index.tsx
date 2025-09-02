import { useEffect } from 'react';
import {
  cacheAndDecompressMethod,
  getCacheManifest,
  getCachedMethodList,
} from '../../services/lciaMethods/util';

const CACHE_KEY = 'lcia_methods_cache_manifest';
const CACHE_VERSION = '1.2.0'; // Increment this when you want to force re-cache

const LCIACacheMonitor = () => {
  useEffect(() => {
    const cacheLciaMethods = async () => {
      try {
        // Check if we've already cached these files
        const cachedManifest = getCacheManifest();
        const currentManifest = {
          version: CACHE_VERSION,
          files: [
            '01500b74-7ffb-463e-9bd4-72f17c2263ff_01.00.000.json.gz',
            '05316e7a-b254-4bea-9cf0-6bf33eb5c630_01.00.000.json.gz',
            '14af9ca7-aa1d-4832-b1d9-ab05a06dcb12_01.00.000.json.gz',
            '2299222a-bbd8-474f-9d4f-4dd1f18aea7c_01.01.000.json.gz',
            '6209b35f-9447-40b5-b68c-a1099e3674a0_01.00.000.json.gz',
            '706261af-a357-4cc0-a50a-f3033fcbd556_01.00.000.json.gz',
            '7cfdcfcf-b222-4b26-888a-a55f9fbf7ac8_01.00.000.json.gz',
            '7fce5b3a-66b8-4ce1-91e8-a925aee1f186_01.00.000.json.gz',
            '8c3141e9-1f15-43b5-bff2-182e49893a46_01.00.000.json.gz',
            '9d1d43a2-e1aa-4c16-acd4-3dd8a6a2fb85_01.00.000.json.gz',
            '9ec743ea-6b00-400d-a53b-61547a3fc03c_01.01.000.json.gz',
            'b2ad6110-c78d-11e6-9d9d-cec0c932ce01_01.00.010.json.gz',
            'b2ad6494-c78d-11e6-9d9d-cec0c932ce01_01.00.010.json.gz',
            'b2ad66ce-c78d-11e6-9d9d-cec0c932ce01_03.00.014.json.gz',
            'b2ad6890-c78d-11e6-9d9d-cec0c932ce01_01.00.010.json.gz',
            'b53ec18f-7377-4ad3-86eb-cc3f4f276b2b_01.00.010.json.gz',
            'b5c602c6-def3-11e6-bf01-fe55135034f3_02.00.011.json.gz',
            'b5c610fe-def3-11e6-bf01-fe55135034f3_02.01.000.json.gz',
            'b5c611c6-def3-11e6-bf01-fe55135034f3_01.04.000.json.gz',
            'b5c614d2-def3-11e6-bf01-fe55135034f3_01.02.009.json.gz',
            'b5c619fa-def3-11e6-bf01-fe55135034f3_02.00.010.json.gz',
            'b5c629d6-def3-11e6-bf01-fe55135034f3_02.00.012.json.gz',
            'b5c632be-def3-11e6-bf01-fe55135034f3_01.00.011.json.gz',
            'dacd48b5-4da5-49aa-aff4-cd5f5495c037_01.00.000.json.gz',
            'fd530f00-9325-424a-92ef-aaac67922fd9_01.00.000.json.gz',
            'list.json',
          ],
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
