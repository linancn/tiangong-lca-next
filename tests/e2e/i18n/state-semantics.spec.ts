import { expect, test, type Page, type Route } from './fixtures';

import { signInViaUi } from './auth';
import {
  annotateEvidence,
  APP_LOCALES,
  findRouteAssertion,
  getLocaleMessage,
  PLAYWRIGHT_BROWSER_PROJECTS,
  selectAppLocaleThroughUi,
} from './contracts';
import { readVerifiedProductionBackendTarget } from './production-backend-target';
import { assertAuditedSyntheticReadRequest } from './production-request-guard';

const welcomeAssertion = findRouteAssertion('/welcome');
const TEAM_LIST_RPC_PATTERN = '**/rest/v1/rpc/qry_team_list';
const RAW_FORCED_RESPONSE = 'codex-e2e forced response';
const productionBackendTarget = readVerifiedProductionBackendTarget();

function assertExactTeamsRead(route: Route): void {
  assertAuditedSyntheticReadRequest(route.request(), {
    expectedOrigin: productionBackendTarget.origin,
    expectedPublishableKey: productionBackendTarget.publishableKey,
    jsonBody: {
      p_keyword: null,
      p_mode: 'ranked',
      p_page: 1,
      p_page_size: 100,
    },
    method: 'POST',
    pathname: '/rest/v1/rpc/qry_team_list',
    searchParams: {},
  });
}

async function fulfillTeams(route: Route, body: unknown[], status = 200): Promise<void> {
  await route.fulfill({
    body: JSON.stringify(status === 200 ? body : { message: RAW_FORCED_RESPONSE }),
    contentType: 'application/json',
    headers:
      status === 200 ? { 'content-range': body.length === 0 ? '*/0' : `0-0/${body.length}` } : {},
    status,
  });
}

async function closeModal(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog').filter({ visible: true });
  await expect(dialog).toHaveCount(1);
  await dialog.locator('.ant-modal-close').evaluate((button: HTMLButtonElement) => {
    button.click();
  });
  await expect(dialog).toHaveCount(0);
}

test.use({ screenshot: 'off', trace: 'off', video: 'off' });

test('welcome modal exposes localized loading, empty, error, and retry states', async ({
  browserName,
  page,
}, testInfo) => {
  test.skip(
    browserName !== PLAYWRIGHT_BROWSER_PROJECTS[0],
    'The full state matrix runs once in Chromium; shared critical routes run in every browser.',
  );
  test.skip(
    process.env.E2E_AUTHENTICATED !== 'true',
    'Authenticated state semantics require explicitly supplied runtime credentials.',
  );
  test.setTimeout(5 * 60_000);
  annotateEvidence(testInfo, welcomeAssertion, 'modal-state-machine');
  await signInViaUi(page);

  for (const locale of APP_LOCALES) {
    await test.step(`locale ${locale} empty transition`, async () => {
      await selectAppLocaleThroughUi(page, locale);
      let requestPhase: 'bootstrap' | 'modal' = 'bootstrap';
      let bootstrapRequestCount = 0;
      let modalRequestCount = 0;
      let releaseModalResponse: (() => void) | undefined;
      const modalResponse = new Promise<void>((resolve) => {
        releaseModalResponse = resolve;
      });
      await page.route(TEAM_LIST_RPC_PATTERN, async (route) => {
        assertExactTeamsRead(route);
        if (requestPhase === 'bootstrap') {
          bootstrapRequestCount += 1;
          await fulfillTeams(route, []);
          return;
        }
        modalRequestCount += 1;
        await modalResponse;
        await fulfillTeams(route, []);
      });

      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect.poll(() => bootstrapRequestCount).toBeGreaterThanOrEqual(1);
        await page.waitForLoadState('networkidle');
        requestPhase = 'modal';
        await page
          .getByRole('button', {
            name: getLocaleMessage(locale, 'pages.welcome.overview.actions.dataEcosystem'),
            exact: true,
          })
          .click();
        await expect.poll(() => modalRequestCount).toBe(1);
        await expect(page.locator('.ant-modal').filter({ visible: true })).toBeVisible();
        await expect(page.locator('.ant-modal .ant-spin-spinning')).toBeVisible();
        releaseModalResponse?.();
        await expect(
          page.getByRole('status').filter({
            hasText: getLocaleMessage(locale, 'pages.welcome.overview.dataEcosystem.empty'),
          }),
        ).toBeVisible();
        await closeModal(page);
      } finally {
        releaseModalResponse?.();
        await page.unroute(TEAM_LIST_RPC_PATTERN);
      }
    });

    await test.step(`locale ${locale} error and retry transition`, async () => {
      let requestPhase: 'bootstrap' | 'modal' | 'retry' = 'bootstrap';
      let bootstrapRequestCount = 0;
      let modalRequestCount = 0;
      let retryRequestCount = 0;
      await page.route(TEAM_LIST_RPC_PATTERN, async (route) => {
        assertExactTeamsRead(route);
        if (requestPhase === 'bootstrap') {
          bootstrapRequestCount += 1;
          await fulfillTeams(route, []);
          return;
        }
        if (requestPhase === 'modal') {
          modalRequestCount += 1;
          await fulfillTeams(route, [], 500);
          return;
        }
        retryRequestCount += 1;
        await fulfillTeams(route, []);
      });

      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect.poll(() => bootstrapRequestCount).toBeGreaterThanOrEqual(1);
        await page.waitForLoadState('networkidle');
        requestPhase = 'modal';
        await page
          .getByRole('button', {
            name: getLocaleMessage(locale, 'pages.welcome.overview.actions.dataEcosystem'),
            exact: true,
          })
          .click();
        await expect.poll(() => modalRequestCount).toBe(1);
        await expect(
          page.getByRole('alert').filter({
            hasText: getLocaleMessage(locale, 'pages.welcome.overview.dataEcosystem.error'),
          }),
        ).toBeVisible();
        await expect(page.getByText(RAW_FORCED_RESPONSE, { exact: true })).toHaveCount(0);
        const retryButton = page
          .getByRole('dialog')
          .filter({ visible: true })
          .getByRole('button')
          .filter({
            hasText: getLocaleMessage(locale, 'pages.welcome.overview.dataEcosystem.retry'),
          });
        await expect(retryButton).toHaveCount(1);
        requestPhase = 'retry';
        await retryButton.click();
        await expect.poll(() => retryRequestCount).toBe(1);
        await expect(
          page.getByRole('status').filter({
            hasText: getLocaleMessage(locale, 'pages.welcome.overview.dataEcosystem.empty'),
          }),
        ).toBeVisible();
        await closeModal(page);
      } finally {
        await page.unroute(TEAM_LIST_RPC_PATTERN);
      }
    });
  }
});
