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

const welcomeAssertion = findRouteAssertion('/welcome');
const TEAMS_API_PATTERN = '**/rest/v1/teams*';
const RAW_FORCED_RESPONSE = 'codex-e2e forced response';
const productionBackendTarget = readVerifiedProductionBackendTarget();

function assertExactTeamsRead(route: Route): void {
  const request = route.request();
  const target = new URL(request.url());
  expect(request.method()).toBe('GET');
  expect(target.origin).toBe(productionBackendTarget.origin);
  expect(target.pathname).toBe('/rest/v1/teams');
  expect(request.headers().apikey).toBe(productionBackendTarget.publishableKey);
  expect([...target.searchParams.keys()].sort()).toEqual(['order', 'rank', 'select']);
  expect(target.searchParams.get('select')).toBe('id,json,rank');
  expect(target.searchParams.get('rank')).toBe('gt.0');
  expect(target.searchParams.get('order')).toBe('rank.asc');
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
      let requestCount = 0;
      let releaseModalResponse: (() => void) | undefined;
      const modalResponse = new Promise<void>((resolve) => {
        releaseModalResponse = resolve;
      });
      await page.route(TEAMS_API_PATTERN, async (route) => {
        assertExactTeamsRead(route);
        requestCount += 1;
        if (requestCount === 1) {
          await fulfillTeams(route, []);
          return;
        }
        await modalResponse;
        await fulfillTeams(route, []);
      });

      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect.poll(() => requestCount).toBeGreaterThanOrEqual(1);
        await page
          .getByRole('button', {
            name: getLocaleMessage(locale, 'pages.welcome.overview.actions.dataEcosystem'),
            exact: true,
          })
          .click();
        await expect.poll(() => requestCount).toBe(2);
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
        await page.unroute(TEAMS_API_PATTERN);
      }
    });

    await test.step(`locale ${locale} error and retry transition`, async () => {
      let requestCount = 0;
      await page.route(TEAMS_API_PATTERN, async (route) => {
        assertExactTeamsRead(route);
        requestCount += 1;
        if (requestCount === 2) {
          await fulfillTeams(route, [], 500);
          return;
        }
        await fulfillTeams(route, []);
      });

      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect.poll(() => requestCount).toBeGreaterThanOrEqual(1);
        await page
          .getByRole('button', {
            name: getLocaleMessage(locale, 'pages.welcome.overview.actions.dataEcosystem'),
            exact: true,
          })
          .click();
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
        await retryButton.click();
        await expect.poll(() => requestCount).toBe(3);
        await expect(
          page.getByRole('status').filter({
            hasText: getLocaleMessage(locale, 'pages.welcome.overview.dataEcosystem.empty'),
          }),
        ).toBeVisible();
        await closeModal(page);
      } finally {
        await page.unroute(TEAMS_API_PATTERN);
      }
    });
  }
});
