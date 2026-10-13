import { test, expect, type Locator } from '../i18n/fixtures';
import { signInViaUi } from '../i18n/auth';
import { selectAppLocaleThroughUi, getLocaleMessage } from '../i18n/contracts';
import { installDatasetListFixture, kinds, routeNames, datasetRow } from './fixture';

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

test.use({ semanticPersona: 'data_product_manager' });
test.skip(
  process.env.E2E_QUALIFICATION !== 'true',
  'Synthetic layout proof requires qualification backend.',
);

test('all seven catalog tables fill the viewport and retain controls across screen sizes', async ({
  page,
}, testInfo) => {
  await installDatasetListFixture(page);
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
      await assertToolbarContained(root);
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
  await choice.click();
  await expect
    .poll(() => queries[queries.length - 1]?.body.p_filter_condition?.classification?.length)
    .toBe(1);
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
      await page.keyboard.press('Escape');
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

test('analysis candidate tables retain common metadata and toolbar controls on narrow screens', async ({
  page,
}, testInfo) => {
  await installDatasetListFixture(page);
  await signInViaUi(page);
  await selectAppLocaleThroughUi(page, 'zh-CN');
  await page.goto('/#/mydata/processes/analysis');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page
      .getByRole('tab', {
        name: getLocaleMessage('zh-CN', 'pages.process.lca.page.tab.compare'),
        exact: true,
      })
      .click();
    const table = page
      .getByRole('tabpanel')
      .filter({ visible: true })
      .locator('.ant-table-wrapper')
      .first();
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
    await expect(
      table.getByRole('combobox', {
        name: getLocaleMessage('zh-CN', 'pages.table.title.classification'),
      }),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBe(true);
    await table.locator('.ant-table-title').scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await page.screenshot({ path: testInfo.outputPath(`analysis-candidates-${width}.png`) });
  }
});
