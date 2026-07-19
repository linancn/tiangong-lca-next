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

test('programmatic locale activation preserves a mounted surface behind an overlay', async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.E2E_AUTHENTICATED !== 'true',
    'Mounted locale-switch semantics require explicitly supplied runtime credentials.',
  );
  annotateEvidence(testInfo, teamAssertion, 'authoring-options');
  await signInViaUi(page);
  await page.goto('/#/team?action=create', { waitUntil: 'domcontentloaded' });
  const currentLocale = await readStoredAppLocale(page);
  const targetLocale = APP_LOCALES.find((locale) => locale !== currentLocale);
  expect(targetLocale).toBeTruthy();
  const mountedUrl = page.url();
  const documentIdentity = await page.evaluate(() => {
    const identity = crypto.randomUUID();
    document.documentElement.dataset.codexE2eDocumentIdentity = identity;
    const overlay = document.createElement('div');
    overlay.dataset.codexE2eLocaleOverlay = 'mounted';
    overlay.setAttribute('aria-hidden', 'true');
    Object.assign(overlay.style, {
      inset: '0',
      pointerEvents: 'auto',
      position: 'fixed',
      zIndex: '9999',
    });
    document.body.append(overlay);
    return identity;
  });

  try {
    await selectAppLocaleThroughUi(page, targetLocale!, { forceTrigger: true });
    await expect.poll(() => readStoredAppLocale(page)).toBe(targetLocale);
    expect(page.url()).toBe(mountedUrl);
    await expect(page.locator('[data-codex-e2e-locale-overlay="mounted"]')).toHaveCount(1);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.codexE2eDocumentIdentity))
      .toBe(documentIdentity);
  } finally {
    await page.evaluate(() => {
      document.querySelector('[data-codex-e2e-locale-overlay="mounted"]')?.remove();
    });
  }
});
