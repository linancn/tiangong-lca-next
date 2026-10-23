import { writeFile } from 'node:fs/promises';
import { test, expect, type Locator, type Page } from '../i18n/fixtures';
import { signInViaUi } from '../i18n/auth';
import { APP_LOCALES, getLocaleMessage, selectAppLocaleThroughUi } from '../i18n/contracts';
import { installDatasetListFixture } from './fixture';

test.use({ semanticPersona: 'data_product_manager' });
test.skip(
  process.env.E2E_QUALIFICATION !== 'true',
  'Sidebar layout proof requires the isolated qualification backend.',
);

async function bounds(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

async function assertNoDocumentOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(1);
}

for (const locale of APP_LOCALES) {
  test(`native sidebar collapse reclaims table space and restores it in ${locale}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await installDatasetListFixture(page);
    await signInViaUi(page);
    await selectAppLocaleThroughUi(page, locale);
    await page.goto('/#/tgdata/processes');

    const tableViewport = page.locator('.responsive-data-list-viewport').first();
    const tableBody = tableViewport.locator('.ant-table-body');
    const trigger = page.getByRole('button', {
      name: getLocaleMessage(locale, 'app.setting.navigationmode'),
      exact: true,
    });
    const sidebar = page.locator('aside').filter({ has: trigger });
    await expect(tableViewport.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
    await expect(trigger).toBeVisible();
    await expect(trigger.locator('svg')).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const measurements = [];

    for (const width of [1920, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      const expandedSidebar = await bounds(sidebar);
      const expandedTable = await bounds(tableViewport);
      const expandedBody = await bounds(tableBody);
      const triggerBounds = await bounds(trigger);
      expect(triggerBounds.width).toBeGreaterThanOrEqual(20);
      expect(triggerBounds.height).toBeGreaterThanOrEqual(20);
      await assertNoDocumentOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`${locale}-${width}-expanded.png`),
        fullPage: false,
      });

      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger.locator('svg')).toBeVisible();
      const collapsedSidebarWidth = await sidebar.evaluate((element) =>
        Number.parseFloat((element as HTMLElement).style.width),
      );
      const releasedWidth = expandedSidebar.width - collapsedSidebarWidth;
      expect(collapsedSidebarWidth).toBeGreaterThan(0);
      expect(releasedWidth).toBeGreaterThan(100);
      await expect
        .poll(async () => Math.abs((await bounds(sidebar)).width - collapsedSidebarWidth))
        .toBeLessThanOrEqual(0.1);
      await expect
        .poll(async () =>
          Math.abs((await bounds(tableViewport)).width - expandedTable.width - releasedWidth),
        )
        .toBeLessThanOrEqual(0.1);
      await expect
        .poll(async () =>
          Math.abs((await bounds(tableBody)).width - expandedBody.width - releasedWidth),
        )
        .toBeLessThanOrEqual(0.1);
      const collapsedTable = await bounds(tableViewport);
      measurements.push({
        viewportWidth: width,
        sidebarExpanded: expandedSidebar.width,
        sidebarCollapsed: (await bounds(sidebar)).width,
        tableExpanded: expandedTable.width,
        tableCollapsed: collapsedTable.width,
        tableBodyExpanded: expandedBody.width,
        tableBodyCollapsed: (await bounds(tableBody)).width,
      });
      expect(collapsedTable.width - expandedTable.width).toBeGreaterThan(100);
      expect(expandedTable.x - collapsedTable.x).toBeGreaterThan(100);
      expect(
        Math.abs(collapsedTable.x + collapsedTable.width - expandedTable.x - expandedTable.width),
      ).toBeLessThanOrEqual(2);
      await assertNoDocumentOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`${locale}-${width}-collapsed.png`),
        fullPage: false,
      });

      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect
        .poll(async () => Math.abs((await bounds(sidebar)).width - expandedSidebar.width))
        .toBeLessThanOrEqual(0.1);
      await expect
        .poll(async () => Math.abs((await bounds(tableViewport)).width - expandedTable.width))
        .toBeLessThanOrEqual(0.1);

      await trigger.focus();
      await expect(trigger).toBeFocused();
      await trigger.press('Enter');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger).toBeFocused();
      await trigger.press('Space');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(trigger).toBeFocused();
      await expect
        .poll(async () => Math.abs((await bounds(tableViewport)).width - expandedTable.width))
        .toBeLessThanOrEqual(0.1);
      await expect(tableViewport.locator('.ant-pagination')).toBeVisible();
      await assertNoDocumentOverflow(page);
    }

    await writeFile(
      testInfo.outputPath('geometry.json'),
      JSON.stringify({ locale, measurements }, null, 2),
    );

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileTrigger = page.locator('.tg-pro-layout-mobile-menu-action');
    await expect(mobileTrigger).toBeVisible();
    await mobileTrigger.click();
    const mobileDrawer = page.getByRole('dialog');
    await expect(mobileDrawer).toBeVisible();
    const processLink = mobileDrawer.getByRole('link', {
      name: getLocaleMessage(locale, 'menu.tgdata.processes'),
    });
    await expect(processLink).toBeVisible();
    await expect(processLink).toHaveAttribute('href', '#/tgdata/processes');
    await page.keyboard.press('Escape');
    await expect(mobileDrawer).not.toBeVisible();
    await expect(mobileTrigger).toBeVisible();
    await assertNoDocumentOverflow(page);
  });
}
