import { test, expect } from '../i18n/fixtures';
import { signInViaUi } from '../i18n/auth';
import { getLocaleMessage, selectAppLocaleThroughUi } from '../i18n/contracts';
import { resolveBrandProfile } from '../../../config/brandProfile';

const brand = process.env.E2E_BRAND;
const atlas = brand === 'atlas';
const profile = resolveBrandProfile(brand);

test.skip(
  !brand || process.env.E2E_QUALIFICATION !== 'true',
  'Brand proof requires an explicitly selected brand and the isolated semantic backend.',
);

test('brand login keeps localized identity, theme and mobile controls usable', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/user/login');
  await expect(page.getByTestId('docs-capture-login-submit')).toBeVisible();
  if (atlas) await expect(page.locator('.atlas-introduction')).toBeVisible();
  else await expect(page.locator('.atlas-introduction')).toHaveCount(0);
  for (const locale of ['en-US', 'zh-CN', 'de-DE', 'fr-FR'] as const) {
    await selectAppLocaleThroughUi(page, locale);
    await expect(page).toHaveTitle(new RegExp(profile.title[locale]));
    if (atlas) await expect(page.locator('.atlas-introduction')).not.toContainText(/TianGong|天工/);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('login-dark-mode')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.getByTestId('login-dark-mode').getByRole('button').click();
    await expect(page.getByTestId('docs-capture-login-submit')).toBeVisible();
    await page.getByTestId('login-dark-mode').getByRole('button').click();
    await page.screenshot({
      path: testInfo.outputPath(`${brand}-${locale}-mobile.png`),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 960 });
  }
  await selectAppLocaleThroughUi(page, 'zh-CN');
  await page.screenshot({ path: testInfo.outputPath(`${brand}-login.png`), fullPage: true });
  expect(errors).toEqual([]);
});

test('brand workspace preserves navigation and shared dataset surfaces', async ({
  page,
}, testInfo) => {
  await signInViaUi(page);
  if (atlas) {
    await expect(page.locator('.atlas-workspace')).toBeVisible();
    await expect(page.locator('.atlas-workspace-action')).toHaveCount(3);
    await expect(page.locator('.ant-layout-sider')).toHaveCSS('background-color', 'rgb(6, 22, 42)');
  } else await expect(page.locator('.atlas-workspace')).toHaveCount(0);
  await expect(page.getByText('Login successful!', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath(`${brand}-workspace.png`), fullPage: true });
  if (atlas) {
    const darkToggle = page.getByRole('button', {
      name: getLocaleMessage('en-US', 'pages.theme.toggleDarkMode'),
      exact: true,
    });
    await darkToggle.click();
    await expect(page.locator('.atlas-workspace-action').first()).toHaveCSS(
      'background-color',
      'rgb(16, 35, 55)',
    );
    await page.screenshot({
      path: testInfo.outputPath(`${brand}-workspace-dark.png`),
      fullPage: true,
    });
    await darkToggle.click();
    await expect(page.locator('.atlas-workspace-action').first()).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    await page.mouse.move(0, 0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`${brand}-workspace-mobile.png`),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 960 });
  }
  if (atlas)
    await page
      .locator(
        '.atlas-workspace-action[href="/mydata/processes"], .atlas-workspace-action[href="#/mydata/processes"]',
      )
      .click();
  else await page.goto('/#/mydata/processes');
  await expect(page.locator('.ant-table').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`${brand}-table.png`), fullPage: true });
  await page.goto('/#/welcome');
  if (atlas) {
    await page.locator('button.atlas-workspace-action').click();
    await expect(page.locator('.atlas-workspace')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`${brand}-guide.png`), fullPage: true });
  }
});
