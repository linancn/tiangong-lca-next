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
// Web Locks and BroadcastChannel. Only backend HTTP responses are synthetic.
test('foreign session and sign-out fence a held refresh across actual application tabs', async ({
  browser,
  baseURL,
}, testInfo) => {
  test.setTimeout(120_000);
  annotateEvidence(testInfo, findRouteAssertion('/welcome'), 'supabase-session-race');
  for (const scenario of ['foreign-session', 'sign-out'] as const) {
    const context = await browser.newContext({ baseURL, serviceWorkers: 'block' });
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
      // Prepare B's real login form while A's session is still valid. Password
      // sign-in itself does not await A's SDK refresh lock.
      await b.goto('/#/user/login');
      await waitForRenderedLoginControl(b);
      const controls = getLoginFormControls(b);
      await controls.email.fill('actor-b@example.invalid');
      await controls.password.fill('qualification-only');
      const generation = await a.evaluate(() =>
        sessionStorage.getItem('qualification-document-generation'),
      );
      await a.clock.fastForward(3_600_000);
      await race.refresh.started;
      await a
        .getByRole('button', {
          name: getLocaleMessage('en-US', 'pages.process.lca.taskCenter.title'),
          exact: true,
        })
        .click();
      const nativeBeforeWinner = race.taskRequests.length;
      // Age only A to trigger its public SDK timer, then restore wall time so
      // B's newly issued token remains valid when A's reload admits it.
      await a.clock.setFixedTime(new Date());
      await controls.submit.click();
      await expect.poll(() => new URL(b.url()).hash).toBe('#/welcome');
      if (scenario === 'sign-out') {
        await b.locator('.tg-global-header-avatar-trigger').hover();
        await b
          .getByText(getLocaleMessage('en-US', 'menu.account.logout'), { exact: true })
          .click();
        await expect.poll(() => new URL(b.url()).hash.startsWith('#/user/login')).toBe(true);
      }
      // The product invalidates A synchronously and schedules a full admission
      // reload outside Auth's callback lock. A's HTTP refresh may be aborted by
      // that reload; native Node corpus separately proves returned winning B.
      await expect
        .poll(() => a.evaluate(() => sessionStorage.getItem('qualification-document-generation')))
        .not.toBe(generation);
      race.refresh.release();
      await expect
        .poll(() => new URL(a.url()).hash.startsWith('#/user/login'))
        .toBe(scenario === 'sign-out');
      const session = await a.evaluate(() => {
        const key = Object.keys(localStorage).find((value) => /^sb-.+-auth-token$/u.test(value));
        return key ? JSON.parse(localStorage.getItem(key) ?? 'null') : null;
      });
      expect(session?.user?.id ?? null).toBe(
        scenario === 'foreign-session' ? SYNTHETIC_ACTOR_B : null,
      );
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
