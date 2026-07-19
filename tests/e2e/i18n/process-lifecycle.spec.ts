import { expect, test } from './fixtures';

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

test('codex-e2e process renders every registry-backed content language', async ({
  baseURL,
  page,
}, testInfo) => {
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
  await page.goto(routeToCandidateUrl(baseURL!, route), { waitUntil: 'domcontentloaded' });
  for (const locale of APP_LOCALES) {
    const scenario = resolveLocaleContentE2EScenario(getLocaleCapability(locale));
    await selectAppLocaleThroughUi(page, locale);
    await expect.poll(() => readStoredAppLocale(page)).toBe(locale);
    await expect(
      page.getByText(getLocaleMessage(locale, 'pages.process.view.processInformation'), {
        exact: true,
      }),
    ).toBeVisible();
    switch (scenario.status) {
      case 'native':
        for (const field of MULTILINGUAL_PROCESS_FIELDS) {
          for (const { languageCode, nativeLabel } of AUTHORING_LANGUAGE_DEFINITIONS) {
            const marker = `${ledger!.marker} ${field} ${languageCode}`;
            const markerValue = page.getByText(marker, { exact: true });
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
    await expect(
      page.getByText(
        `${referenceFixture.location.code} (${referenceFixture.location.labels[scenario.contentLanguage]})`,
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText(referenceFixture.classification.labels[scenario.contentLanguage].join(' > '), {
        exact: true,
      }),
    ).toBeVisible();
  }
});
