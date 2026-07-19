import { CONTENT_LANGUAGE_REGISTRY } from '../../../src/services/general/contentLanguageRegistry';
import { signInViaUi } from './auth';
import {
  annotateEvidence,
  APP_LOCALES,
  findRouteAssertion,
  getLocaleMessage,
  routeToCandidateUrl,
  selectAppLocaleThroughUi,
} from './contracts';
import { expect, test } from './fixtures';
import { readProductionDataLedger } from './production-data-ledger';
import {
  assertProductionDataWriteAuthorization,
  getCodexE2EProcessSynonym,
} from './production-data-safety';

const processAssertion = findRouteAssertion('/mydata/processes');
const AUTHORING_LANGUAGE_DEFINITIONS = CONTENT_LANGUAGE_REGISTRY.filter(
  ({ authoring }) => authoring.enabled,
);
const productionSaveEnabled =
  process.env.E2E_AUTHENTICATED === 'true' && process.env.E2E_ALLOW_PRODUCTION_DATA === 'true';

test.use({ allowLedgerControlledProcessSaveDraft: productionSaveEnabled });

test('one ledger-controlled Process UI save persists every authoring language', async ({
  baseURL,
  browserName,
  page,
  productionRequestGuard,
}, testInfo) => {
  test.skip(
    !productionSaveEnabled || browserName !== 'chromium',
    'The exact ledger-controlled Process UI mutation runs once in Chromium during the authorized production-data run.',
  );
  annotateEvidence(testInfo, processAssertion, 'persisted-multilingual-authoring');
  expect(baseURL).toBeTruthy();
  const ledger = await readProductionDataLedger();
  expect(ledger).toBeTruthy();

  await signInViaUi(page);
  const editRoute = `/mydata/processes?id=${ledger!.id}&version=${ledger!.version}&mode=edit`;
  const openLocalizedEditor = async (locale: (typeof APP_LOCALES)[number]) => {
    await selectAppLocaleThroughUi(page, locale);
    await page.goto(routeToCandidateUrl(baseURL!, editRoute), { waitUntil: 'domcontentloaded' });
    // Remount the auto-open drawer after the prior localized instance was closed. Every
    // pre-save pass remains read-only and targets the same exact ledger UUID.
    await page.reload({ waitUntil: 'domcontentloaded' });
    const drawer = page.locator('.ant-drawer-content:visible').filter({
      has: page.getByText(getLocaleMessage(locale, 'pages.process.drawer.title.edit'), {
        exact: true,
      }),
    });
    await expect(drawer).toHaveCount(1);
    await expect(drawer).toBeVisible();
    const cardTitle = drawer
      .locator('.ant-card-head-title')
      .getByText(getLocaleMessage(locale, 'pages.process.view.processInformation.synonyms'), {
        exact: true,
      });
    const card = cardTitle.locator(
      'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-card ")][1]',
    );
    await expect(card).toHaveCount(1);
    await expect(card).toBeVisible();
    await expect(card.locator('[data-content-language]')).toHaveCount(
      AUTHORING_LANGUAGE_DEFINITIONS.length,
      { timeout: 45_000 },
    );
    return { card, drawer };
  };

  for (const locale of APP_LOCALES.filter((candidate) => candidate !== 'de-DE')) {
    const { card, drawer } = await openLocalizedEditor(locale);
    for (const { languageCode, nativeLabel } of AUTHORING_LANGUAGE_DEFINITIONS) {
      const languageRow = card.locator(`[data-content-language="${languageCode}"]`);
      await expect(languageRow).toHaveCount(1);
      await expect(languageRow.getByRole('combobox')).toHaveCount(1);
      await expect(languageRow.locator('.ant-select-selection-item')).toHaveText(nativeLabel);
      const textArea = languageRow.locator('textarea');
      await expect(textArea).toHaveCount(1);
      await expect(textArea).toHaveValue(
        getCodexE2EProcessSynonym(ledger!, languageCode, 'before-ui-save'),
      );
    }
    const closeButton = drawer.locator('.ant-drawer-header button').last();
    await expect(closeButton).toBeVisible();
    await closeButton.evaluate((button) => (button as HTMLButtonElement).click());
    await expect(drawer).toBeHidden();
    await page.goto(routeToCandidateUrl(baseURL!, '/mydata/processes'), {
      waitUntil: 'domcontentloaded',
    });
  }

  const { card: synonymsCard, drawer: editDrawer } = await openLocalizedEditor('de-DE');

  for (const { languageCode, nativeLabel } of AUTHORING_LANGUAGE_DEFINITIONS) {
    const languageRow = synonymsCard.locator(`[data-content-language="${languageCode}"]`);
    await expect(languageRow).toHaveCount(1);
    await expect(languageRow.getByRole('combobox')).toHaveCount(1);
    await expect(languageRow.locator('.ant-select-selection-item')).toHaveText(nativeLabel);
    const textArea = languageRow.locator('textarea');
    await expect(textArea).toHaveCount(1);
    await expect(textArea).toHaveValue(
      getCodexE2EProcessSynonym(ledger!, languageCode, 'before-ui-save'),
    );
    await textArea.fill(getCodexE2EProcessSynonym(ledger!, languageCode, 'after-ui-save'));
  }

  // Revalidate the complete local operator envelope at the actual browser mutation boundary.
  assertProductionDataWriteAuthorization(process.env);
  const saveResponse = page.waitForResponse((response) => {
    const target = new URL(response.url());
    return (
      response.request().method() === 'POST' &&
      target.pathname === '/functions/v1/app_dataset_save_draft'
    );
  });
  await editDrawer
    .getByRole('button', {
      name: getLocaleMessage('de-DE', 'pages.button.save'),
      exact: true,
    })
    .click();
  expect((await saveResponse).ok()).toBe(true);
  await expect.poll(() => productionRequestGuard.allowedLedgerControlledSaveDraftRequests).toBe(1);
  await expect(
    page.getByText(getLocaleMessage('de-DE', 'pages.button.save.success'), { exact: true }),
  ).toBeVisible();
  await expect(editDrawer).toBeHidden();

  await selectAppLocaleThroughUi(page, 'fr-FR');
  const viewRoute = `/mydata/processes?id=${ledger!.id}&version=${ledger!.version}&mode=view`;
  await page.goto(routeToCandidateUrl(baseURL!, viewRoute), { waitUntil: 'domcontentloaded' });
  const viewDrawer = page.locator('.ant-drawer-content:visible').filter({
    has: page.getByText(getLocaleMessage('fr-FR', 'pages.process.drawer.title.view'), {
      exact: true,
    }),
  });
  await expect(viewDrawer).toHaveCount(1);
  await expect(viewDrawer).toBeVisible();

  for (const { languageCode, nativeLabel } of AUTHORING_LANGUAGE_DEFINITIONS) {
    const afterValue = getCodexE2EProcessSynonym(ledger!, languageCode, 'after-ui-save');
    const beforeValue = getCodexE2EProcessSynonym(ledger!, languageCode, 'before-ui-save');
    const valueCell = viewDrawer.getByText(afterValue, { exact: true });
    await expect(valueCell).toHaveCount(1);
    await expect(valueCell).toBeVisible();
    const languageRow = valueCell.locator('xpath=ancestor::tr[1]');
    await expect(languageRow.locator('.ant-descriptions-item-label')).toHaveText(nativeLabel);
    await expect(languageRow.locator('.ant-descriptions-item-content')).toHaveText(afterValue);
    await expect(languageRow.locator('.ant-descriptions-item-content')).not.toHaveText(
      /^\s*-\s*$/u,
    );
    await expect(viewDrawer.getByText(beforeValue, { exact: true })).toHaveCount(0);
  }
});
