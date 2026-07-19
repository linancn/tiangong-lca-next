import { expect, test } from './fixtures';

import { signInViaUi } from './auth';
import {
  annotateEvidence,
  APP_LOCALES,
  AUTHORING_LANGUAGE_LABELS,
  findRouteAssertion,
  getLocaleMessage,
  readStoredAppLocale,
  selectAppLocaleThroughUi,
} from './contracts';

const teamAssertion = findRouteAssertion('/team');

test('team authoring exposes every registry language without submitting', async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.E2E_AUTHENTICATED !== 'true',
    'Team authoring semantics require explicitly supplied runtime credentials.',
  );
  annotateEvidence(testInfo, teamAssertion, 'authoring-options');
  await signInViaUi(page);
  await page.goto('/#/team?action=create', { waitUntil: 'domcontentloaded' });
  for (const locale of APP_LOCALES) {
    await test.step(`locale ${locale}`, async () => {
      await selectAppLocaleThroughUi(page, locale);
      await expect.poll(() => readStoredAppLocale(page)).toBe(locale);
      await expect(
        page.getByText(getLocaleMessage(locale, 'pages.team.info.title'), { exact: true }).first(),
      ).toBeVisible();
      const firstLanguageSelector = page.locator('.team-info-form').getByRole('combobox').first();
      await expect(firstLanguageSelector).toBeVisible();
      await firstLanguageSelector.press('ArrowDown');
      await expect(firstLanguageSelector).toHaveAttribute('aria-expanded', 'true');
      const listboxId = await firstLanguageSelector.getAttribute('aria-controls');
      expect(listboxId).toBeTruthy();
      const activeLanguageListbox = page.locator(`[id="${listboxId}"]`);
      await expect(activeLanguageListbox).toHaveAttribute('role', 'listbox');
      for (const label of AUTHORING_LANGUAGE_LABELS) {
        await expect(
          activeLanguageListbox.getByRole('option', { name: label, exact: true }),
        ).toHaveCount(1);
      }
      await page.keyboard.press('Escape');
    });
  }
});
