import fs from 'node:fs';
import path from 'node:path';

import { LOCALE_CAPABILITY_MATRIX } from '@/services/general/localeCapabilities';
import {
  getReferenceRuntimeAssetCacheIdentity,
  REFERENCE_RESOURCE_MANIFEST,
} from '@/services/referenceResources/manifest';
import { APP_LOCALES, findRouteAssertion } from '../../e2e/i18n/contracts';

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
const SPEC_PATH = 'tests/e2e/i18n/reference-refresh.spec.ts';

describe('reference refresh semantic E2E contract', () => {
  it('requires race and previous-revision cache closure on the process deep link', () => {
    const assertion = findRouteAssertion('/mydata/processes');
    expect(assertion.requiredScenarios).toEqual(
      expect.arrayContaining(['reference-refresh', 'reference-refresh-cache']),
    );
    expect(assertion.focusedTests).toContain('tests/unit/e2e/referenceRefreshContract.test.ts');
  });

  it('partitions every active UI locale through its explicit content-reading capability', () => {
    expect(LOCALE_CAPABILITY_MATRIX.map(({ appLocale }) => appLocale)).toEqual(APP_LOCALES);
    const unsupported = LOCALE_CAPABILITY_MATRIX.filter(
      ({ contentReading }) => contentReading === 'unsupported',
    );
    const readable = LOCALE_CAPABILITY_MATRIX.filter(
      ({ contentReading }) => contentReading !== 'unsupported',
    );
    expect(
      unsupported.every(
        (capability) =>
          capability.contentLanguage === undefined && capability.referenceResources.length === 0,
      ),
    ).toBe(true);
    expect(readable.every(({ contentLanguage }) => Boolean(contentLanguage))).toBe(true);
    expect(readable.length + unsupported.length).toBe(APP_LOCALES.length);
  });

  it('binds every managed cache asset to an exact revision and full JSON/gzip digests', () => {
    for (const resource of REFERENCE_RESOURCE_MANIFEST) {
      for (const asset of Object.values(resource.runtimeAssets)) {
        expect(getReferenceRuntimeAssetCacheIdentity(asset.fileName)).toEqual(
          expect.objectContaining({
            cacheRevision: resource.cacheRevision,
            gzipSha256: asset.gzipDigest.value,
            jsonSha256: asset.jsonDigest.value,
            scope: resource.scope,
          }),
        );
      }
    }
  });

  it('drives both real resource scopes without screenshots, traces, video, or writes', () => {
    const source = fs.readFileSync(path.join(REPOSITORY_ROOT, SPEC_PATH), 'utf8');
    expect(source).toContain("id: 'classification'");
    expect(source).toContain("id: 'location'");
    expect(source).toContain("'reference-refresh-cache'");
    expect(source).toContain('projectBrowserCacheDescriptor');
    expect(source).toContain('expectCurrentReferenceCacheBaseline');
    expect(source).toContain('injectPreviousRevisionEntries');
    expect(source).toContain('expectPreviousRevisionEntriesInjected');
    expect(source).toContain("mode?: 'edit' | 'view'");
    expect(source).toContain("error.message.includes('NS_ERROR_FAILURE')");
    expect(source).toContain(
      'await gotoCandidateDocument(page, browserName, targetUrl, ledger!, state);',
    );
    expect(source).toContain("page.reload({ waitUntil: 'domcontentloaded' })");
    expect(source).toContain("locator('.ant-select-dropdown:visible')");
    expect(source).not.toContain("getByRole('option'");
    expect(source.indexOf('await expectCurrentReferenceCacheBaseline')).toBeLessThan(
      source.indexOf('await injectPreviousRevisionEntries'),
    );
    expect(source).not.toMatch(/page\.screenshot|ariaSnapshot|context\.tracing|recordVideo/gu);
    expect(source).not.toMatch(/updateProcess|insert\(|delete\(|upsert\(/gu);
  });

  it('uses one candidate navigation and accepts Firefox cancellation only after exact mount readiness', () => {
    const source = fs.readFileSync(path.join(REPOSITORY_ROOT, SPEC_PATH), 'utf8');
    const helperStart = source.indexOf('async function gotoCandidateDocument(');
    const helperEnd = source.indexOf(
      '\n}\n\nasync function selectLocaleThroughHeader(',
      helperStart,
    );
    const helperSource = source.slice(helperStart, helperEnd);
    const detailReadyGuard = helperSource.indexOf("if (mode === 'view')");
    const detailReady = helperSource.indexOf(
      "toHaveAttribute('data-detail-ready', 'true'",
      detailReadyGuard,
    );
    const idleGuard = helperSource.indexOf('if (waitForDrawerIdle)', detailReady);
    const nestedIdleWait = helperSource.indexOf("drawer.locator('.ant-spin-spinning')", idleGuard);

    expect(helperStart).toBeGreaterThan(-1);
    expect(helperEnd).toBeGreaterThan(helperStart);
    expect(helperSource).toContain("browserName === 'firefox'");
    expect(helperSource).toContain("error.message.includes('NS_ERROR_FAILURE')");
    expect(helperSource).toContain("error.message.includes('NS_BINDING_ABORTED')");
    expect(helperSource).toContain('throw error;');
    expect(helperSource).toContain(
      "await page.goto(targetUrl, { timeout: 45_000, waitUntil: 'domcontentloaded' });",
    );
    expect(helperSource.match(/page[.]goto[(]/gu)).toHaveLength(1);
    expect(helperSource).toContain(
      'expect.poll(() => page.url(), { timeout: 45_000 }).toBe(targetUrl)',
    );
    expect(helperSource).toContain('await expectProcessDeepLink(page, ledger, state, mode);');
    expect(helperSource).toContain("const { mode = 'view', waitForDrawerIdle = true } = options;");
    expect(detailReadyGuard).toBeGreaterThan(-1);
    expect(detailReady).toBeGreaterThan(detailReadyGuard);
    expect(idleGuard).toBeGreaterThan(detailReady);
    expect(nestedIdleWait).toBeGreaterThan(idleGuard);
    expect(helperSource).toContain("page.locator('.tg-global-header-avatar-trigger')");
    expect(helperSource).toContain("page.locator('.tg-global-language-selector')");
    expect(helperSource).toContain("page.locator('.ant-result-403')");
    expect(helperSource).toContain("page.getByTestId('process-deep-link-state')");
    expect(helperSource).toContain("toHaveAttribute('data-route-mode', mode");
    expect(helperSource).toContain(
      "page.locator('.ant-drawer-content:visible').filter({ has: deepLinkState })",
    );
    expect(source).not.toContain('isAuthenticatedWelcomeBootRedirect');
    expect(source).not.toContain('MAX_CANDIDATE_NAVIGATION_ATTEMPTS');
    expect(helperSource).not.toContain('selectLocaleThroughHeader');
    expect(helperSource).not.toContain('staleRequestsStarted');
    expect(helperSource).not.toContain('releaseOldResponseOnce');
  });

  it('settles the delayed-response race through mounted localized text, not a required network miss', () => {
    const source = fs.readFileSync(path.join(REPOSITORY_ROOT, SPEC_PATH), 'utf8');
    const raceStart = source.indexOf(
      "test('delayed old-locale classification and location responses never overwrite the mounted locale'",
    );
    const raceEnd = source.indexOf(
      "test('previous-revision browser caches fail closed and process deep links survive locale reloads'",
      raceStart,
    );
    const raceSource = source.slice(raceStart, raceEnd);
    const timeoutBudget = raceSource.indexOf('test.setTimeout(');
    const navigationReady = raceSource.indexOf('await gotoCandidateDocument(');
    const staleConsumersDefined = raceSource.indexOf('const staleConsumers =', navigationReady);
    const navigationCall = raceSource.slice(navigationReady, staleConsumersDefined);
    const staleConsumerPending = raceSource.indexOf('.toBeGreaterThan(0);', staleConsumersDefined);
    const staleRequestStarted = raceSource.indexOf('staleRequestsStarted > 0');
    const staleResponseHeld = raceSource.indexOf(
      'expect(staleResponsesFinished).toBe(0);',
      staleRequestStarted,
    );
    const observerInstall = raceSource.indexOf('__codexE2EReferenceRaceObserver =');
    const staleRelease = raceSource.indexOf('releaseOldResponseOnce();', observerInstall);
    const staleResponseSettled = raceSource.indexOf(
      'staleResponsesFinished === staleRequestsStarted',
      staleRelease,
    );
    const currentTextVisible = raceSource.indexOf(
      'expect(localizedViewDrawer.getByText(currentText, { exact: true })).toBeVisible({',
      staleRelease,
    );

    expect(raceStart).toBeGreaterThan(-1);
    expect(raceEnd).toBeGreaterThan(raceStart);
    expect(timeoutBudget).toBeGreaterThan(-1);
    expect(navigationReady).toBeGreaterThan(timeoutBudget);
    expect(staleConsumersDefined).toBeGreaterThan(navigationReady);
    expect(navigationCall).toContain('waitForDrawerIdle: false');
    expect(staleConsumerPending).toBeGreaterThan(staleConsumersDefined);
    expect(staleRequestStarted).toBeGreaterThan(staleConsumerPending);
    expect(staleResponseHeld).toBeGreaterThan(staleRequestStarted);
    expect(observerInstall).toBeGreaterThan(staleResponseHeld);
    expect(staleRelease).toBeGreaterThan(observerInstall);
    expect(staleResponseSettled).toBeGreaterThan(staleRelease);
    expect(currentTextVisible).toBeGreaterThan(staleRelease);
    expect(raceSource).toContain('timeout: REFERENCE_RACE_SETTLE_TIMEOUT_MS');
    expect(raceSource).toContain(
      'const referenceRaceStepCount = consumerFixtures.length * localePairs.length;',
    );
    expect(raceSource).toContain(
      'REFERENCE_RACE_BASE_TIMEOUT_MS + referenceRaceStepCount * REFERENCE_RACE_STEP_TIMEOUT_MS',
    );
    expect(source).toContain('const REFERENCE_RACE_STEP_TIMEOUT_MS = 90_000;');
    expect(raceSource).toContain('staleRequestsStarted > 0');
    expect(raceSource).toContain('data-reference-pending="true"');
    expect(raceSource).toContain('expect(staleTextSeen).toBe(false)');
    expect(raceSource).not.toContain('currentRequestsStarted');
    expect(raceSource).not.toContain('currentResponsesFinished');
    const localeSwitch = raceSource.indexOf(
      'await selectLocaleThroughHeader(page, currentDefinition, { forceTrigger: true });',
      navigationReady,
    );
    const postLocaleDeepLinkAssertion = raceSource.indexOf(
      'await expectProcessDeepLink(page, ledger!, state);',
      localeSwitch,
    );
    expect(staleResponseHeld).toBeGreaterThan(navigationReady);
    expect(localeSwitch).toBeGreaterThan(navigationReady);
    expect(localeSwitch).toBeGreaterThan(staleResponseHeld);
    expect(postLocaleDeepLinkAssertion).toBeGreaterThan(localeSwitch);
  });

  it('uses programmatic locale activation only when the previous-revision drawer stays mounted', () => {
    const source = fs.readFileSync(path.join(REPOSITORY_ROOT, SPEC_PATH), 'utf8');
    const cacheStart = source.indexOf(
      "test('previous-revision browser caches fail closed and process deep links survive locale reloads'",
    );
    const cacheEnd = source.indexOf(
      "test('process edit form consumes current classification and location assets in every readable locale'",
      cacheStart,
    );
    const cacheSource = source.slice(cacheStart, cacheEnd);
    const mountedState = cacheSource.indexOf('const expectsMountedProcessDrawer = index > 0;');
    const mountedBranch = cacheSource.indexOf('if (expectsMountedProcessDrawer)', mountedState);
    const mountedDrawerAssertion = cacheSource.indexOf(
      'await expect(mountedProcessDrawer).toHaveCount(1);',
      mountedBranch,
    );
    const programmaticActivation = cacheSource.indexOf(
      'await selectLocaleThroughHeader(page, staleDefinition, { forceTrigger: true });',
      mountedDrawerAssertion,
    );
    const realPointerActivation = cacheSource.indexOf(
      'await selectLocaleThroughHeader(page, staleDefinition);',
      programmaticActivation,
    );

    expect(cacheStart).toBeGreaterThan(-1);
    expect(cacheEnd).toBeGreaterThan(cacheStart);
    expect(mountedState).toBeGreaterThan(-1);
    expect(mountedBranch).toBeGreaterThan(mountedState);
    expect(mountedDrawerAssertion).toBeGreaterThan(mountedBranch);
    expect(programmaticActivation).toBeGreaterThan(mountedDrawerAssertion);
    expect(realPointerActivation).toBeGreaterThan(programmaticActivation);
    expect(cacheSource).not.toMatch(/catch[\s\S]*forceTrigger/gu);
  });

  it('makes the same mounted-surface choice explicit in the other repeated drawer scenarios', () => {
    const source = fs.readFileSync(path.join(REPOSITORY_ROOT, SPEC_PATH), 'utf8');
    const raceStart = source.indexOf(
      "test('delayed old-locale classification and location responses never overwrite the mounted locale'",
    );
    const cacheStart = source.indexOf(
      "test('previous-revision browser caches fail closed and process deep links survive locale reloads'",
      raceStart,
    );
    const formStart = source.indexOf(
      "test('process edit form consumes current classification and location assets in every readable locale'",
      cacheStart,
    );
    const raceSource = source.slice(raceStart, cacheStart);
    const formSource = source.slice(formStart);

    expect(raceSource).toContain(
      'const expectsMountedProcessDrawer = fixtureIndex > 0 || localePairIndex > 0;',
    );
    expect(raceSource).toContain('if (expectsMountedProcessDrawer)');
    expect(raceSource).toContain('await selectLocaleThroughHeader(page, staleDefinition);');
    expect(raceSource).toContain(
      'await selectLocaleThroughHeader(page, staleDefinition, { forceTrigger: true });',
    );
    expect(formSource).toContain('const expectsMountedProcessDrawer = index > 0;');
    expect(formSource).toContain('if (expectsMountedProcessDrawer)');
    expect(formSource).toContain('await selectLocaleThroughHeader(page, definition);');
    expect(formSource).toContain(
      'await selectLocaleThroughHeader(page, definition, { forceTrigger: true });',
    );
  });

  it('scopes mounted current-reference text to one localized View Process drawer', () => {
    const source = fs.readFileSync(path.join(REPOSITORY_ROOT, SPEC_PATH), 'utf8');
    const raceStart = source.indexOf(
      "test('delayed old-locale classification and location responses never overwrite the mounted locale'",
    );
    const cacheStart = source.indexOf(
      "test('previous-revision browser caches fail closed and process deep links survive locale reloads'",
      raceStart,
    );
    const cacheEnd = source.indexOf(
      "test('process edit form consumes current classification and location assets in every readable locale'",
      cacheStart,
    );
    const raceSource = source.slice(raceStart, cacheStart);
    const cacheSource = source.slice(cacheStart, cacheEnd);

    expect(source).toContain('function getLocalizedProcessViewDrawer(');
    expect(source).toContain("page.locator('.ant-drawer-content:visible').filter({");
    expect(source).toContain("getLocaleMessage(locale, 'pages.process.drawer.title.view')");
    expect(raceSource).toContain('await expect(localizedViewDrawer).toHaveCount(1);');
    expect(raceSource).toContain('localizedViewDrawer.getByText(currentText, { exact: true })');
    expect(raceSource).not.toContain('page.getByText(currentText, { exact: true })');
    expect(
      cacheSource.match(/await expect\(localizedViewDrawer\)[.]toHaveCount\(1\);/gu),
    ).toHaveLength(2);
    expect(cacheSource).toContain(
      'localizedViewDrawer.getByText(fixture.visibleText(definition), { exact: true })',
    );
    expect(cacheSource).not.toContain(
      'page.getByText(fixture.visibleText(definition), { exact: true })',
    );

    // Stale content must remain absent from the whole page, not merely from the drawer.
    expect(raceSource).toContain(
      'await expect(page.getByText(staleText, { exact: true })).toHaveCount(0);',
    );
    expect(cacheSource).toContain(
      'await expect(page.getByText(`${staleMarker}-${fixture.id}`, { exact: true })).toHaveCount(',
    );
  });
});
