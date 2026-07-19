import { expect, type Locator, type Page, test } from './fixtures';

import { CONTENT_LANGUAGE_REGISTRY } from '../../../src/services/general/contentLanguageRegistry';
import { getLocaleCapability } from '../../../src/services/general/localeCapabilities';
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
import { resolveLocaleContentE2EScenario } from './locale-capability-scenarios';
import { readProductionDataLedger } from './production-data-ledger';
import { loadReferenceFixture } from './reference-fixture';

const processAssertion = findRouteAssertion('/mydata/processes');
const AUTHORING_LANGUAGE_DEFINITIONS = CONTENT_LANGUAGE_REGISTRY.filter(
  ({ authoring }) => authoring.enabled,
);
const MULTILINGUAL_PROCESS_FIELDS = [
  'baseName',
  'treatmentStandardsRoutes',
  'mixAndLocationTypes',
  'functionalUnitFlowProperties',
  'generalComment',
] as const;

async function expectDrawerDescriptionValue(drawer: Locator, expectedValue: string) {
  const value = drawer.getByText(expectedValue, { exact: true });
  await expect(value).toHaveCount(1);
  await expect(value).toBeVisible();

  const row = value.locator('xpath=ancestor::tr[1]');
  await expect(row).toHaveCount(1);
  await expect(row.locator('.ant-descriptions-item-content')).toHaveText(expectedValue);
}

async function gotoProcessViewReady(
  page: Page,
  browserName: string,
  targetUrl: string,
): Promise<void> {
  try {
    await page.goto(targetUrl, { timeout: 45_000, waitUntil: 'domcontentloaded' });
  } catch (error) {
    const isCommittedFirefoxCancellation =
      browserName === 'firefox' &&
      error instanceof Error &&
      (error.message.includes('NS_ERROR_FAILURE') || error.message.includes('NS_BINDING_ABORTED'));
    if (!isCommittedFirefoxCancellation) {
      throw error;
    }
  }

  // A known Firefox cancellation is acceptable only when the exact candidate route and its
  // authenticated Process drawer nevertheless committed. Welcome, login, access-denied, and
  // wrong-query states all fail these assertions without another navigation attempt.
  await expect.poll(() => page.url(), { timeout: 45_000 }).toBe(targetUrl);
  await expect(page.locator('.tg-global-header-avatar-trigger')).toBeAttached({ timeout: 45_000 });
  await expect(page.locator('.tg-global-language-selector')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('.ant-result-403')).toHaveCount(0, { timeout: 45_000 });
  const state = page.getByTestId('process-deep-link-state');
  await expect(state).toBeAttached({ timeout: 45_000 });
  await expect(state).toHaveAttribute('data-route-mode', 'view', { timeout: 45_000 });
  const drawer = page.locator('.ant-drawer-content:visible').filter({ has: state });
  await expect(drawer).toHaveCount(1, { timeout: 45_000 });
  await expect(drawer).toBeVisible({ timeout: 45_000 });
  await expect(drawer.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 45_000 });
}

test('codex-e2e process renders every registry-backed content language', async ({
  baseURL,
  browserName,
  page,
}, testInfo) => {
  test.setTimeout(6 * 60_000);
  test.skip(
    process.env.E2E_AUTHENTICATED !== 'true' || process.env.E2E_ALLOW_PRODUCTION_DATA !== 'true',
    'Process lifecycle semantics require the explicit production-data guard and credentials.',
  );
  annotateEvidence(testInfo, processAssertion, 'persisted-multilingual-content');
  const ledger = await readProductionDataLedger();
  const referenceFixture = loadReferenceFixture();
  expect(ledger).toBeTruthy();
  expect(baseURL).toBeTruthy();
  await signInViaUi(page);

  const route = `/mydata/processes?id=${ledger!.id}&version=${ledger!.version}&mode=view`;
  await gotoProcessViewReady(page, browserName, routeToCandidateUrl(baseURL!, route));
  for (const locale of APP_LOCALES) {
    const scenario = resolveLocaleContentE2EScenario(getLocaleCapability(locale));
    await selectAppLocaleThroughUi(page, locale, { forceTrigger: true });
    await expect.poll(() => readStoredAppLocale(page)).toBe(locale);
    const viewDrawer = page.locator('.ant-drawer-content:visible').filter({
      has: page.getByText(getLocaleMessage(locale, 'pages.process.drawer.title.view'), {
        exact: true,
      }),
    });
    await expect(viewDrawer).toHaveCount(1);
    await expect(viewDrawer).toBeVisible();
    await expect(
      viewDrawer.getByText(getLocaleMessage(locale, 'pages.process.view.processInformation'), {
        exact: true,
      }),
    ).toBeVisible();
    switch (scenario.status) {
      case 'native':
        for (const field of MULTILINGUAL_PROCESS_FIELDS) {
          for (const { languageCode, nativeLabel } of AUTHORING_LANGUAGE_DEFINITIONS) {
            const marker = `${ledger!.marker} ${field} ${languageCode}`;
            const markerValue = viewDrawer.getByText(marker, { exact: true });
            await expect(markerValue).toHaveCount(1);
            await expect(markerValue).toBeVisible();

            const languageRow = markerValue.locator('xpath=ancestor::tr[1]');
            await expect(languageRow).toHaveCount(1);
            const labelCell = languageRow.locator('.ant-descriptions-item-label');
            const valueCell = languageRow.locator('.ant-descriptions-item-content');
            await expect(labelCell).toHaveCount(1);
            await expect(labelCell).toHaveText(nativeLabel);
            await expect(labelCell).not.toHaveText(/^\s*-\s*$/u);
            await expect(valueCell).toHaveCount(1);
            await expect(valueCell).toHaveText(marker);
            await expect(valueCell).not.toHaveText(/^\s*-\s*$/u);
          }
        }
        break;
      case 'declared-fallback':
        // The declared content language is asserted below through the
        // classification and location resolvers, without claiming native rows.
        break;
      case 'unsupported':
        // Only the localized application shell is in contract for this branch.
        continue;
    }
    await expectDrawerDescriptionValue(
      viewDrawer,
      `${referenceFixture.location.code} (${referenceFixture.location.labels[scenario.contentLanguage]})`,
    );
    await expectDrawerDescriptionValue(
      viewDrawer,
      referenceFixture.classification.labels[scenario.contentLanguage].join(' > '),
    );
  }
});
