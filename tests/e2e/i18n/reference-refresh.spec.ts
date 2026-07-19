import { expect, test, type Page } from './fixtures';

import type { SupportedContentLanguage } from '../../../src/services/general/contentLanguageRegistry';
import { getContentLanguageDefinition } from '../../../src/services/general/contentLanguageRegistry';
import { LOCALE_CAPABILITY_MATRIX } from '../../../src/services/general/localeCapabilities';
import type { SupportedAppLocale } from '../../../src/services/general/localeRegistry';
import {
  getReferenceResourceCacheFiles,
  getReferenceResourceCacheVersion,
  getReferenceRuntimeAssetCacheIdentity,
  type ReferenceResourceScope,
  type ReferenceRuntimeAssetCacheIdentity,
} from '../../../src/services/referenceResources/manifest';
import { signInViaUi } from './auth';
import {
  annotateEvidence,
  APP_LOCALES,
  findRouteAssertion,
  getLocaleMessage,
  readStoredAppLocale,
  routeToCandidateUrl,
  selectAppLocaleThroughUi,
} from './contracts';
import { readProductionDataLedger, type ProductionDataLedger } from './production-data-ledger';
import { loadReferenceFixture, type ReferenceFixture } from './reference-fixture';

const processAssertion = findRouteAssertion('/mydata/processes');
const REQUEST_BATCH_QUIET_MS = 150;
const REFERENCE_RACE_SETTLE_TIMEOUT_MS = 60_000;
const MAX_CANDIDATE_NAVIGATION_ATTEMPTS = 2;

type ReadableLocaleDefinition = {
  appLocale: SupportedAppLocale;
  languageCode: SupportedContentLanguage;
};

type BrowserCacheDescriptor = {
  databaseName: string;
  manifestKey: string;
  scope: ReferenceResourceScope;
  storeName: string;
};

type BrowserCacheEntryIdentity = { revision?: string; sha256?: string };

type BrowserCacheManifestIdentity = { files: string[]; version?: string };

type InjectedPreviousRevisionEntry = BrowserCacheDescriptor & {
  filename: string;
  revision: string;
  sha256: string;
};

type ReferenceConsumerFixture = BrowserCacheDescriptor & {
  assetDirectory: 'classifications' | 'locations';
  assetFileName: (definition: ReadableLocaleDefinition) => string;
  cacheIdentity: (definition: ReadableLocaleDefinition) => ReferenceRuntimeAssetCacheIdentity;
  id: 'classification' | 'location';
  staleCacheData: (marker: string, definition: ReadableLocaleDefinition) => unknown;
  visibleText: (definition: ReadableLocaleDefinition) => string;
};

const CACHE_DESCRIPTORS: Record<ReferenceResourceScope, BrowserCacheDescriptor> = {
  classification: {
    databaseName: 'classification_cache_db',
    manifestKey: 'classification_cache_manifest',
    scope: 'classification',
    storeName: 'classification_files',
  },
  location: {
    databaseName: 'location_cache_db',
    manifestKey: 'location_cache_manifest',
    scope: 'location',
    storeName: 'location_files',
  },
};

function projectBrowserCacheDescriptor(descriptor: BrowserCacheDescriptor): BrowserCacheDescriptor {
  return {
    databaseName: descriptor.databaseName,
    manifestKey: descriptor.manifestKey,
    scope: descriptor.scope,
    storeName: descriptor.storeName,
  };
}

function getReadableLocaleDefinitions(): ReadableLocaleDefinition[] {
  const readable = LOCALE_CAPABILITY_MATRIX.flatMap((capability) => {
    if (capability.contentReading === 'unsupported') {
      expect(capability.contentLanguage).toBeUndefined();
      expect(capability.referenceResources).toEqual([]);
      return [];
    }
    expect(capability.contentLanguage).toBeTruthy();
    const contentDefinition = getContentLanguageDefinition(capability.contentLanguage!);
    if (!contentDefinition?.reading.enabled) {
      throw new Error(`Missing readable content definition for ${capability.appLocale}.`);
    }
    return [
      {
        appLocale: capability.appLocale,
        languageCode: contentDefinition.languageCode,
      },
    ];
  });
  const unsupported = LOCALE_CAPABILITY_MATRIX.filter(
    ({ contentReading }) => contentReading === 'unsupported',
  ).map(({ appLocale }) => appLocale);

  expect([...readable.map(({ appLocale }) => appLocale), ...unsupported].sort()).toEqual(
    [...APP_LOCALES].sort(),
  );
  return readable;
}

function getConsumerFixtures(referenceFixture: ReferenceFixture): ReferenceConsumerFixture[] {
  const requireIdentity = (
    fileName: string,
    expectedScope: ReferenceResourceScope,
  ): ReferenceRuntimeAssetCacheIdentity => {
    const identity = getReferenceRuntimeAssetCacheIdentity(fileName);
    if (!identity || identity.scope !== expectedScope) {
      throw new Error(`Missing ${expectedScope} cache identity for ${fileName}.`);
    }
    return identity;
  };

  return [
    {
      ...CACHE_DESCRIPTORS.classification,
      id: 'classification',
      assetDirectory: 'classifications',
      assetFileName: ({ languageCode }) =>
        referenceFixture.classification.assetFileNames[languageCode],
      cacheIdentity: (definition) =>
        requireIdentity(
          referenceFixture.classification.assetFileNames[definition.languageCode],
          'classification',
        ),
      staleCacheData: (marker) => ({
        CategorySystem: {
          categories: {
            '@dataType': 'Process',
            category: {
              '@id': referenceFixture.classification.canonicalPath[0]?.id,
              '@name': marker,
            },
          },
        },
      }),
      visibleText: ({ languageCode }) =>
        referenceFixture.classification.labels[languageCode].join(' > '),
    },
    {
      ...CACHE_DESCRIPTORS.location,
      id: 'location',
      assetDirectory: 'locations',
      assetFileName: ({ languageCode }) => referenceFixture.location.assetFileNames[languageCode],
      cacheIdentity: (definition) =>
        requireIdentity(
          referenceFixture.location.assetFileNames[definition.languageCode],
          'location',
        ),
      staleCacheData: (marker) => ({
        ILCDLocations: {
          location: [{ '#text': marker, '@value': referenceFixture.location.code }],
        },
      }),
      visibleText: ({ languageCode }) =>
        `${referenceFixture.location.code} (${referenceFixture.location.labels[languageCode]})`,
    },
  ];
}

function buildProcessDeepLink(
  baseURL: string,
  ledger: ProductionDataLedger,
  state: string,
  mode: 'edit' | 'view' = 'view',
): string {
  const hashQuery = new URLSearchParams({
    id: ledger.id,
    version: ledger.version,
    mode,
    codexE2EReferenceState: state,
  });
  const target = new URL(routeToCandidateUrl(baseURL, `/mydata/processes?${hashQuery.toString()}`));
  target.searchParams.set('codexE2EOuterState', state);
  return target.toString();
}

async function gotoCandidateDocument(page: Page, targetUrl: string): Promise<void> {
  for (let attempt = 1; attempt <= MAX_CANDIDATE_NAVIGATION_ATTEMPTS; attempt += 1) {
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      return;
    } catch (error) {
      const isRecoverableFirefoxNavigation =
        error instanceof Error && error.message.includes('NS_ERROR_FAILURE');
      if (!isRecoverableFirefoxNavigation || attempt === MAX_CANDIDATE_NAVIGATION_ATTEMPTS) {
        throw error;
      }
    }
  }
}

async function expectProcessDeepLink(
  page: Page,
  ledger: ProductionDataLedger,
  state: string,
  mode: 'edit' | 'view' = 'view',
): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const hashQuery = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
        return {
          hashPath: window.location.hash.split('?')[0],
          id: hashQuery.get('id'),
          innerState: hashQuery.get('codexE2EReferenceState'),
          mode: hashQuery.get('mode'),
          outerState: new URL(window.location.href).searchParams.get('codexE2EOuterState'),
          version: hashQuery.get('version'),
        };
      }),
    )
    .toEqual({
      hashPath: '#/mydata/processes',
      id: ledger.id,
      innerState: state,
      mode,
      outerState: state,
      version: ledger.version,
    });
}

async function selectLocaleThroughHeader(
  page: Page,
  definition: ReadableLocaleDefinition,
  options: { forceTrigger?: boolean } = {},
): Promise<void> {
  await selectAppLocaleThroughUi(page, definition.appLocale, options);
  await expect.poll(() => readStoredAppLocale(page)).toBe(definition.appLocale);
}

async function clearBrowserCache(page: Page, descriptor: BrowserCacheDescriptor): Promise<void> {
  await page.evaluate(async ({ databaseName, manifestKey, storeName }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: 'filename' });
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(storeName, 'readwrite');
        transaction.objectStore(storeName).clear();
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
    localStorage.removeItem(manifestKey);
  }, projectBrowserCacheDescriptor(descriptor));
}

async function injectPreviousRevisionEntries(
  page: Page,
  fixtures: ReferenceConsumerFixture[],
  definition: ReadableLocaleDefinition,
  marker: string,
): Promise<InjectedPreviousRevisionEntry[]> {
  const entries = fixtures.map((fixture) => {
    const descriptor = projectBrowserCacheDescriptor(fixture);
    const identity = fixture.cacheIdentity(definition);
    const revision = `${getReferenceResourceCacheVersion(fixture.scope)}-previous`;
    return {
      ...descriptor,
      data: fixture.staleCacheData(`${marker}-${fixture.id}`, definition),
      filename: identity.fileName,
      revision,
      sha256: `previous-${identity.jsonSha256}`,
    };
  });

  await page.evaluate(async (staleEntries) => {
    for (const entry of staleEntries) {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(entry.databaseName, 1);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(entry.storeName)) {
            database.createObjectStore(entry.storeName, { keyPath: 'filename' });
          }
        };
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(entry.storeName, 'readwrite');
          transaction.objectStore(entry.storeName).put({
            cachedAt: Date.now() - 86_400_000,
            data: entry.data,
            filename: entry.filename,
            revision: entry.revision,
            sha256: entry.sha256,
            size: JSON.stringify(entry.data).length,
          });
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      });
      localStorage.setItem(
        entry.manifestKey,
        JSON.stringify({
          cachedAt: Date.now() - 86_400_000,
          decompressed: true,
          files: [entry.filename],
          version: entry.revision,
        }),
      );
    }
  }, entries);

  return entries.map(
    ({ databaseName, filename, manifestKey, revision, scope, sha256, storeName }) => ({
      databaseName,
      filename,
      manifestKey,
      revision,
      scope,
      sha256,
      storeName,
    }),
  );
}

async function readCacheEntryIdentity(
  page: Page,
  descriptor: BrowserCacheDescriptor,
  filename: string,
): Promise<BrowserCacheEntryIdentity | null> {
  const projectedDescriptor = projectBrowserCacheDescriptor(descriptor);
  return page.evaluate(
    async ({ databaseName, filename: targetFilename, storeName }) =>
      new Promise<BrowserCacheEntryIdentity | null>((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(storeName, 'readonly');
          const getRequest = transaction.objectStore(storeName).get(targetFilename);
          getRequest.onerror = () => reject(getRequest.error);
          getRequest.onsuccess = () => {
            const value = getRequest.result as { revision?: string; sha256?: string } | undefined;
            database.close();
            resolve(value ? { revision: value.revision, sha256: value.sha256 } : null);
          };
        };
      }),
    { ...projectedDescriptor, filename },
  );
}

async function readCacheManifestIdentity(
  page: Page,
  descriptor: BrowserCacheDescriptor,
): Promise<BrowserCacheManifestIdentity | null> {
  return page.evaluate(({ manifestKey }) => {
    const value = localStorage.getItem(manifestKey);
    if (!value) return null;
    const manifest = JSON.parse(value) as { files?: string[]; version?: string };
    return {
      files: [...(manifest.files ?? [])].sort(),
      version: manifest.version,
    };
  }, projectBrowserCacheDescriptor(descriptor));
}

async function expectCurrentReferenceCacheBaseline(
  page: Page,
  fixtures: ReferenceConsumerFixture[],
  definitions: ReadableLocaleDefinition[],
): Promise<void> {
  for (const fixture of fixtures) {
    await expect
      .poll(() => readCacheManifestIdentity(page, fixture), { timeout: 180_000 })
      .toEqual({
        files: [...getReferenceResourceCacheFiles(fixture.scope)].sort(),
        version: getReferenceResourceCacheVersion(fixture.scope),
      });
    for (const definition of definitions) {
      const identity = fixture.cacheIdentity(definition);
      await expect
        .poll(() => readCacheEntryIdentity(page, fixture, identity.fileName), {
          timeout: 180_000,
        })
        .toEqual({ revision: identity.cacheRevision, sha256: identity.jsonSha256 });
    }
  }
}

async function expectPreviousRevisionEntriesInjected(
  page: Page,
  entries: InjectedPreviousRevisionEntry[],
): Promise<void> {
  for (const entry of entries) {
    await expect
      .poll(() => readCacheEntryIdentity(page, entry, entry.filename))
      .toEqual({ revision: entry.revision, sha256: entry.sha256 });
    await expect
      .poll(() => readCacheManifestIdentity(page, entry))
      .toEqual({
        files: [entry.filename],
        version: entry.revision,
      });
  }
}

test('delayed old-locale classification and location responses never overwrite the mounted locale', async ({
  baseURL,
  page,
}, testInfo) => {
  test.skip(
    process.env.E2E_AUTHENTICATED !== 'true' || process.env.E2E_ALLOW_PRODUCTION_DATA !== 'true',
    'Reference refresh semantics require the explicit production-data guard and credentials.',
  );
  annotateEvidence(testInfo, processAssertion, 'reference-refresh');
  const [ledger, referenceFixture] = await Promise.all([
    readProductionDataLedger(),
    Promise.resolve(loadReferenceFixture()),
  ]);
  expect(ledger).toBeTruthy();
  expect(baseURL).toBeTruthy();
  const readableDefinitions = getReadableLocaleDefinitions();
  const consumerFixtures = getConsumerFixtures(referenceFixture);
  const localePairs = readableDefinitions.map((currentDefinition) => {
    const staleDefinition = readableDefinitions.find(
      (candidate) =>
        candidate.languageCode !== currentDefinition.languageCode &&
        consumerFixtures.every(
          (fixture) =>
            fixture.assetFileName(candidate) !== fixture.assetFileName(currentDefinition) &&
            fixture.visibleText(candidate) !== fixture.visibleText(currentDefinition),
        ),
    );
    if (!staleDefinition) {
      throw new Error(
        `No distinct stale reference fixture exists for ${currentDefinition.appLocale}.`,
      );
    }
    return { currentDefinition, staleDefinition };
  });

  await signInViaUi(page);
  for (const [fixtureIndex, fixture] of consumerFixtures.entries()) {
    for (const [localePairIndex, { currentDefinition, staleDefinition }] of localePairs.entries()) {
      await test.step(`${fixture.id}: ${staleDefinition.appLocale} cannot overwrite ${currentDefinition.appLocale}`, async () => {
        const mountedProcessDrawer = page.locator('.ant-drawer-content:visible');
        const expectsMountedProcessDrawer = fixtureIndex > 0 || localePairIndex > 0;
        if (expectsMountedProcessDrawer) {
          await expect(mountedProcessDrawer).toHaveCount(1);
          await selectLocaleThroughHeader(page, staleDefinition, { forceTrigger: true });
        } else {
          await expect(mountedProcessDrawer).toHaveCount(0);
          await selectLocaleThroughHeader(page, staleDefinition);
        }
        await clearBrowserCache(page, fixture);

        let releaseOldResponse!: () => void;
        const oldResponseRelease = new Promise<void>((resolve) => {
          releaseOldResponse = resolve;
        });
        const staleAssetPattern = `**/${fixture.assetDirectory}/${fixture.assetFileName(staleDefinition)}`;
        const staleResponseErrors: string[] = [];
        let staleRequestsStarted = 0;
        let staleResponsesFinished = 0;
        let staleLastStartedAt = 0;

        await page.route(staleAssetPattern, async (route) => {
          staleRequestsStarted += 1;
          staleLastStartedAt = Date.now();
          try {
            const response = await route.fetch();
            await oldResponseRelease;
            await route.fulfill({ response });
          } catch (error) {
            staleResponseErrors.push(error instanceof Error ? error.message : String(error));
          } finally {
            staleResponsesFinished += 1;
          }
        });

        let oldResponseReleased = false;
        const releaseOldResponseOnce = () => {
          if (!oldResponseReleased) {
            oldResponseReleased = true;
            releaseOldResponse();
          }
        };

        try {
          const state = `race-${fixture.id}-${currentDefinition.languageCode}`;
          const targetUrl = buildProcessDeepLink(baseURL!, ledger!, state);
          await gotoCandidateDocument(page, targetUrl);
          await expectProcessDeepLink(page, ledger!, state);
          await expect
            .poll(
              () =>
                staleRequestsStarted > 0 &&
                Date.now() - staleLastStartedAt >= REQUEST_BATCH_QUIET_MS,
              { timeout: 15_000 },
            )
            .toBe(true);

          const documentIdentity = await page.evaluate(() => {
            const identity = crypto.randomUUID();
            document.documentElement.dataset.codexE2eDocumentIdentity = identity;
            return identity;
          });
          const mountedPageUrl = page.url();

          await selectLocaleThroughHeader(page, currentDefinition, { forceTrigger: true });
          expect(page.url()).toBe(mountedPageUrl);
          await expectProcessDeepLink(page, ledger!, state);
          await expect
            .poll(() =>
              page.evaluate(() => document.documentElement.dataset.codexE2eDocumentIdentity),
            )
            .toBe(documentIdentity);

          const currentText = fixture.visibleText(currentDefinition);
          const staleText = fixture.visibleText(staleDefinition);
          // A warm memory cache may require no current-locale request, while a localized
          // classification may legitimately depend on the delayed base-language asset. Observe
          // the mounted surface before releasing that response, then use visible localized text
          // as the completion signal and prove that the stale text never appeared in between.
          await page.evaluate((oldText) => {
            const observedState = { staleTextSeen: document.body.innerText.includes(oldText) };
            const observer = new MutationObserver(() => {
              if (document.body.innerText.includes(oldText)) observedState.staleTextSeen = true;
            });
            observer.observe(document.body, {
              characterData: true,
              childList: true,
              subtree: true,
            });
            (
              window as typeof window & {
                __codexE2EReferenceRaceObserver?: {
                  observedState: typeof observedState;
                  observer: MutationObserver;
                };
              }
            ).__codexE2EReferenceRaceObserver = { observedState, observer };
          }, staleText);

          releaseOldResponseOnce();
          await expect
            .poll(
              () =>
                staleResponsesFinished === staleRequestsStarted &&
                Date.now() - staleLastStartedAt >= REQUEST_BATCH_QUIET_MS,
              { timeout: REFERENCE_RACE_SETTLE_TIMEOUT_MS },
            )
            .toBe(true);
          expect(staleResponseErrors).toEqual([]);
          await expect(page.getByText(currentText, { exact: true })).toBeVisible({
            timeout: REFERENCE_RACE_SETTLE_TIMEOUT_MS,
          });
          await page.evaluate(
            () =>
              new Promise<void>((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
              }),
          );

          await expect(page.getByText(currentText, { exact: true })).toBeVisible();
          await expect(page.getByText(staleText, { exact: true })).toHaveCount(0);
          const staleTextSeen = await page.evaluate(() => {
            const runtimeWindow = window as typeof window & {
              __codexE2EReferenceRaceObserver?: {
                observedState: { staleTextSeen: boolean };
                observer: MutationObserver;
              };
            };
            const state = runtimeWindow.__codexE2EReferenceRaceObserver;
            state?.observer.disconnect();
            delete runtimeWindow.__codexE2EReferenceRaceObserver;
            return state?.observedState.staleTextSeen;
          });
          expect(staleTextSeen).toBe(false);
        } finally {
          releaseOldResponseOnce();
          await page.unroute(staleAssetPattern);
        }
      });
    }
  }
});

test('previous-revision browser caches fail closed and process deep links survive locale reloads', async ({
  baseURL,
  page,
}, testInfo) => {
  test.setTimeout(10 * 60_000);
  test.skip(
    process.env.E2E_AUTHENTICATED !== 'true' || process.env.E2E_ALLOW_PRODUCTION_DATA !== 'true',
    'Reference cache semantics require the explicit production-data guard and credentials.',
  );
  annotateEvidence(testInfo, processAssertion, 'reference-refresh-cache');
  const ledger = await readProductionDataLedger();
  const referenceFixture = loadReferenceFixture();
  expect(ledger).toBeTruthy();
  expect(baseURL).toBeTruthy();
  const definitions = getReadableLocaleDefinitions();
  const fixtures = getConsumerFixtures(referenceFixture);
  await signInViaUi(page);
  await expectCurrentReferenceCacheBaseline(page, fixtures, definitions);

  for (const [index, definition] of definitions.entries()) {
    await test.step(`${definition.appLocale} reload rejects both stale cache scopes`, async () => {
      const staleDefinition = definitions[(index + 1) % definitions.length]!;
      const mountedProcessDrawer = page.locator('.ant-drawer-content:visible');
      const expectsMountedProcessDrawer = index > 0;
      if (expectsMountedProcessDrawer) {
        // Each completed iteration deliberately leaves its deep-linked Process drawer mounted.
        await expect(mountedProcessDrawer).toHaveCount(1);
        await selectLocaleThroughHeader(page, staleDefinition, { forceTrigger: true });
      } else {
        // The signed-in shell is unobstructed, so retain a real user pointer interaction.
        await expect(mountedProcessDrawer).toHaveCount(0);
        await selectLocaleThroughHeader(page, staleDefinition);
      }
      const state = `cache-roundtrip-${definition.languageCode}`;
      const targetUrl = buildProcessDeepLink(baseURL!, ledger!, state);
      await gotoCandidateDocument(page, targetUrl);
      await expectProcessDeepLink(page, ledger!, state);

      const documentIdentity = await page.evaluate(() => {
        const identity = crypto.randomUUID();
        document.documentElement.dataset.codexE2eDocumentIdentity = identity;
        return identity;
      });
      await selectLocaleThroughHeader(page, definition, { forceTrigger: true });
      expect(page.url()).toBe(targetUrl);
      await expectProcessDeepLink(page, ledger!, state);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.dataset.codexE2eDocumentIdentity))
        .toBe(documentIdentity);
      for (const fixture of fixtures) {
        await expect(
          page.getByText(fixture.visibleText(definition), { exact: true }),
        ).toBeVisible();
      }

      const staleMarker = `codex-e2e previous reference revision ${definition.languageCode}`;
      const requestCounts = new Map<string, number>();
      for (const fixture of fixtures) {
        const pattern = `**/${fixture.assetDirectory}/${fixture.assetFileName(definition)}`;
        requestCounts.set(fixture.id, 0);
        await page.route(pattern, async (route) => {
          requestCounts.set(fixture.id, (requestCounts.get(fixture.id) ?? 0) + 1);
          const response = await route.fetch();
          await route.fulfill({ response });
        });
      }

      try {
        const injectedEntries = await injectPreviousRevisionEntries(
          page,
          fixtures,
          definition,
          staleMarker,
        );
        await expectPreviousRevisionEntriesInjected(page, injectedEntries);
        await page.reload({ waitUntil: 'domcontentloaded' });
        expect(page.url()).toBe(targetUrl);
        await expectProcessDeepLink(page, ledger!, state);
        await expect.poll(() => readStoredAppLocale(page)).toBe(definition.appLocale);
        await expect
          .poll(() =>
            page.evaluate(() => document.documentElement.dataset.codexE2EDocumentIdentity ?? null),
          )
          .not.toBe(documentIdentity);

        for (const fixture of fixtures) {
          const identity = fixture.cacheIdentity(definition);
          await expect(
            page.getByText(fixture.visibleText(definition), { exact: true }),
          ).toBeVisible();
          await expect(page.getByText(`${staleMarker}-${fixture.id}`, { exact: true })).toHaveCount(
            0,
          );
          await expect.poll(() => requestCounts.get(fixture.id) ?? 0).toBeGreaterThan(0);
          await expect
            .poll(() => readCacheEntryIdentity(page, fixture, identity.fileName))
            .toEqual({ revision: identity.cacheRevision, sha256: identity.jsonSha256 });
          await expect
            .poll(() => readCacheManifestIdentity(page, fixture), { timeout: 180_000 })
            .toEqual({
              files: [...getReferenceResourceCacheFiles(fixture.scope)].sort(),
              version: getReferenceResourceCacheVersion(fixture.scope),
            });
        }
      } finally {
        for (const fixture of fixtures) {
          await page.unroute(`**/${fixture.assetDirectory}/${fixture.assetFileName(definition)}`);
        }
      }
    });
  }
});

test('process edit form consumes current classification and location assets in every readable locale', async ({
  baseURL,
  page,
}, testInfo) => {
  test.skip(
    process.env.E2E_AUTHENTICATED !== 'true' || process.env.E2E_ALLOW_PRODUCTION_DATA !== 'true',
    'Reference form semantics require the explicit production-data guard and credentials.',
  );
  annotateEvidence(testInfo, processAssertion, 'reference-refresh');
  const ledger = await readProductionDataLedger();
  const referenceFixture = loadReferenceFixture();
  expect(ledger).toBeTruthy();
  expect(baseURL).toBeTruthy();
  await signInViaUi(page);

  for (const [index, definition] of getReadableLocaleDefinitions().entries()) {
    await test.step(`${definition.appLocale} process form reference controls`, async () => {
      const mountedProcessDrawer = page.locator('.ant-drawer-content:visible');
      const expectsMountedProcessDrawer = index > 0;
      if (expectsMountedProcessDrawer) {
        await expect(mountedProcessDrawer).toHaveCount(1);
        await selectLocaleThroughHeader(page, definition, { forceTrigger: true });
      } else {
        await expect(mountedProcessDrawer).toHaveCount(0);
        await selectLocaleThroughHeader(page, definition);
      }
      const state = `form-${definition.languageCode}`;
      await gotoCandidateDocument(page, buildProcessDeepLink(baseURL!, ledger!, state, 'edit'));
      await expectProcessDeepLink(page, ledger!, state, 'edit');
      await expect(
        page.getByText(getLocaleMessage(definition.appLocale, 'pages.process.drawer.title.edit'), {
          exact: true,
        }),
      ).toBeVisible();

      const drawer = page.locator('.ant-drawer:visible');
      const locationFormItem = drawer
        .locator('.ant-form-item')
        .filter({
          has: page.getByText(
            getLocaleMessage(
              definition.appLocale,
              'pages.process.view.processInformation.location',
            ),
            { exact: true },
          ),
        })
        .first();
      const localizedLocation = `${referenceFixture.location.code} (${referenceFixture.location.labels[definition.languageCode]})`;
      await expect(locationFormItem.locator('.ant-select-selection-item')).toHaveText(
        localizedLocation,
      );
      const locationCombobox = locationFormItem.getByRole('combobox');
      await locationFormItem.locator('.ant-select-selector').click();
      const listboxId = await locationCombobox.getAttribute('aria-controls');
      if (!listboxId) {
        throw new Error('Location selector did not expose its active listbox identity.');
      }
      const locationPopup = page.locator('.ant-select-dropdown:visible').filter({
        has: page.locator(`[role="listbox"][id="${listboxId}"]`),
      });
      await expect(locationPopup).toHaveCount(1);
      const visibleOptionContent = locationPopup
        .locator('.ant-select-item-option-content')
        .filter({ hasText: localizedLocation });
      await expect(visibleOptionContent).toHaveCount(1);
      await expect(visibleOptionContent).toHaveText(localizedLocation);
      await expect(visibleOptionContent).toBeVisible();
      await page.keyboard.press('Escape');

      const classificationFormItem = drawer
        .locator('.ant-form-item')
        .filter({
          has: page.getByText(
            getLocaleMessage(definition.appLocale, 'pages.contact.classification'),
            { exact: true },
          ),
        })
        .first();
      const classificationPath =
        referenceFixture.classification.labels[definition.languageCode].join('/');
      await expect(classificationFormItem.locator('.ant-select-selection-item')).toHaveText(
        classificationPath,
      );
      await classificationFormItem.locator('.ant-select-selector').click();
      const classificationLeaf =
        referenceFixture.classification.labels[definition.languageCode][
          referenceFixture.classification.labels[definition.languageCode].length - 1
        ]!;
      await classificationFormItem.locator('input[role="combobox"]').fill(classificationLeaf);
      await expect(
        page
          .locator('.ant-select-tree:visible')
          .getByText(classificationLeaf, { exact: true })
          .first(),
      ).toBeVisible();
      await page.keyboard.press('Escape');
    });
  }
});
