import { expect, test, type Page } from './fixtures';

import { LOCALE_REGISTRY } from '../../../src/services/general/localeRegistry';
import {
  annotateEvidence,
  AUTHORING_LANGUAGE_LABELS,
  findRouteAssertion,
  readStoredAppLocale,
} from './contracts';

const loginAssertion = findRouteAssertion('/user/login');

async function openLanguageMenu(page: Page) {
  await page.getByTestId('login-language-frame').click();
  await expect(page.locator('.ant-dropdown-menu')).toBeVisible();
}

test('login locale selector is registry-complete in every browser', async ({ page }, testInfo) => {
  annotateEvidence(testInfo, loginAssertion, 'registry-selector');
  await page.goto('/#/user/login?codex-e2e=locale-selector', { waitUntil: 'domcontentloaded' });

  for (const localeDefinition of LOCALE_REGISTRY) {
    await openLanguageMenu(page);
    for (const optionDefinition of LOCALE_REGISTRY) {
      await expect(
        page.locator('.ant-dropdown-menu-item').filter({ hasText: optionDefinition.nativeLabel }),
      ).toBeVisible();
    }
    const target = page
      .locator('.ant-dropdown-menu-item')
      .filter({ hasText: localeDefinition.nativeLabel });
    await target.click();
    await expect.poll(() => readStoredAppLocale(page)).toBe(localeDefinition.canonicalLocale);
    expect(new URL(page.url()).hash).toContain('codex-e2e=locale-selector');
  }

  expect(AUTHORING_LANGUAGE_LABELS.length).toBeGreaterThan(0);
});
