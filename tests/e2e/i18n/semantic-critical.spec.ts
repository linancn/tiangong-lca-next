import { expect, test, type Page } from './fixtures';

import { LOCALE_REGISTRY } from '../../../src/services/general/localeRegistry';
import {
  annotateEvidence,
  AUTHORING_LANGUAGE_LABELS,
  findRouteAssertion,
  readStoredAppLocale,
} from './contracts';
import { waitForRenderedLoginControl } from './login-route-readiness';

const loginAssertion = findRouteAssertion('/user/login');

async function openLanguageMenu(page: Page) {
  const languageControl = await waitForRenderedLoginControl(page);
  await languageControl.click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return menu;
}

test('login locale selector is registry-complete in every browser', async ({ page }, testInfo) => {
  annotateEvidence(testInfo, loginAssertion, 'registry-selector');
  await page.goto('/#/user/login?codex-e2e=locale-selector', { waitUntil: 'domcontentloaded' });

  for (const localeDefinition of LOCALE_REGISTRY) {
    const menu = await openLanguageMenu(page);
    for (const optionDefinition of LOCALE_REGISTRY) {
      await expect(
        menu.getByRole('menuitem').filter({ hasText: optionDefinition.nativeLabel }),
      ).toBeVisible();
    }
    const target = menu.getByRole('menuitem').filter({ hasText: localeDefinition.nativeLabel });
    await target.click();
    await expect.poll(() => readStoredAppLocale(page)).toBe(localeDefinition.canonicalLocale);
    expect(new URL(page.url()).hash).toContain('codex-e2e=locale-selector');
  }

  expect(AUTHORING_LANGUAGE_LABELS.length).toBeGreaterThan(0);
});
