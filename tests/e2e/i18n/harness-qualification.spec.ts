import { getLoginFormControls, signInViaUi } from './auth';
import { expect, test } from './fixtures';
import {
  createControlledResponseGate,
  HARNESS_PERSONAS,
  type HarnessPersona,
} from './harness-contract';
import { readVerifiedProductionBackendTarget } from './production-backend-target';
import {
  assertSemanticBackendSimulatorClosed,
  installSemanticBackendSimulator,
} from './semantic-backend-simulator';

const CONTROLLED_LOCATION_PATH = '/__e2e/reference-phase/location.json';

test('controlled reference fixture exposes the same request-held pending transition', async ({
  baseURL,
  page,
}) => {
  expect(baseURL).toBeTruthy();

  const responseGate = createControlledResponseGate();
  const controlledLocationPattern = new RegExp(`${CONTROLLED_LOCATION_PATH}$`, 'u');

  await page.route(controlledLocationPattern, async (route) => {
    responseGate.markStarted();
    await responseGate.released;
    await route.fulfill({
      body: JSON.stringify({ label: 'controlled-location' }),
      contentType: 'application/json',
      status: 200,
    });
    responseGate.settle();
  });

  try {
    await page.goto(new URL('/privacy_notice.html', baseURL!).toString(), {
      waitUntil: 'domcontentloaded',
    });
    const requestStarted = page.waitForRequest(
      (request) => new URL(request.url()).pathname === CONTROLLED_LOCATION_PATH,
    );
    await page.evaluate((path) => {
      const consumer = document.createElement('div');
      consumer.dataset.referenceLanguage = 'zh';
      consumer.dataset.referencePending = 'true';
      consumer.dataset.referencePhase = 'requesting';
      consumer.dataset.testid = 'controlled-reference-location';
      document.body.append(consumer);
      void fetch(new URL(path, window.location.origin), { cache: 'no-store' })
        .then((response) => response.json() as Promise<{ label: string }>)
        .then((result) => {
          consumer.textContent = result.label;
          consumer.dataset.referencePending = 'false';
          consumer.dataset.referencePhase = 'ready';
        });
    }, CONTROLLED_LOCATION_PATH);
    await requestStarted;
    await responseGate.started;
    expect(responseGate.phase).toBe('response_held');

    const consumer = page.getByTestId('controlled-reference-location');
    await expect(consumer).toHaveAttribute('data-reference-language', 'zh');
    await expect(consumer).toHaveAttribute('data-reference-phase', 'requesting');
    await expect(consumer).toHaveAttribute('data-reference-pending', 'true');

    responseGate.release();
    await expect(consumer).toHaveAttribute('data-reference-phase', 'ready');
    await expect(consumer).toHaveAttribute('data-reference-pending', 'false');
    await expect(consumer).toHaveText('controlled-location');
  } finally {
    responseGate.release();
    await page.unroute(controlledLocationPattern);
  }
});

test('explicit personas never inherit the protected actor role', async ({ baseURL, browser }) => {
  expect(baseURL).toBeTruthy();
  const backend = readVerifiedProductionBackendTarget();
  for (const [name, contract] of Object.entries(HARNESS_PERSONAS) as [
    HarnessPersona,
    (typeof HARNESS_PERSONAS)[HarnessPersona],
  ][]) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const simulator = await installSemanticBackendSimulator(context, name);
    const personaPage = await context.newPage();
    try {
      if (!contract.authenticated) {
        await personaPage.goto(new URL('/#/user/login', baseURL!).toString());
        await expect(getLoginFormControls(personaPage).submit).toBeVisible();
        expect(new URL(personaPage.url()).hash).toBe('#/user/login');
        continue;
      }
      await signInViaUi(personaPage);
      const roles = await personaPage.evaluate(
        async ({ origin, publishableKey, userId }) => {
          const query = new URLSearchParams({
            select: 'user_id,role',
            team_id: 'eq.00000000-0000-0000-0000-000000000000',
            user_id: `eq.${userId}`,
          });
          const response = await fetch(`${origin}/rest/v1/roles?${query}`, {
            headers: { apikey: publishableKey },
          });
          return (await response.json()) as { role: string; user_id: string }[];
        },
        {
          origin: backend.origin,
          publishableKey: backend.publishableKey,
          userId: '70400000-0000-4000-8000-000000000704',
        },
      );
      expect(roles.map(({ role }) => role)).toEqual([...contract.expectedRoles]);
      expect(roles.every(({ user_id }) => user_id === '70400000-0000-4000-8000-000000000704')).toBe(
        true,
      );
    } finally {
      await context.close();
      assertSemanticBackendSimulatorClosed(simulator);
    }
  }
});

test('out-of-order responses settle on the declared current request', async ({ baseURL, page }) => {
  expect(baseURL).toBeTruthy();
  const staleGate = createControlledResponseGate();
  const currentGate = createControlledResponseGate();
  await page.route(/\/__e2e\/reference-phase\/(stale|current)[.]json$/u, async (route) => {
    const stale = new URL(route.request().url()).pathname.endsWith('/stale.json');
    const gate = stale ? staleGate : currentGate;
    gate.markStarted();
    await gate.released;
    await route.fulfill({ body: JSON.stringify({ value: stale ? 'stale' : 'current' }) });
    gate.settle();
  });
  await page.goto(new URL('/privacy_notice.html', baseURL!).toString());
  await page.setContent('<output data-testid="out-of-order"></output>');
  await page.evaluate(() => {
    const output = document.querySelector<HTMLOutputElement>('[data-testid="out-of-order"]')!;
    let version = 0;
    const request = async (name: string) => {
      const requestVersion = ++version;
      const response = await fetch(`/__e2e/reference-phase/${name}.json`);
      const result = (await response.json()) as { value: string };
      if (requestVersion === version) output.value = result.value;
    };
    void request('stale');
    void request('current');
  });
  await Promise.all([staleGate.started, currentGate.started]);
  currentGate.release();
  await expect(page.getByTestId('out-of-order')).toHaveText('current');
  staleGate.release();
  await expect(page.getByTestId('out-of-order')).toHaveText('current');
});

test('bootstrap failure and retry use separate controlled attempts', async ({ baseURL, page }) => {
  expect(baseURL).toBeTruthy();
  const firstGate = createControlledResponseGate();
  const retryGate = createControlledResponseGate();
  let attempt = 0;
  await page.route(/\/__e2e\/reference-phase\/bootstrap[.]json$/u, async (route) => {
    attempt += 1;
    const gate = attempt === 1 ? firstGate : retryGate;
    gate.markStarted();
    await gate.released;
    await route.fulfill(
      attempt === 1
        ? { body: '{"error":"controlled"}', status: 503 }
        : { body: '{"value":"ready"}', status: 200 },
    );
    gate.settle();
  });
  await page.goto(new URL('/privacy_notice.html', baseURL!).toString());
  await page.setContent(
    '<button data-testid="retry">retry</button><output data-testid="bootstrap"></output>',
  );
  await page.evaluate(() => {
    const output = document.querySelector<HTMLOutputElement>('[data-testid="bootstrap"]')!;
    const run = async () => {
      output.dataset.phase = 'requesting';
      const response = await fetch('/__e2e/reference-phase/bootstrap.json');
      output.dataset.phase = response.ok ? 'ready' : 'failed';
    };
    document.querySelector('[data-testid="retry"]')!.addEventListener('click', () => void run());
    void run();
  });
  await firstGate.started;
  firstGate.release();
  await expect(page.getByTestId('bootstrap')).toHaveAttribute('data-phase', 'failed');
  await page.getByTestId('retry').click();
  await retryGate.started;
  retryGate.release();
  await expect(page.getByTestId('bootstrap')).toHaveAttribute('data-phase', 'ready');
  expect(attempt).toBe(2);
});
