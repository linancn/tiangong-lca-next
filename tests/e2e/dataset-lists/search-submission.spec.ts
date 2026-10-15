import { test, expect, type Locator, type Page } from '../i18n/fixtures';
import { signInViaUi } from '../i18n/auth';
import { getLocaleMessage, selectAppLocaleThroughUi } from '../i18n/contracts';
import {
  datasetRow,
  installDatasetListFixture,
  kinds,
  routeNames,
  type Kind,
  type QueryObservation,
} from './fixture';

const locale = process.env.SEARCH_PROOF_LOCALE === 'zh-CN' ? 'zh-CN' : 'en-US';
const message = (id: string) => getLocaleMessage(locale, id);
const rows = (root: Locator) => root.locator('.ant-table-tbody > tr[data-row-key]');
const searchInput = (root: Locator) => root.locator('.ant-input-search input');
const aiOption = (root: Locator) =>
  root.getByRole('checkbox', { name: message('pages.search.openAI'), exact: true });
const referenceOption = (root: Locator) =>
  root.getByRole('checkbox', { name: message('pages.search.referenceLookup'), exact: true });
const latest = (queries: QueryObservation[], kind: Kind) => {
  const matching = queries.filter((query) => query.kind === kind);
  return matching[matching.length - 1];
};

async function rowKeys(root: Locator) {
  return rows(root).evaluateAll((elements) =>
    elements.map((row) => row.getAttribute('data-row-key')),
  );
}

async function settledPaint(page: Page, root: Locator) {
  await expect(root.locator('.ant-spin-spinning')).toHaveCount(0);
  // Flush UI effects and the native table's short request scheduling window.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function expectApplied(
  root: Locator,
  queries: QueryObservation[],
  kind: Kind,
  mode: QueryObservation['mode'],
  keyword: string,
  current: number,
) {
  await expect.poll(() => latest(queries, kind)).toMatchObject({ mode, keyword, current });
  await expect(root.locator('.ant-pagination-item-active')).toHaveText(String(current));
  await expect(rows(root)).toHaveCount(current === 3 ? 37 : 50);
  await expect(rows(root).first()).toHaveAttribute(
    'data-row-key',
    new RegExp(datasetRow(kind, (current - 1) * 50).id),
  );
  await expect(rows(root).first()).toContainText(`${mode}:${keyword}`);
}

async function expectDraftOnly(
  page: Page,
  root: Locator,
  queries: QueryObservation[],
  before: number,
  keys: Array<string | null>,
) {
  await settledPaint(page, root);
  expect(queries).toHaveLength(before);
  expect(await rowKeys(root)).toEqual(keys);
}

test.use({ semanticPersona: 'data_product_manager' });
test.skip(
  process.env.E2E_QUALIFICATION !== 'true',
  'Submitted-search proof uses the synthetic qualification backend only.',
);

for (const kind of kinds) {
  test(`${kind} catalog submits draft mode and keyword together and keeps applied paging`, async ({
    page,
  }) => {
    const queries = await installDatasetListFixture(page, { labelSearchResults: true });
    await signInViaUi(page);
    await selectAppLocaleThroughUi(page, locale);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/#/tgdata/${routeNames[kind]}`);
    const root = page.locator('.responsive-data-list-viewport').first();
    const input = searchInput(root);
    await expect(rows(root)).toHaveCount(50);
    await root.locator('.ant-pagination-item-2').click();
    await expect.poll(() => latest(queries, kind)?.current).toBe(2);
    // A recorded request and updated paginator precede materialized response rows.
    await expect(rows(root).first()).toHaveAttribute(
      'data-row-key',
      new RegExp(datasetRow(kind, 50).id),
    );
    await settledPaint(page, root);
    const initialKeys = await rowKeys(root);
    const initialCount = queries.length;
    await input.fill('accepted semantic query');
    await aiOption(root).check();
    await aiOption(root).uncheck();
    await referenceOption(root).check();
    await aiOption(root).check();
    await expect(referenceOption(root)).not.toBeChecked();
    await expect(aiOption(root)).toBeChecked();
    await expectDraftOnly(page, root, queries, initialCount, initialKeys);
    await expect(root.locator('.ant-pagination-item-active')).toHaveText('2');

    // Enter publishes both controls and returns the real native table to page one.
    await input.press('Enter');
    await expectApplied(root, queries, kind, 'smart', 'accepted semantic query', 1);
    const hybrid = latest(queries, kind)!;
    expect(hybrid.rpc).toBe(`${kind}_hybrid_search`);
    if (kind === 'process' || kind === 'flow') {
      expect(hybrid.body).toMatchObject({ version_scope: 'matched', match_count: 200 });
    }
    const appliedKeys = await rowKeys(root);
    const beforeReferenceDraft = queries.length;
    await referenceOption(root).check();
    await input.fill('unsubmitted reference draft');
    await expectDraftOnly(page, root, queries, beforeReferenceDraft, appliedKeys);

    // Native allowClear is an edit action even though Input.Search emits onSearch.
    await root.locator('.ant-input-clear-icon').click();
    await expect(input).toHaveValue('');
    await expectDraftOnly(page, root, queries, beforeReferenceDraft, appliedKeys);
    await root.locator('.ant-input-search-btn').click();
    await expect(
      page.getByText(message('pages.datasetUuidMention.invalidUuid'), { exact: true }),
    ).toBeVisible();
    await expectDraftOnly(page, root, queries, beforeReferenceDraft, appliedKeys);
    await root.locator('.ant-pagination-item-2').click();
    await expectApplied(root, queries, kind, 'smart', 'accepted semantic query', 2);

    const uuid = datasetRow(kind, 0).id;
    await input.fill(uuid.toUpperCase());
    await root.locator('.ant-input-search-btn').click();
    await expectApplied(root, queries, kind, 'reference', uuid, 1);
    await root.locator('.ant-pagination-item-2').click();
    await expectApplied(root, queries, kind, 'reference', uuid, 2);
    const referenceKeys = await rowKeys(root);
    const beforeInvalid = queries.length;
    await input.fill('incomplete-uuid');
    await input.press('Enter');
    await expect(
      page.getByText(message('pages.datasetUuidMention.invalidUuid'), { exact: true }).last(),
    ).toBeVisible();
    await expectDraftOnly(page, root, queries, beforeInvalid, referenceKeys);
    await expect(root.locator('.ant-pagination-item-active')).toHaveText('2');
    await root.locator('.ant-pagination-item-3').click();
    await expectApplied(root, queries, kind, 'reference', uuid, 3);

    await referenceOption(root).uncheck();
    await input.fill('accepted lexical query');
    await root.locator('.ant-input-search-btn').click();
    await expectApplied(root, queries, kind, 'lexical', 'accepted lexical query', 1);
    const beforeSmartDraft = queries.length;
    const lexicalKeys = await rowKeys(root);
    await aiOption(root).check();
    await input.fill('unsubmitted semantic query');
    await expectDraftOnly(page, root, queries, beforeSmartDraft, lexicalKeys);
    await root.locator('.ant-pagination-item-2').click();
    await expectApplied(root, queries, kind, 'lexical', 'accepted lexical query', 2);
    await root.locator('.ant-input-search-btn').click();
    await expectApplied(root, queries, kind, 'smart', 'unsubmitted semantic query', 1);
    const beforeRepeat = queries.length;
    await root.locator('.ant-input-search-btn').click();
    await expect.poll(() => queries.length).toBeGreaterThan(beforeRepeat);
    await expectApplied(root, queries, kind, 'smart', 'unsubmitted semantic query', 1);

    // Clearing then explicitly submitting empty Smart mode restores the list.
    const beforeClear = queries.length;
    const finalKeys = await rowKeys(root);
    await root.locator('.ant-input-clear-icon').click();
    await expectDraftOnly(page, root, queries, beforeClear, finalKeys);
    await root.locator('.ant-input-search-btn').click();
    await expect
      .poll(() => latest(queries, kind))
      .toMatchObject({ mode: 'list', keyword: '', current: 1 });
    await expect(rows(root)).toHaveCount(50);
    await expect(rows(root).first()).not.toContainText('smart:');
    await expect(aiOption(root)).toBeChecked();
  });
}

test('nested Flow picker retains submitted search and independent tab modes', async ({ page }) => {
  const queries = await installDatasetListFixture(page, { labelSearchResults: true });
  await signInViaUi(page);
  await selectAppLocaleThroughUi(page, locale);
  await page.setViewportSize({ width: 1440, height: 900 });
  const process = datasetRow('process', 0);
  await page.goto(`/#/mydata/processes?id=${process.id}&version=${process.version}`);
  const processDrawer = page.getByRole('dialog', {
    name: message('pages.process.drawer.title.edit'),
    exact: true,
  });
  await expect(processDrawer).toBeVisible();
  await processDrawer
    .getByRole('tab', { name: message('pages.process.view.exchanges'), exact: true })
    .click();
  await processDrawer
    .locator('.process-exchange-table')
    .first()
    .getByRole('button', { name: message('pages.button.create'), exact: true })
    .click();
  const exchangeDrawer = page.getByRole('dialog', {
    name: message('pages.process.exchange.drawer.title.create'),
    exact: true,
  });
  await exchangeDrawer
    .getByRole('button', { name: message('pages.button.select'), exact: true })
    .first()
    .click();
  const flowDrawer = page.getByRole('dialog', {
    name: message('pages.flow.drawer.title.select'),
    exact: true,
  });
  const root = flowDrawer.locator('.tg-dataset-selector-table:visible');
  await expect(rows(root)).toHaveCount(50);
  await searchInput(root).fill('picker lexical');
  await searchInput(root).press('Enter');
  await expectApplied(root, queries, 'flow', 'lexical', 'picker lexical', 1);
  await root.getByRole('radio').first().check();
  const beforeDraft = queries.length;
  const appliedKeys = await rowKeys(root);
  await aiOption(root).check();
  await searchInput(root).fill('picker semantic');
  await expectDraftOnly(page, root, queries, beforeDraft, appliedKeys);
  await expect(root.getByRole('radio').first()).toBeChecked();
  await root.locator('.ant-pagination-item-2').click();
  await expectApplied(root, queries, 'flow', 'lexical', 'picker lexical', 2);
  await root.locator('.ant-input-search-btn').click();
  await expectApplied(root, queries, 'flow', 'smart', 'picker semantic', 1);
  await expect(root.getByRole('radio').first()).not.toBeChecked();

  await flowDrawer.getByRole('tab', { name: message('pages.tab.title.co'), exact: true }).click();
  await expect(rows(root)).toHaveCount(50);
  await expect(aiOption(root)).not.toBeChecked();
  await searchInput(root).fill('business lexical');
  await searchInput(root).press('Enter');
  await expectApplied(root, queries, 'flow', 'lexical', 'business lexical', 1);
  expect(latest(queries, 'flow')!.body.data_source).toBe('co');
  await flowDrawer
    .getByRole('tab', { name: message('pages.tab.title.tgdata'), exact: true })
    .click();
  await expect(aiOption(root)).toBeChecked();
  await expect(searchInput(root)).toHaveValue('picker semantic');
  await root.locator('.ant-pagination-item-2').click();
  await expectApplied(root, queries, 'flow', 'smart', 'picker semantic', 2);
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.screenshot({
      path: testInfo.outputPath('search-submission-failure.png'),
      fullPage: false,
    });
  }
});
