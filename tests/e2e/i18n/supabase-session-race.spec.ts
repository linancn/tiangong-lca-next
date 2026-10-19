import { getLoginFormControls } from './auth';
import { annotateEvidence, findRouteAssertion, getLocaleMessage } from './contracts';
import { expect, test } from './fixtures';
import { SEMANTIC_HARNESS_USER_ID } from './harness-contract';
import { waitForRenderedLoginControl } from './login-route-readiness';
import {
  assertSemanticBackendSimulatorClosed,
  createSyntheticAuthRace,
  installSemanticBackendSimulator,
  SYNTHETIC_ACTOR_B,
} from './semantic-backend-simulator';

// Every browser uses the built application's installed client, real shared storage,
// native BroadcastChannel and the installed SDK's default lockless path. Only backend HTTP responses are synthetic.
test('foreign session and sign-out fence a held refresh across actual application tabs', async ({
  browser,
  baseURL,
}, testInfo) => {
  test.setTimeout(120_000);
  // Match playwright.config.ts: authenticated 45s; public/local 15s.
  const identityTimeout = process.env.E2E_AUTHENTICATED === 'true' ? 45_000 : 15_000;
  annotateEvidence(testInfo, findRouteAssertion('/welcome'), 'supabase-session-race');
  for (const scenario of ['foreign-session', 'sign-out'] as const) {
    const context = await browser.newContext({ baseURL, locale: 'en-US', serviceWorkers: 'block' });
    const race = createSyntheticAuthRace();
    const simulator = await installSemanticBackendSimulator(context, 'standard_user', {
      authRace: race,
    });
    await context.addInitScript(() => {
      const key = 'qualification-document-generation';
      sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key) ?? '0') + 1));
    });
    const a = await context.newPage();
    const b = await context.newPage();
    const login = async (page: typeof a, email: string) => {
      await page.goto('/#/user/login');
      await waitForRenderedLoginControl(page);
      const controls = getLoginFormControls(page);
      await controls.email.fill(email);
      await controls.password.fill('qualification-only');
      await controls.submit.click();
      await expect.poll(() => new URL(page.url()).hash).toBe('#/welcome');
      await expect(page.locator('.tg-global-header-avatar-trigger')).toBeVisible();
    };
    try {
      await a.clock.install();
      await login(a, 'semantic-harness@example.invalid');
      // Prepare B's real login form while A's session is still valid. The
      // installed lockless SDK can sign B in while A's refresh HTTP is held.
      await b.goto('/#/user/login');
      await waitForRenderedLoginControl(b);
      const controls = getLoginFormControls(b);
      await controls.email.fill('actor-b@example.invalid');
      await controls.password.fill('qualification-only');
      const generation = await a.evaluate(() =>
        sessionStorage.getItem('qualification-document-generation'),
      );
      await a.bringToFront();
      await expect.poll(() => a.evaluate(() => document.visibilityState)).toBe('visible');
      await a.clock.fastForward(3_600_000);
      await race.refresh.started;
      await a
        .getByRole('button', {
          name: getLocaleMessage('en-US', 'pages.process.lca.taskCenter.title'),
          exact: true,
        })
        .click();
      const nativeBeforeWinner = race.taskRequests.length;
      // Playwright advances the whole context clock. With A observed visible,
      // the SDK timer enters the shared refresh gate; B may also refresh.
      // Restore running wall time so B's new token stays valid on reload and
      // feedback's Date-based dismissal timer can continue measuring elapsed time.
      await a.clock.setSystemTime(new Date());
      const restoredWallTime = await b.evaluate(() => Date.now());
      await b.bringToFront();
      await expect.poll(() => b.evaluate(() => document.visibilityState)).toBe('visible');
      await controls.submit.click();
      await expect.poll(() => new URL(b.url()).hash).toBe('#/welcome');
      await expect.poll(() => b.evaluate(() => Date.now())).toBeGreaterThan(restoredWallTime);
      if (scenario === 'sign-out') {
        const loginFeedback = b.getByText(getLocaleMessage('en-US', 'pages.login.success'), {
          exact: true,
        });
        await expect(loginFeedback).toBeVisible();
        await expect(b.locator('.ant-message-list-content')).toHaveCSS('pointer-events', 'none');
        await b.locator('.tg-global-header-avatar-trigger').hover();
        // The account remains operable while the default-duration toast is visible.
        await expect(loginFeedback).toBeVisible();
        await b
          .getByText(getLocaleMessage('en-US', 'menu.account.logout'), { exact: true })
          .click();
        await expect.poll(() => new URL(b.url()).hash.startsWith('#/user/login')).toBe(true);
      }
      // The product invalidates A synchronously and schedules a full admission
      // reload outside Auth's callback. A's HTTP refresh may be aborted by
      // that reload; native Node corpus separately proves returned winning B.
      const waitForFreshIdentity = async () => {
        const observation = await a.waitForFunction(
          ({ previousGeneration, expectedOwner }) => {
            const currentGeneration = sessionStorage.getItem('qualification-document-generation');
            if (!currentGeneration || currentGeneration === previousGeneration) return false;
            const key = Object.keys(localStorage).find((value) =>
              /^sb-.+-auth-token$/u.test(value),
            );
            const session = key ? JSON.parse(localStorage.getItem(key) ?? 'null') : null;
            return (session?.user?.id ?? null) === expectedOwner;
          },
          {
            previousGeneration: generation,
            expectedOwner: scenario === 'foreign-session' ? SYNTHETIC_ACTOR_B : null,
          },
          { polling: 100, timeout: identityTimeout },
        );
        await observation.dispose();
      };
      await waitForFreshIdentity();
      race.refresh.release();
      await expect
        .poll(() => new URL(a.url()).hash.startsWith('#/user/login'))
        .toBe(scenario === 'sign-out');
      // Retain the post-release exact owner assertion without another separate
      // evaluation window while either tab's stale refresh is settling.
      await waitForFreshIdentity();
      expect(
        race.taskRequests
          .slice(nativeBeforeWinner)
          .filter((request) => request.subject === SEMANTIC_HARNESS_USER_ID),
      ).toEqual([]);
      if (scenario === 'foreign-session') {
        await a
          .getByRole('button', {
            name: getLocaleMessage('en-US', 'pages.process.lca.taskCenter.title'),
            exact: true,
          })
          .click();
        await expect
          .poll(
            () =>
              race.taskRequests.filter((request) => request.subject === SYNTHETIC_ACTOR_B).length,
          )
          .toBeGreaterThan(0);
      }
    } finally {
      race.refresh.release();
      await context.close();
      assertSemanticBackendSimulatorClosed(simulator);
    }
  }
});
