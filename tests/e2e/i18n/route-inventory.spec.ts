import { expect, test, type Page } from './fixtures';

import { signInViaUi } from './auth';
import {
  annotateEvidence,
  APP_LOCALES,
  flattenExecutableRouteAssertions,
  flattenExecutableViewVariants,
  getLocaleMessage,
  PLAYWRIGHT_BROWSER_PROJECTS,
  readStoredAppLocale,
  selectAppLocaleThroughUi,
  setStoredAppLocale,
  spaLocationToCandidateUrl,
  type SpaLocationTarget,
} from './contracts';
import { installVerifiedProductionReadOnlyGuard } from './production-backend-target';
import { assertNoBlockedProductionRequests } from './production-request-guard';

function readSpaLocation(page: Page): SpaLocationTarget {
  const hash = new URL(page.url()).hash.slice(1);
  const queryStart = hash.indexOf('?');
  const hashPath = queryStart >= 0 ? hash.slice(0, queryStart) : hash;
  const hashQuery = Object.fromEntries(
    new URLSearchParams(queryStart >= 0 ? hash.slice(queryStart + 1) : '').entries(),
  );
  return { hashPath, hashQuery };
}

async function expectExactVisibleText(page: Page, text: string): Promise<void> {
  await expect
    .poll(async () => {
      const candidates = page.getByText(text, { exact: true });
      for (let index = 0; index < (await candidates.count()); index += 1) {
        if (await candidates.nth(index).isVisible()) {
          return true;
        }
      }
      return false;
    })
    .toBe(true);
}

test('Chromium route semantics inventory closes every stable assertion ID', async ({
  baseURL,
  browser,
  browserName,
  page,
}, testInfo) => {
  // This is intentionally one auditable matrix: 49 stable route assertions × four locales.
  // Keep the timeout local so ordinary focused E2E tests retain the stricter suite default.
  test.setTimeout(15 * 60_000);
  test.skip(
    browserName !== PLAYWRIGHT_BROWSER_PROJECTS[0],
    'Full route inventory runs in Chromium; critical assertions run in all browser projects.',
  );
  test.skip(
    process.env.E2E_AUTHENTICATED !== 'true',
    'Authenticated route semantics require explicitly supplied runtime credentials.',
  );

  expect(baseURL).toBeTruthy();
  await signInViaUi(page);
  const anonymousContext = await browser.newContext({
    locale: 'en-US',
    serviceWorkers: 'block',
  });
  const { guard: anonymousProductionRequestGuard } =
    await installVerifiedProductionReadOnlyGuard(anonymousContext);
  const anonymousPage = await anonymousContext.newPage();
  await anonymousPage.goto(new URL('/#/user/login', baseURL!).toString(), {
    waitUntil: 'domcontentloaded',
  });

  try {
    for (const assertion of flattenExecutableRouteAssertions()) {
      annotateEvidence(testInfo, assertion);
      await test.step(`${assertion.assertionId} ${assertion.route} ${assertion.viewState}`, async () => {
        for (const locale of APP_LOCALES) {
          await test.step(
            `locale ${locale}`,
            async () => {
              const target = assertion.target;
              const assertionPage =
                target.kind === 'declared-static-fallback' || target.session === 'anonymous'
                  ? anonymousPage
                  : page;

              if (target.kind === 'declared-static-fallback') {
                await setStoredAppLocale(assertionPage, locale);
                await assertionPage.goto(new URL(target.expectedPathname, baseURL!).toString(), {
                  waitUntil: 'domcontentloaded',
                });
                await expect
                  .poll(() => new URL(assertionPage.url()).pathname)
                  .toBe(target.expectedPathname);
                await expect.poll(() => new URL(assertionPage.url()).search).toBe('');
                await expect.poll(() => new URL(assertionPage.url()).hash).toBe('');
                await expectExactVisibleText(assertionPage, target.exactVisibleText);
                await expect.poll(() => readStoredAppLocale(assertionPage)).toBe(locale);
                return;
              }

              // The product selector changes locale in the mounted document. This exercises the
              // same transition users perform and preserves the authenticated session and URL state.
              await assertionPage.goto(spaLocationToCandidateUrl(baseURL!, target.navigate), {
                waitUntil: 'domcontentloaded',
              });
              await expect.poll(() => readSpaLocation(assertionPage)).toEqual(target.expected);
              if (target.localeTransition === 'storage-reload') {
                await setStoredAppLocale(assertionPage, locale);
                await assertionPage.reload({ waitUntil: 'domcontentloaded' });
              } else {
                await selectAppLocaleThroughUi(assertionPage, locale);
              }
              await expect.poll(() => readSpaLocation(assertionPage)).toEqual(target.expected);
              await expect.poll(() => readStoredAppLocale(assertionPage)).toBe(locale);

              if (target.kind === 'role-boundary') {
                await expect(assertionPage.locator(target.boundary.selector)).toBeVisible();
                for (const messageId of target.boundary.messageIds) {
                  await test.step(`message ${messageId}`, async () => {
                    await expectExactVisibleText(
                      assertionPage,
                      getLocaleMessage(locale, messageId),
                    );
                  });
                }
                return;
              }

              await expect(assertionPage.locator('.ant-result-403')).toHaveCount(0);
              for (const messageId of [
                ...new Set([...target.visible.messageIds, ...assertion.pageOwnedMessageIds]),
              ]) {
                await test.step(`message ${messageId}`, async () => {
                  await expectExactVisibleText(assertionPage, getLocaleMessage(locale, messageId));
                });
              }
            },
            { timeout: 60_000 },
          );
        }
      });
    }

    const assertionsById = new Map(
      flattenExecutableRouteAssertions().map((assertion) => [assertion.assertionId, assertion]),
    );
    for (const variant of flattenExecutableViewVariants().filter(
      ({ execution }) => execution?.kind !== 'dedicated-spec',
    )) {
      const routeAssertion = assertionsById.get(variant.routeAssertionId);
      if (!routeAssertion) {
        throw new Error(`${variant.assertionId} has no executable route assertion.`);
      }
      annotateEvidence(testInfo, routeAssertion, variant.scenario);
      await test.step(`${variant.assertionId} ${variant.registryId}/${variant.variantId}`, async () => {
        for (const locale of APP_LOCALES) {
          await test.step(
            `locale ${locale}`,
            async () => {
              const routeTarget = routeAssertion.target;
              if (routeTarget.kind === 'declared-static-fallback') {
                throw new Error(`${variant.assertionId} cannot target a static fallback.`);
              }
              const assertionPage = routeTarget.session === 'anonymous' ? anonymousPage : page;
              await assertionPage.goto(
                spaLocationToCandidateUrl(baseURL!, variant.target.navigate),
                { waitUntil: 'domcontentloaded' },
              );
              await expect
                .poll(() => readSpaLocation(assertionPage))
                .toEqual(variant.target.expected);
              await selectAppLocaleThroughUi(assertionPage, locale);
              await expect
                .poll(() => readSpaLocation(assertionPage))
                .toEqual(variant.target.expected);
              await expect.poll(() => readStoredAppLocale(assertionPage)).toBe(locale);
              await expect(assertionPage.locator('.ant-result-403')).toHaveCount(0);
              for (const messageId of variant.target.visibleMessageIds) {
                await expectExactVisibleText(assertionPage, getLocaleMessage(locale, messageId));
              }
            },
            { timeout: 60_000 },
          );
        }
      });
    }
  } finally {
    await anonymousContext.close();
    assertNoBlockedProductionRequests(anonymousProductionRequestGuard);
  }
});
