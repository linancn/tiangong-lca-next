import { useEffect } from 'react';

const CACHE_KEY = 'lcia_methods_cache_manifest';
const CACHE_VERSION = '1.0.0'; // Increment this when you want to force re-cache

const LCIACacheMonitor = () => {
  useEffect(() => {
    const cacheLciaMethods = async () => {
      try {
        // Check if we've already cached these files in this browser session
        const cachedManifest = localStorage.getItem(CACHE_KEY);
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
        };

        // Check if we need to cache (first time or version changed)
        let shouldCache = false;
        if (!cachedManifest) {
          console.log('LCIA methods: No cache found, starting initial caching...');
          shouldCache = true;
        } else {
          const parsed = JSON.parse(cachedManifest);
          if (parsed.version !== currentManifest.version) {
            console.log(
              `LCIA methods: Version changed (${parsed.version} -> ${currentManifest.version}), re-caching...`,
            );
            shouldCache = true;
          } else if (JSON.stringify(parsed.files) !== JSON.stringify(currentManifest.files)) {
            console.log('LCIA methods: File list changed, re-caching...');
            shouldCache = true;
          } else {
            const hoursSinceCache = (Date.now() - parsed.cachedAt) / (1000 * 60 * 60);
            if (hoursSinceCache > 24) {
              console.log('LCIA methods: Cache is older than 24 hours, refreshing...');
              shouldCache = true;
            } else {
              console.log('LCIA methods: Cache is up to date, skipping pre-caching.');
              return;
            }
          }
        }

        if (!shouldCache) return;

        console.log('Starting LCIA methods pre-caching...');
        let cachedCount = 0;

        for (const file of currentManifest.files) {
          try {
            // Use HEAD request first to check if file exists and get cache headers
            const headResponse = await fetch(`/lciamethods/${file}`, { method: 'HEAD' });
            if (headResponse.ok) {
              // If HEAD is successful, do a GET request to cache the file
              await fetch(`/lciamethods/${file}`);
              cachedCount++;
              console.log(`✓ Cached: ${file} (${cachedCount}/${currentManifest.files.length})`);
            } else {
              console.warn(`⚠️ File not found: ${file}`);
            }
          } catch (error) {
            console.error(`❌ Failed to cache ${file}:`, error);
          }

          // Add a small delay to avoid overwhelming the server
          await new Promise((resolve) => {
            setTimeout(resolve, 50);
          });
        }

        // Save the cache manifest to localStorage
        localStorage.setItem(CACHE_KEY, JSON.stringify(currentManifest));

        console.log(
          `✅ LCIA methods pre-caching finished. Successfully cached ${cachedCount}/${currentManifest.files.length} files.`,
        );
      } catch (error) {
        console.error('Failed to pre-cache LCIA methods:', error);
      }
    };

    // Start caching after the app has mounted and had a moment to settle.
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
