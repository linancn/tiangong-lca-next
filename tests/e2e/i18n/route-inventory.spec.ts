import { expect, test, type Page, type Route } from './fixtures';

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
import {
  installVerifiedProductionReadOnlyGuard,
  readVerifiedProductionBackendTarget,
} from './production-backend-target';
import {
  assertAuditedSyntheticReadRequest,
  assertNoBlockedProductionRequests,
} from './production-request-guard';
import {
  assertSemanticBackendSimulatorClosed,
  installSemanticBackendSimulator,
} from './semantic-backend-simulator';

const MEMBERSHIP_RPC_PATTERN = '**/rest/v1/rpc/qry_membership_get_mine';
const productionBackendTarget = readVerifiedProductionBackendTarget();

async function fulfillStandardUserRole(route: Route): Promise<boolean> {
  if (route.request().method() === 'OPTIONS') {
    await route.fallback();
    return false;
  }
  assertAuditedSyntheticReadRequest(route.request(), {
    expectedOrigin: productionBackendTarget.origin,
    expectedPublishableKey: productionBackendTarget.publishableKey,
    jsonBody: {},
    method: 'POST',
    pathname: '/rest/v1/rpc/qry_membership_get_mine',
    searchParams: {},
  });
  await route.fulfill({
    // Route-boundary evidence is defined for a standard authenticated user. Keep that
    // boundary deterministic even when the supplied production actor owns elevated roles.
    body: JSON.stringify([]),
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'content-range',
      'content-range': '*/0',
    },
    status: 200,
  });
  return true;
}

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
  // This is intentionally one auditable matrix: 50 stable route assertions × four locales.
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
  const standardRoleReads = { fulfilled: 0 };
  await page.route(MEMBERSHIP_RPC_PATTERN, async (route) => {
    if (new URL(page.url()).hash.split('?')[0] !== '#/data-processing') {
      await route.fallback();
      return;
    }
    if (await fulfillStandardUserRole(route)) {
      standardRoleReads.fulfilled += 1;
    }
  });
  const anonymousContext = await browser.newContext({
    locale: 'en-US',
    serviceWorkers: 'block',
  });
  const qualification = process.env.E2E_QUALIFICATION === 'true';
  const anonymousProductionRequestGuard = qualification
    ? await installSemanticBackendSimulator(anonymousContext, 'anonymous')
    : (await installVerifiedProductionReadOnlyGuard(anonymousContext)).guard;
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
              const standardRoleReadsBeforeNavigation = standardRoleReads.fulfilled;
              await assertionPage.goto(spaLocationToCandidateUrl(baseURL!, target.navigate), {
                waitUntil: 'domcontentloaded',
              });
              if (
                assertionPage === page &&
                target.kind === 'role-boundary' &&
                target.navigate.hashPath === '/data-processing'
              ) {
                // Hash-only navigation can reuse the mounted application without issuing a fresh
                // role read. Reload so the exact standard-user route fulfillment proves this
                // boundary in both qualification and authenticated production runs.
                await assertionPage.reload({ waitUntil: 'domcontentloaded' });
                await expect
                  .poll(() => standardRoleReads.fulfilled)
                  .toBeGreaterThan(standardRoleReadsBeforeNavigation);
              }
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

              await expect(assertionPage.getByTestId('access-denied')).toHaveCount(0);
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
              await expect(assertionPage.getByTestId('access-denied')).toHaveCount(0);
              for (const messageId of variant.target.visibleMessageIds) {
                await expectExactVisibleText(assertionPage, getLocaleMessage(locale, messageId));
              }
            },
            { timeout: 60_000 },
          );
        }
      });
    }
    expect(standardRoleReads.fulfilled).toBeGreaterThan(0);
  } finally {
    await anonymousContext.close();
    if (
      'externalRequests' in anonymousProductionRequestGuard &&
      'productionWrites' in anonymousProductionRequestGuard
    ) {
      assertSemanticBackendSimulatorClosed(anonymousProductionRequestGuard);
    } else assertNoBlockedProductionRequests(anonymousProductionRequestGuard);
  }
});
