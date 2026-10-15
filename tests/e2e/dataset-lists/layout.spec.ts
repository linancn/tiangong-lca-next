import { test, expect, type Locator } from '../i18n/fixtures';
import { signInViaUi } from '../i18n/auth';
import { selectAppLocaleThroughUi, getLocaleMessage } from '../i18n/contracts';
import {
  installDatasetListFixture,
  kinds,
  routeNames,
  datasetRow,
  LONG_PROCESS_NAME,
} from './fixture';

async function assertToolbarContained(root: Locator) {
  await expect
    .poll(async () =>
      root.evaluate((element) => {
        const container = element.getBoundingClientRect();
        return Array.from(
          element.querySelectorAll<HTMLElement>(
            '.responsive-data-list-toolbar .ant-select, .responsive-data-list-toolbar button',
          ),
        )
          .filter(
            (node) =>
              node.getBoundingClientRect().width > 0 &&
              getComputedStyle(node).visibility !== 'hidden',
          )
          .every((node) => {
            const bounds = node.getBoundingClientRect();
            return bounds.left >= container.left - 1 && bounds.right <= container.right + 1;
          });
      }),
    )
    .toBe(true);
}

async function assertToolbarSingleRow(
  root: Locator,
  toolbarSelector = '.responsive-data-list-toolbar',
) {
  await expect
    .poll(() =>
      root.locator(toolbarSelector).evaluate((toolbar) => {
        const centers = Array.from(
          toolbar.querySelectorAll<HTMLElement>(
            '.ant-input-search, .ant-checkbox-wrapper, .ant-select, .ant-btn, .ant-pro-table-list-toolbar-setting-item',
          ),
        )
          .map((element) => element.getBoundingClientRect())
          .filter((bounds) => bounds.width > 0 && bounds.height > 0)
          .map((bounds) => bounds.y + bounds.height / 2);
        return centers.length >= 2
          ? Math.max(...centers) - Math.min(...centers)
          : Number.POSITIVE_INFINITY;
      }),
    )
    .toBeLessThanOrEqual(6);
}

test.use({ semanticPersona: 'data_product_manager' });
test.skip(
  process.env.E2E_QUALIFICATION !== 'true',
  'Synthetic layout proof requires qualification backend.',
);

test('all seven catalog tables fill the viewport and retain controls across screen sizes', async ({
  page,
}, testInfo) => {
  const queries = await installDatasetListFixture(page);
  await signInViaUi(page);
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await selectAppLocaleThroughUi(page, 'zh-CN');
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const kind of kinds) {
      await page.goto(`/#/tgdata/${routeNames[kind]}`);
      const root = page.locator('.responsive-data-list-viewport').first();
      await expect(root.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
      await expect(root.locator('.ant-pagination')).toBeVisible();
      await expect(root.locator('.ant-input-search')).toBeVisible();
      await expect(root.locator('.tg-open-data-catalog-source-filter')).toHaveCount(0);
      await expect(
        root.getByRole('button', { name: /^(全部数据|文献数据|企业数据|商业数据)$/ }),
      ).toHaveCount(0);
      const catalogQuery = queries.findLast((query) => query.kind === kind);
      expect(catalogQuery?.rpc).toBe('search_open_data_catalog');
      expect(catalogQuery?.body).toMatchObject({
        p_source_filter: 'all',
        p_publication_filter: 'all',
      });
      await assertToolbarContained(root);
      if (size.width >= 1366) {
        await assertToolbarSingleRow(root);
      }
      await expect(page.locator('.ant-pro-global-footer')).toHaveCount(0);
      await expect(root.locator('.responsive-data-list-toolbar')).not.toContainText('开放数据 /');
      const headers = await root.locator('.ant-table-header th').allTextContents();
      expect(headers.slice(0, 6)).toEqual([
        '序号',
        '名称',
        '地理位置',
        '参考年份',
        '数据集类型',
        '版本',
      ]);
      expect(headers).not.toContain('分类');
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
        .toBe(true);
      const searchBounds = await root.locator('.ant-input-search-btn').boundingBox();
      const cardBounds = await root.boundingBox();
      expect(searchBounds!.x + searchBounds!.width).toBeLessThanOrEqual(
        cardBounds!.x + cardBounds!.width,
      );
      const bounds = await root.locator('.ant-pagination').boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(size.height + 1);
      const body = root.locator('.ant-table-body');
      expect(await body.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
        true,
      );
      await body.evaluate((element) => {
        element.scrollTop = 300;
      });
      await expect(root.locator('.ant-table-header')).toBeVisible();
      await body.evaluate((element) => {
        element.scrollTop = 0;
      });
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: testInfo.outputPath(`${kind}-${size.width}.png`),
        fullPage: true,
      });
    }
  }
});

test('desktop toolbar stays in one row and brand links move to the global help menu', async ({
  page,
}, testInfo) => {
  await installDatasetListFixture(page);
  await signInViaUi(page);
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await selectAppLocaleThroughUi(page, 'zh-CN');
  await page.setViewportSize({ width: 2319, height: 1079 });
  await page.goto('/#/tgdata/processes');
  const root = page.locator('.responsive-data-list-viewport').first();
  await expect(root.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
  await assertToolbarSingleRow(root);
  await expect(page.locator('.ant-pro-global-footer')).toHaveCount(0);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: testInfo.outputPath('process-wide-compact.png'), fullPage: true });

  await page
    .getByRole('button', {
      name: getLocaleMessage('zh-CN', 'pages.theme.toggleDarkMode'),
      exact: true,
    })
    .click();
  await expect
    .poll(() =>
      root.locator('.responsive-data-list-card').evaluate((card) => {
        const background = getComputedStyle(card).backgroundColor.match(/\d+/g)?.slice(0, 3);
        return Boolean(background && background.every((channel) => Number(channel) < 80));
      }),
    )
    .toBe(true);
  await assertToolbarSingleRow(root);
  await page.mouse.move(0, 0);
  await expect(page.locator('.ant-tooltip:visible')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('process-wide-dark.png'), fullPage: true });

  const help = page.getByRole('button', { name: '帮助与关于', exact: true });
  await help.focus();
  await page.keyboard.press('Enter');
  await expect(help).toHaveAttribute('aria-expanded', 'true');
  const helpMenu = page.getByRole('menu', { name: '帮助与关于', exact: true });
  await expect(helpMenu).toBeVisible();
  await expect(page.getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute(
    'href',
    'https://github.com/tiangong-lca/platform',
  );
  await expect(page.getByRole('link', { name: '使用文档', exact: true })).toHaveAttribute(
    'href',
    'https://docs.tiangong.earth',
  );
  await expect(page.getByText('© TianGong LCA', { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      helpMenu.evaluate((menu) => {
        const popup = menu.closest('.ant-dropdown');
        return Boolean(
          popup &&
          Number(getComputedStyle(popup).opacity) === 1 &&
          popup
            .getAnimations({ subtree: true })
            .every((animation) => animation.playState !== 'running'),
        );
      }),
    )
    .toBe(true);
  await page.screenshot({ path: testInfo.outputPath('global-help-and-about.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(helpMenu).not.toBeVisible();
  await expect(help).toHaveAttribute('aria-expanded', 'false');
});

test('classification combines with paging, full text and reference lookup on the server contract', async ({
  page,
}, testInfo) => {
  const queries = await installDatasetListFixture(page);
  await signInViaUi(page);
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await selectAppLocaleThroughUi(page, 'zh-CN');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/mydata/processes');
  const root = page.locator('.responsive-data-list-viewport').first();
  await expect(root.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
  await root
    .getByRole('combobox', { name: getLocaleMessage('zh-CN', 'pages.table.title.classification') })
    .click();
  const choice = page.locator('.ant-cascader-menu-item').filter({ hasText: '制造业' }).first();
  await expect(choice).toBeVisible();
  const beforeDraft = queries.length;
  await choice.click();
  const classificationPopup = page.locator('.ant-cascader-dropdown:visible');
  await expect(classificationPopup).toBeVisible();
  expect(queries).toHaveLength(beforeDraft);
  await classificationPopup.getByRole('button', { name: '取消', exact: true }).click();
  await expect(classificationPopup).not.toBeVisible();
  expect(queries).toHaveLength(beforeDraft);
  await root
    .getByRole('combobox', { name: getLocaleMessage('zh-CN', 'pages.table.title.classification') })
    .click();
  await choice.click();
  await classificationPopup.getByRole('button', { name: '确认', exact: true }).click();
  await expect
    .poll(() => queries[queries.length - 1]?.body.p_filter_condition?.classification?.length)
    .toBe(1);
  expect(queries).toHaveLength(beforeDraft + 1);
  await page.keyboard.press('Escape');
  await root.locator('.ant-pagination-item-2').click();
  await expect.poll(() => queries[queries.length - 1]?.body.p_page_current).toBe(2);
  await expect(root.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(26);
  await expect(
    root.locator('.ant-table-tbody > tr[data-row-key]').first().locator('td').first(),
  ).toHaveText('51');
  const search = root.locator('input[type="search"]');
  await search.fill('水泥');
  await search.press('Enter');
  await expect.poll(() => queries[queries.length - 1]?.rpc).toBe('search_processes');
  expect(queries[queries.length - 1]?.body.filter_condition.classification).toHaveLength(1);
  expect(queries[queries.length - 1]?.body.page_current).toBe(1);
  await expect(
    root.locator('.ant-table-tbody > tr[data-row-key]').first().locator('td').first(),
  ).toHaveText('1');
  await root
    .getByRole('checkbox', { name: getLocaleMessage('zh-CN', 'pages.search.referenceLookup') })
    .check();
  await search.fill('12130000-0000-4000-8000-000000000001');
  await search.press('Enter');
  await expect
    .poll(() => queries[queries.length - 1]?.rpc)
    .toBe('search_dataset_uuid_mentions_page');
  expect(queries[queries.length - 1]?.body.p_filter_condition.classification).toHaveLength(1);
  await expect(
    root.locator('.ant-table-tbody > tr[data-row-key]').first().locator('td').first(),
  ).toHaveText('1');
  await page.screenshot({
    path: testInfo.outputPath('process-classification-reference.png'),
    fullPage: true,
  });
});

test('mixed display pages share the layout and preserve dataset-kind filtering', async ({
  page,
}, testInfo) => {
  const queries = await installDatasetListFixture(page);
  await signInViaUi(page);
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await selectAppLocaleThroughUi(page, 'zh-CN');
  for (const route of ['/dataset-display-settings', '/displayed-datasets']) {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/#${route}`);
      const root = page.locator('.responsive-data-list-viewport').first();
      await expect(root.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
      const headers = await root.locator('.ant-table-header th').allTextContents();
      const start = headers.indexOf('序号');
      expect(headers.slice(start, start + 6)).toEqual([
        '序号',
        '名称',
        '地理位置',
        '参考年份',
        '数据集类型',
        '版本',
      ]);
      await root
        .getByRole('combobox', {
          name: getLocaleMessage('zh-CN', 'pages.table.filter.all.datasetType'),
        })
        .click();
      await page
        .locator('.ant-select-dropdown:visible .ant-select-item-option')
        .filter({ hasText: '过程' })
        .click();
      await expect.poll(() => queries[queries.length - 1]?.body.p_dataset_kind).toBe('process');
      await expect(
        root.getByRole('combobox', {
          name: getLocaleMessage('zh-CN', 'pages.table.title.classification'),
        }),
      ).toBeVisible();
      const search = root.locator('.ant-input-search input');
      await search.fill('069');
      await search.press('Enter');
      await expect.poll(() => queries[queries.length - 1]?.body.p_query).toBe('069');
      await root
        .getByRole('combobox', {
          name: getLocaleMessage('zh-CN', 'pages.table.title.classification'),
        })
        .click();
      const popup = page.locator('.ant-cascader-dropdown:visible');
      await expect(popup).toBeVisible();
      await expect
        .poll(async () => {
          const bounds = await popup.boundingBox();
          return Boolean(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width);
        })
        .toBe(true);
      await popup.locator('.ant-cascader-menu-item').filter({ hasText: '制造业' }).first().click();
      await popup.getByRole('button', { name: '确认', exact: true }).click();
      await expect
        .poll(() => queries[queries.length - 1]?.body.p_filter_condition?.classification?.length)
        .toBe(1);
      expect(queries[queries.length - 1]?.body.p_query).toBe('069');
      await page.keyboard.press('Escape');
      await search.fill('');
      await search.press('Enter');
      await expect.poll(() => queries[queries.length - 1]?.body.p_query).toBe('');

      await page.keyboard.press('Escape');
      await assertToolbarContained(root);
      await page.mouse.move(0, 0);
      await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
      await page.screenshot({
        path: testInfo.outputPath(`${route.slice(1)}-${width}.png`),
        fullPage: true,
      });
    }
  }
});

test('version drawer and table fullscreen recalculate their own scroll boundary', async ({
  page,
}, testInfo) => {
  await installDatasetListFixture(page);
  await signInViaUi(page);
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await selectAppLocaleThroughUi(page, 'zh-CN');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/tgdata/processes');
  const root = page.locator('.responsive-data-list-viewport').first();
  await expect(root.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
  await root
    .locator('.ant-table-tbody > tr[data-row-key]')
    .first()
    .getByRole('button', { name: 'bars' })
    .click();
  const drawer = page.locator('.ant-drawer:visible').last();
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
  await expect(drawer.locator('.ant-pagination')).toContainText('137');
  const pagination = await drawer.locator('.ant-pagination').boundingBox();
  expect(pagination!.y + pagination!.height).toBeLessThanOrEqual(900);
  await page.screenshot({ path: testInfo.outputPath('process-all-versions.png'), fullPage: true });
  await drawer.getByRole('button', { name: 'Close' }).click();
  await page.mouse.move(0, 0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.ant-dropdown:visible')).toHaveCount(0);
  await root.getByRole('img', { name: 'fullscreen' }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await expect
    .poll(async () => {
      const rect = await root.locator('.ant-pagination').boundingBox();
      return rect!.y + rect!.height <= 900;
    })
    .toBe(true);
  await page.screenshot({ path: testInfo.outputPath('process-fullscreen.png'), fullPage: true });
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await page.setViewportSize({ width: 1152, height: 720 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1152,
    height: 720,
    deviceScaleFactor: 1.25,
    mobile: false,
  });
  await expect.poll(() => page.evaluate(() => innerHeight)).toBe(720);
  await assertToolbarContained(root);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    .toBe(true);
  await expect
    .poll(async () => {
      const rect = await root.locator('.ant-pagination').boundingBox();
      return rect!.y + rect!.height <= 720 && rect!.x >= 0 && rect!.x + rect!.width <= 1152;
    })
    .toBe(true);
  await page.screenshot({ path: testInfo.outputPath('process-zoom-125.png'), fullPage: true });
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus)
    await page.screenshot({ path: testInfo.outputPath('failure.png'), fullPage: true });
});

test('nested Flow selectors retain real metadata and usable controls in every source tab', async ({
  page,
}, testInfo) => {
  await installDatasetListFixture(page);
  await signInViaUi(page);
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await selectAppLocaleThroughUi(page, 'zh-CN');
  await page.setViewportSize({ width: 1440, height: 900 });
  const process = datasetRow('process', 0);
  await page.goto(`/#/mydata/processes?id=${process.id}&version=${process.version}`);
  const processDrawer = page.getByRole('dialog', {
    name: getLocaleMessage('zh-CN', 'pages.process.drawer.title.edit'),
    exact: true,
  });
  await expect(processDrawer).toBeVisible();
  await processDrawer
    .getByRole('tab', {
      name: getLocaleMessage('zh-CN', 'pages.process.view.exchanges'),
      exact: true,
    })
    .click();
  await processDrawer
    .locator('.process-exchange-table')
    .first()
    .getByRole('button', { name: getLocaleMessage('zh-CN', 'pages.button.create'), exact: true })
    .click();
  const exchangeDrawer = page.getByRole('dialog', {
    name: getLocaleMessage('zh-CN', 'pages.process.exchange.drawer.title.create'),
    exact: true,
  });
  await expect(exchangeDrawer).toBeVisible();
  await exchangeDrawer
    .getByRole('button', { name: getLocaleMessage('zh-CN', 'pages.button.select'), exact: true })
    .first()
    .click();
  const flowDrawer = page.getByRole('dialog', {
    name: getLocaleMessage('zh-CN', 'pages.flow.drawer.title.select'),
    exact: true,
  });
  await expect(flowDrawer).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const tabs = flowDrawer.getByRole('tab');
    for (let index = 0; index < (await tabs.count()); index++) {
      const tab = tabs.nth(index);
      const tabBounds = await tab.boundingBox();
      const stripBounds = await flowDrawer.locator('.ant-tabs-nav-wrap').boundingBox();
      if (
        tabBounds!.x < stripBounds!.x ||
        tabBounds!.x + tabBounds!.width > stripBounds!.x + stripBounds!.width
      ) {
        const label = await tab.innerText();
        await flowDrawer.locator('.ant-tabs-nav-more').hover();
        await page.getByRole('option', { name: label, exact: true }).click();
      } else {
        await tab.click();
      }
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      const table = flowDrawer.locator('.tg-dataset-selector-table:visible');
      await expect(table.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
      await expect(table.locator('.ant-table-tbody > tr[data-row-key]').first()).toContainText(
        '全球',
      );
      await assertToolbarContained(table);
      const pagination = await table.locator('.ant-pagination').boundingBox();
      const footer = await flowDrawer.locator('.ant-drawer-footer').boundingBox();
      expect(pagination!.y + pagination!.height).toBeLessThanOrEqual(footer!.y);
      await page.mouse.move(0, 0);
      await expect(page.locator('.ant-tabs-dropdown:visible')).toHaveCount(0);
      await page.screenshot({
        path: testInfo.outputPath(`flow-selector-tab${index}-${width}.png`),
        fullPage: true,
      });
    }
  }
});

test('model results keep the primary row and paginate the complete subproduct collection', async ({
  page,
}, testInfo) => {
  await installDatasetListFixture(page);
  await signInViaUi(page);
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await selectAppLocaleThroughUi(page, 'zh-CN');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/tgdata/models');
  const root = page.locator('.responsive-data-list-viewport').first();
  await expect(root.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
  await root
    .locator('.ant-table-tbody > tr[data-row-key]')
    .first()
    .getByRole('button', { name: 'profile' })
    .click();
  const modelView = page.locator('.ant-drawer:visible').last();
  await expect(modelView).toBeVisible();
  await modelView.getByRole('button', { name: 'product' }).click();
  const result = page.getByRole('dialog', {
    name: getLocaleMessage('zh-CN', 'pages.button.model.result'),
    exact: true,
  });
  const tables = result.locator('.responsive-data-list-table');
  await expect(tables).toHaveCount(2);
  await expect(tables.first().locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(1);
  await expect(tables.last().locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
  await tables.last().locator('.ant-pagination-item-2').click();
  await expect(tables.last().locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(20);
  const search = tables.last().locator('input[type="search"]');
  await search.fill('069');
  await search.press('Enter');
  await expect(tables.last().locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(1);
  await expect(tables.last()).toContainText('069');
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: testInfo.outputPath('model-results-filtered.png'),
    fullPage: true,
  });
});

test('native toolbar remains contained with long locale labels and the dark theme', async ({
  page,
}, testInfo) => {
  await installDatasetListFixture(page);
  await signInViaUi(page);
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/#/mydata/processes');
  for (const locale of ['de-DE', 'fr-FR'] as const) {
    await selectAppLocaleThroughUi(page, locale);
    const root = page.locator('.responsive-data-list-viewport').first();
    await expect(root.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
    await assertToolbarContained(root);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: testInfo.outputPath(`process-${locale}.png`), fullPage: true });
  }
  await page
    .getByRole('button', {
      name: getLocaleMessage('fr-FR', 'pages.theme.toggleDarkMode'),
      exact: true,
    })
    .click();
  const root = page.locator('.responsive-data-list-viewport').first();
  await expect
    .poll(() =>
      root.locator('.responsive-data-list-card').evaluate((card) => {
        const background = getComputedStyle(card)
          .backgroundColor.match(/\d+/g)
          ?.slice(0, 3)
          .map(Number);
        return Boolean(background && background.every((channel) => channel < 80));
      }),
    )
    .toBe(true);
  await assertToolbarContained(root);
  await page.mouse.move(0, 0);
  await expect(page.locator('.ant-tooltip:visible')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('process-dark.png'), fullPage: true });
});

test('all analysis modes keep compact controls and metadata across desktop and narrow screens', async ({
  page,
}, testInfo) => {
  await installDatasetListFixture(page);
  await signInViaUi(page);
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await selectAppLocaleThroughUi(page, 'zh-CN');
  await page.goto('/#/mydata/processes/analysis');
  for (const mode of ['profile', 'compare', 'grouped', 'path'] as const) {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page
      .getByRole('tab', {
        name: getLocaleMessage('zh-CN', `pages.process.lca.page.tab.${mode}`),
        exact: true,
      })
      .click();
    for (const width of [1920, 1366, 390]) {
      await page.setViewportSize({ width, height: 1080 });
      const panel = page.getByRole('tabpanel').filter({ visible: true });
      const table = panel.locator('.ant-table-wrapper').first();
      const toolbarSelector =
        mode === 'profile' ? '.lca-analysis-input-toolbar' : '.lca-process-selection-toolbar';
      const root = mode === 'profile' ? page.locator('.ant-pro-page-container') : table;
      const toolbar = root.locator(toolbarSelector);
      if (mode !== 'profile') {
        await expect(table.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
        const headers = await table.locator('th').allTextContents();
        const start = headers.indexOf('序号');
        expect(headers.slice(start, start + 6)).toEqual([
          '序号',
          '名称',
          '地理位置',
          '参考年份',
          '数据集类型',
          '版本',
        ]);
      }
      await expect(
        toolbar.getByRole('combobox', {
          name: getLocaleMessage('zh-CN', 'pages.table.title.classification'),
        }),
      ).toBeVisible();
      if (width >= 1366) {
        await assertToolbarSingleRow(root, toolbarSelector);
      }
      await expect
        .poll(() =>
          toolbar.evaluate((element) => {
            const boundary = element.getBoundingClientRect();
            return Array.from(element.querySelectorAll('.ant-input-search, .ant-select')).every(
              (control) => {
                const bounds = control.getBoundingClientRect();
                return bounds.left >= boundary.left - 1 && bounds.right <= boundary.right + 1;
              },
            );
          }),
        )
        .toBe(true);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
        .toBe(true);
      await toolbar.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await page.screenshot({ path: testInfo.outputPath(`analysis-${mode}-${width}.png`) });
    }
  }
});

test('metadata stays compact while names and contextual search receive the extra screen width', async ({
  page,
}, testInfo) => {
  await installDatasetListFixture(page);
  await signInViaUi(page);
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  for (const locale of ['zh-CN', 'en-US', 'de-DE', 'fr-FR'] as const) {
    await selectAppLocaleThroughUi(page, locale);
    await page.goto('/#/tgdata/processes');
    const root = page.locator('.responsive-data-list-viewport').first();
    await expect(root.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
    const sizes: Array<{ name: number; search: number }> = [];
    for (const width of [1920, 2319]) {
      await page.setViewportSize({ width, height: 1080 });
      await assertToolbarSingleRow(root);
      await expect
        .poll(async () => {
          const cells = await root
            .locator('.ant-table-tbody > tr[data-row-key]')
            .first()
            .locator('td')
            .evaluateAll((elements) => elements.map((el) => el.getBoundingClientRect().width));
          return cells[2] <= 144 && cells[3] <= 112 && cells[5] <= 136 && cells[6] <= 168;
        })
        .toBe(true);
      const geometry = await root.evaluate((element) => {
        const cells = element
          .querySelector('.ant-table-tbody > tr[data-row-key]')!
          .querySelectorAll('td');
        const toolbar = element
          .querySelector('.ant-pro-table-list-toolbar-container')!
          .getBoundingClientRect();
        const search = element.querySelector('.ant-input-search')!.getBoundingClientRect();
        const controls = element
          .querySelector('.ant-pro-table-list-toolbar-right')!
          .getBoundingClientRect();
        const body = element.querySelector('.ant-table-body')!;
        const table = element.querySelector('.ant-table-body table')!.getBoundingClientRect();
        return {
          name: cells[1].getBoundingClientRect().width,
          search: search.width,
          unused: toolbar.width - search.width - controls.width,
          tableWidth: table.width,
          bodyWidth: body.clientWidth,
        };
      });
      expect(geometry.unused).toBeLessThanOrEqual(18);
      expect(Math.abs(geometry.tableWidth - geometry.bodyWidth)).toBeLessThanOrEqual(2);
      sizes.push(geometry);
    }
    expect(sizes[1].name - sizes[0].name).toBeCloseTo(399, 0);
    expect(sizes[1].search - sizes[0].search).toBeCloseTo(399, 0);
    const row = root.locator('.ant-table-tbody > tr[data-row-key]').first();
    await row.locator('td').nth(1).hover();
    await expect(page.getByRole('tooltip').filter({ hasText: LONG_PROCESS_NAME })).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page.locator('.ant-tooltip:visible')).toHaveCount(0);
    const datasetType = row.locator('td').nth(4);
    const localizedType = await datasetType.innerText();
    await datasetType.hover();
    await expect(page.getByRole('tooltip').filter({ hasText: localizedType.trim() })).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page.locator('.ant-tooltip:visible')).toHaveCount(0);
    const date = row.locator('td').nth(6);
    const formattedDate = await date.innerText();
    await date.hover();
    await expect(page.getByRole('tooltip').filter({ hasText: formattedDate.trim() })).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page.locator('.ant-tooltip:visible')).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath(`fluid-columns-search-${locale}.png`),
      fullPage: true,
    });
  }
});

test('classification confirmation stages a searched leaf and cancels the first outside click', async ({
  page,
}, testInfo) => {
  const queries = await installDatasetListFixture(page);
  await signInViaUi(page);
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await selectAppLocaleThroughUi(page, 'zh-CN');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/tgdata/processes');
  const root = page.locator('.responsive-data-list-viewport').first();
  await expect(root.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
  const selector = root.getByRole('combobox', { name: '分类', exact: true });
  const popup = page.locator('.ant-cascader-dropdown:visible');
  const before = queries.length;
  await selector.click();
  await selector.fill('水泥');
  await popup.locator('.ant-cascader-menu-item').filter({ hasText: '水泥' }).first().click();
  await expect(popup.getByRole('button', { name: '确认', exact: true })).toBeVisible();
  expect(queries).toHaveLength(before);
  await page.locator('.ant-pro-layout-content').click({ position: { x: 4, y: 4 } });
  await expect(popup).not.toBeVisible();
  expect(queries).toHaveLength(before);
  await selector.click();
  await selector.fill('水泥');
  await popup.locator('.ant-cascader-menu-item').filter({ hasText: '水泥' }).first().click();
  await expect(popup).toBeVisible();
  await expect
    .poll(async () => {
      const bounds = await popup.boundingBox();
      return !!bounds && bounds.x >= 0 && bounds.x + bounds.width <= 1440;
    })
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('classification-pending-confirmation.png'),
    // Chromium captureBeyondViewport can briefly emulate a 1px viewport and remount
    // native responsive toolbars. Capture the verified in-viewport popup without
    // mutating the interface whose pending confirmation is being exercised.
    fullPage: false,
  });
  await popup.getByRole('button', { name: '确认', exact: true }).click();
  await expect.poll(() => queries.length).toBe(before + 1);
  expect(
    queries[queries.length - 1]?.body.p_filter_condition.classification[0].path.length,
  ).toBeGreaterThanOrEqual(3);
  await selector.click();
  await popup.getByRole('button', { name: '清空', exact: true }).click();
  expect(queries).toHaveLength(before + 1);
  await popup.getByRole('button', { name: '确认', exact: true }).click();
  await expect.poll(() => queries.length).toBe(before + 2);
  expect(queries[queries.length - 1]?.body.p_filter_condition?.classification ?? []).toHaveLength(
    0,
  );
});
