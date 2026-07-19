import { expect, test } from './fixtures';

import { LOCALE_REGISTRY } from '../../../src/services/general/localeRegistry';
import { annotateEvidence, findRouteAssertion, readStoredAppLocale } from './contracts';

const loginAssertion = findRouteAssertion('/user/login');

test('locale switching preserves hash query at a narrow viewport', async ({ page }, testInfo) => {
  annotateEvidence(testInfo, loginAssertion, 'query-responsive');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/user/login?codex-e2e=query-preserved', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('login-language-frame')).toBeVisible();

  for (const localeDefinition of LOCALE_REGISTRY) {
    await page.getByTestId('login-language-frame').click();
    await page
      .locator('.ant-dropdown-menu-item')
      .filter({ hasText: localeDefinition.nativeLabel })
      .click();
    await expect.poll(() => readStoredAppLocale(page)).toBe(localeDefinition.canonicalLocale);
    expect(new URL(page.url()).hash).toContain('codex-e2e=query-preserved');
    await expect(page.getByTestId('login-language-frame')).toBeVisible();
  }
});
