import { writeFile } from 'node:fs/promises';
import { LOCALE_CAPABILITY_MATRIX } from '../../../src/services/general/localeCapabilities';
import { test, expect, type Locator, type Page } from '../i18n/fixtures';
import { signInViaUi } from '../i18n/auth';
import { APP_LOCALES, getLocaleMessage, selectAppLocaleThroughUi } from '../i18n/contracts';
import { loadReferenceFixture } from '../i18n/reference-fixture';
import { installDatasetListFixture } from './fixture';
import { assertReadableTooltip, captureReadableTooltip } from './tooltip-readability';

test.use({ semanticPersona: 'data_product_manager' });
test.skip(
  process.env.E2E_QUALIFICATION !== 'true',
  'Classification tooltip proof requires the isolated qualification backend.',
);

async function hoverLabel(page: Page, option: Locator) {
  // Enter the current label after search replaces the row under the pointer.
  // Firefox does not synthesize a new mouseenter for a stationary pointer.
  await page.mouse.move(0, 0);
  const label = option.locator('.ant-cascader-menu-item-content');
  // Search and responsive placement can move the popup after two stable frames.
  // Keep the pointer outside until the label has settled, then enter it once.
  await expect
    .poll(() =>
      label.evaluate(async (element) => {
        const bounds = JSON.stringify(element.getBoundingClientRect().toJSON());
        const started = performance.now();
        do {
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
          });
          if (
            !element.isConnected ||
            JSON.stringify(element.getBoundingClientRect().toJSON()) !== bounds
          )
            return false;
          for (let node: Element | null = element; node; node = node.parentElement) {
            if (
              node
                .getAnimations()
                .some((animation) => animation.pending || animation.playState === 'running')
            )
              return false;
          }
        } while (performance.now() - started < 250);
        return true;
      }),
    )
    .toBe(true);
  await label.hover();
}

const reference = loadReferenceFixture();
for (const locale of APP_LOCALES) {
  test(`classification full names remain readable on hover and focus in ${locale}`, async ({
    page,
  }, testInfo) => {
    const capability = LOCALE_CAPABILITY_MATRIX.find(({ appLocale }) => appLocale === locale);
    const language = capability?.contentLanguage;
    if (!language || !(language in reference.classification.labels)) {
      throw new Error(`Missing readable classification fixture for ${locale}.`);
    }
    const labels = reference.classification.labels[language];
    const fullPath = labels.join(' / ');
    const leaf = labels[labels.length - 1];
    const queries = await installDatasetListFixture(page);
    await page.setViewportSize({ width: 1366, height: 900 });
    await signInViaUi(page);
    await expect(page.locator('.ant-message-notice')).toHaveCount(0);
    await selectAppLocaleThroughUi(page, locale);
    await page.goto('/#/tgdata/processes');
    const root = page.locator('.responsive-data-list-viewport').first();
    await expect(root.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
    const selector = root.getByRole('combobox', {
      name: getLocaleMessage(locale, 'pages.table.title.classification'),
      exact: true,
    });
    const popup = page.locator('.ant-cascader-dropdown:visible');
    const before = queries.length;
    const geometry = [];

    await selector.click();
    const parent = popup.locator('.ant-cascader-menu-item').filter({ hasText: labels[0] }).first();
    await hoverLabel(page, parent);
    await assertReadableTooltip(page, labels[0]);
    expect(queries).toHaveLength(before);

    for (const width of [1366, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await selector.fill(leaf);
      const result = popup.locator('.ant-cascader-menu-item').filter({ hasText: leaf }).first();
      await expect(result).toHaveText(fullPath);
      await hoverLabel(page, result);
      const evidence = await captureReadableTooltip(page, fullPath);
      expect(queries).toHaveLength(before);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
        .toBe(true);
      geometry.push({
        width,
        fullPath,
        tooltip: evidence.observation,
        afterScreenshot: evidence.afterScreenshot,
      });
      await writeFile(
        testInfo.outputPath(`${locale}-${width}-classification-full-path.png`),
        evidence.screenshot,
      );
    }

    // Native keyboard selection must still stage, rather than apply, the filter.
    await page.mouse.move(0, 0);
    await selector.press('ArrowDown');
    await selector.press('Enter');
    await expect(popup).toBeVisible();
    expect(queries).toHaveLength(before);
    await popup
      .getByRole('button', { name: getLocaleMessage(locale, 'pages.button.confirm'), exact: true })
      .click();
    await expect(popup).not.toBeVisible();
    await expect.poll(() => queries.length).toBe(before + 1);
    expect(queries[queries.length - 1]?.body.p_filter_condition.classification[0].path).toEqual(
      reference.classification.canonicalPath.map(({ id }) => id),
    );

    const selected = root.locator('.ant-select-content').filter({ hasText: fullPath });
    expect(
      await selected.evaluate((element) => {
        const text = document.createRange();
        text.selectNodeContents(element);
        return text.getBoundingClientRect().width > element.getBoundingClientRect().width;
      }),
    ).toBe(true);
    await selected.hover();
    await assertReadableTooltip(page, fullPath);
    await page.mouse.move(0, 0);
    await selector.blur();
    await selector.focus();
    await expect(selector).toBeFocused();
    await assertReadableTooltip(page, fullPath);
    expect(queries).toHaveLength(before + 1);
    await selector.press('Escape');

    // A later hover must not turn a draft into an applied query, or prevent outside dismissal.
    await selector.click();
    await selector.fill(labels[0]);
    const other = popup.locator('.ant-cascader-menu-item').filter({ hasText: labels[0] }).first();
    await hoverLabel(page, other);
    await assertReadableTooltip(page, labels[0]);
    await other.click();
    await page.locator('.ant-pro-layout-content').click({ position: { x: 4, y: 4 } });
    await expect(popup).not.toBeVisible();
    expect(queries).toHaveLength(before + 1);
    await expect(selected).toBeVisible();
    await writeFile(
      testInfo.outputPath('tooltip-geometry.json'),
      JSON.stringify(geometry, null, 2),
    );
  });
}
