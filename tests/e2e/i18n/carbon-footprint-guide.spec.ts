import { expect, test, type Page, type Route } from './fixtures';

import { signInViaUi } from './auth';
import {
  annotateEvidence,
  APP_LOCALES,
  findRouteAssertion,
  getLocaleMessage,
  PLAYWRIGHT_BROWSER_PROJECTS,
  readStoredAppLocale,
  selectAppLocaleThroughUi,
} from './contracts';
import { readVerifiedProductionBackendTarget } from './production-backend-target';

const carbonFootprintGuideAssertion = findRouteAssertion('/welcome?view=carbon-footprint');
const CARBON_GUIDE_SCENARIO = 'carbon-guide-state-machine';
const CODEX_QUERY_KEY = 'codex-e2e-query';
const CODEX_QUERY_VALUE = 'carbon-footprint-guide';
const VIDEO_FILE_NAME = 'platform_usage_process_first_matched.mp4';
const VIDEO_STORAGE_PATH = `/storage/v1/object/sign/sys-files/video/${VIDEO_FILE_NAME}`;
const VIDEO_STORAGE_PATTERN = new RegExp(
  `${VIDEO_STORAGE_PATH.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?:\\?|$)`,
  'u',
);
const productionBackendTarget = readVerifiedProductionBackendTarget();

const GUIDE_COPY_MESSAGE_IDS = [
  'pages.welcome.carbonFootprintGuide.title',
  'pages.welcome.carbonFootprintGuide.intro',
  'pages.welcome.carbonFootprintGuide.videoTitle',
  'pages.welcome.carbonFootprintGuide.workflowTitle',
  'pages.welcome.carbonFootprintGuide.schemaTitle',
  'pages.welcome.carbonFootprintGuide.actions.browsePublicData',
  'pages.welcome.carbonFootprintGuide.actions.enterMyData',
  ...[
    'openHome',
    'createProcess',
    'fillBasics',
    'enterInputsOutputs',
    'selectOrAddFlows',
    'validateAndSubmit',
  ].flatMap((key) => [
    `pages.welcome.carbonFootprintGuide.teachingSteps.${key}.title`,
    `pages.welcome.carbonFootprintGuide.teachingSteps.${key}.description`,
  ]),
  ...['collectRawData', 'mapUnitProcesses', 'checkFlowsAndUnits', 'submitForReview'].flatMap(
    (key) => [
      `pages.welcome.carbonFootprintGuide.preparationItems.${key}.title`,
      `pages.welcome.carbonFootprintGuide.preparationItems.${key}.description`,
    ],
  ),
  ...['model', 'process', 'flow', 'flowProperty', 'unitGroup', 'source', 'contact'].flatMap(
    (key) => [
      `pages.welcome.carbonFootprintGuide.schemaItems.${key}.title`,
      `pages.welcome.carbonFootprintGuide.schemaItems.${key}.description`,
    ],
  ),
] as const;

type MediaOutcome = 'abort' | 'error';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  let settled = false;
  return {
    promise,
    resolve(value) {
      if (!settled) {
        settled = true;
        resolvePromise(value);
      }
    },
  };
}

function guideCandidateUrl(baseURL: string): string {
  const url = new URL(baseURL);
  url.searchParams.set(CODEX_QUERY_KEY, CODEX_QUERY_VALUE);
  url.hash = '/welcome?view=carbon-footprint';
  return url.toString();
}

async function expectGuideLocation(page: Page, locale: (typeof APP_LOCALES)[number]) {
  const current = new URL(page.url());
  const [hashPath, hashQuery = ''] = current.hash.slice(1).split('?');
  expect(current.searchParams.get(CODEX_QUERY_KEY)).toBe(CODEX_QUERY_VALUE);
  expect(hashPath).toBe('/welcome');
  expect(new URLSearchParams(hashQuery).get('view')).toBe('carbon-footprint');
  await expect.poll(() => readStoredAppLocale(page)).toBe(locale);
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

async function expectLocalizedGuideCopy(
  page: Page,
  locale: (typeof APP_LOCALES)[number],
): Promise<void> {
  for (const messageId of GUIDE_COPY_MESSAGE_IDS) {
    await expectExactVisibleText(page, getLocaleMessage(locale, messageId));
  }
  for (const actionMessageId of [
    'pages.welcome.carbonFootprintGuide.actions.browsePublicData',
    'pages.welcome.carbonFootprintGuide.actions.enterMyData',
  ]) {
    await expect(
      page.getByRole('button', {
        name: getLocaleMessage(locale, actionMessageId),
        exact: true,
      }),
    ).toBeEnabled();
  }
}

function signedMediaUrl(locale: (typeof APP_LOCALES)[number], requestNumber: number): string {
  const token = `codex-e2e-${locale}-${requestNumber}`;
  return `/object/sign/sys-files/video/${VIDEO_FILE_NAME}?token=${token}`;
}

async function expectSignedVideo(
  page: Page,
  locale: (typeof APP_LOCALES)[number],
  requestNumber: number,
): Promise<void> {
  const video = page.locator('video');
  const source = video.locator('source');
  await expect(video).toBeVisible();
  await expect(source).toHaveCount(1);
  await expect
    .poll(async () => {
      const sourceUrl = await source.getAttribute('src');
      if (!sourceUrl) {
        return null;
      }
      const parsed = new URL(sourceUrl);
      return {
        pathname: parsed.pathname,
        token: parsed.searchParams.get('token'),
      };
    })
    .toEqual({
      pathname: VIDEO_STORAGE_PATH,
      token: `codex-e2e-${locale}-${requestNumber}`,
    });
}

test.use({ screenshot: 'off', trace: 'off', video: 'off' });

test('carbon footprint guide closes localized media and query semantics', async ({
  baseURL,
  browserName,
  page,
}, testInfo) => {
  test.skip(
    browserName !== PLAYWRIGHT_BROWSER_PROJECTS[0],
    'The Carbon Footprint Guide state matrix runs in Chromium.',
  );
  test.skip(
    process.env.E2E_AUTHENTICATED !== 'true',
    'The protected Carbon Footprint Guide requires explicitly supplied runtime credentials.',
  );
  test.setTimeout(6 * 60_000);
  annotateEvidence(testInfo, carbonFootprintGuideAssertion, CARBON_GUIDE_SCENARIO);
  expect(baseURL).toBeTruthy();

  await signInViaUi(page);

  for (const locale of APP_LOCALES) {
    await test.step(`locale ${locale}`, async () => {
      await page.goto('/#/welcome', { waitUntil: 'domcontentloaded' });

      const initialSignGate = deferred<void>();
      const retrySignGate = deferred<void>();
      const mediaGates = new Map<number, Deferred<MediaOutcome>>();
      const signBodies: unknown[] = [];
      let activeHandlers = 0;
      let cleaningUp = false;
      let signRequestCount = 0;
      let mediaRequestCount = 0;

      const storageHandler = async (route: Route) => {
        activeHandlers += 1;
        try {
          const request = route.request();
          const requestUrl = new URL(request.url());
          expect(requestUrl.origin).toBe(productionBackendTarget.origin);
          expect(requestUrl.pathname).toBe(VIDEO_STORAGE_PATH);
          if (cleaningUp) {
            await route.abort('failed');
            return;
          }

          if (request.method() === 'OPTIONS') {
            expect([...requestUrl.searchParams.keys()]).toEqual([]);
            expect(request.headers()['access-control-request-method']).toBe('POST');
            const requestedHeaders =
              request.headers()['access-control-request-headers']?.toLowerCase() ?? '';
            expect(requestedHeaders).toContain('apikey');
            expect(requestedHeaders).toContain('authorization');
            await route.fulfill({
              body: '',
              headers: {
                'access-control-allow-headers':
                  request.headers()['access-control-request-headers'] ??
                  'authorization, apikey, content-type, x-client-info',
                'access-control-allow-methods': 'GET, POST, OPTIONS',
                'access-control-allow-origin': '*',
              },
              status: 204,
            });
            return;
          }

          if (request.method() === 'POST') {
            expect(request.headers().apikey).toBe(productionBackendTarget.publishableKey);
            expect([...requestUrl.searchParams.keys()]).toEqual([]);
            expect(JSON.parse(request.postData() ?? 'null')).toEqual({ expiresIn: 3600 });
            signRequestCount += 1;
            signBodies.push(JSON.parse(request.postData() ?? 'null'));
            if (signRequestCount === 1) {
              await initialSignGate.promise;
            } else if (signRequestCount === 2) {
              await retrySignGate.promise;
            }
            await route.fulfill({
              body: JSON.stringify({ signedURL: signedMediaUrl(locale, signRequestCount) }),
              contentType: 'application/json',
              headers: { 'access-control-allow-origin': '*' },
              status: 200,
            });
            return;
          }

          if (request.method() === 'GET') {
            expect([...requestUrl.searchParams.keys()]).toEqual(['token']);
            expect(requestUrl.searchParams.get('token')).toBe(
              `codex-e2e-${locale}-${mediaRequestCount + 1}`,
            );
            mediaRequestCount += 1;
            const gate = deferred<MediaOutcome>();
            mediaGates.set(mediaRequestCount, gate);
            const outcome = await gate.promise;
            if (outcome === 'error') {
              await route.fulfill({
                body: JSON.stringify({ message: 'codex-e2e forced media failure' }),
                contentType: 'application/json',
                status: 404,
              });
            } else {
              await route.abort('failed');
            }
            return;
          }

          await route.abort('blockedbyclient');
        } finally {
          activeHandlers -= 1;
        }
      };

      await page.route(VIDEO_STORAGE_PATTERN, storageHandler);
      try {
        await page.goto(guideCandidateUrl(baseURL!), { waitUntil: 'domcontentloaded' });
        await expect.poll(() => signRequestCount).toBe(1);

        // Use the mounted product selector while the signed-URL request is deliberately pending.
        // This proves that locale switching keeps both the outer query and hash view query intact.
        await selectAppLocaleThroughUi(page, locale);
        await expectGuideLocation(page, locale);
        await expectExactVisibleText(
          page,
          getLocaleMessage(locale, 'pages.welcome.carbonFootprintGuide.videoLoading'),
        );
        await expectLocalizedGuideCopy(page, locale);
        expect(signBodies).toEqual([{ expiresIn: 3600 }]);

        initialSignGate.resolve();
        await expect.poll(() => mediaRequestCount).toBe(1);
        await expectSignedVideo(page, locale, 1);
        await expect(page.getByRole('alert')).toHaveCount(0);

        mediaGates.get(1)?.resolve('error');
        const mediaAlert = page.getByRole('alert');
        await expect(mediaAlert).toContainText(
          getLocaleMessage(locale, 'pages.welcome.carbonFootprintGuide.videoLoadErrorTitle'),
        );
        await expect(mediaAlert).toContainText(
          getLocaleMessage(locale, 'pages.welcome.carbonFootprintGuide.videoLoadErrorDescription'),
        );
        const retryButton = page.getByRole('button', {
          name: getLocaleMessage(locale, 'pages.welcome.carbonFootprintGuide.videoReload'),
          exact: true,
        });
        await expect(retryButton).toBeEnabled();

        await retryButton.click();
        await expect.poll(() => signRequestCount).toBe(2);
        await expectExactVisibleText(
          page,
          getLocaleMessage(locale, 'pages.welcome.carbonFootprintGuide.videoLoading'),
        );
        expect(signBodies).toEqual([{ expiresIn: 3600 }, { expiresIn: 3600 }]);

        retrySignGate.resolve();
        await expect.poll(() => mediaRequestCount).toBe(2);
        await expectSignedVideo(page, locale, 2);
        await expect(page.getByRole('alert')).toHaveCount(0);
        await expectGuideLocation(page, locale);

        // Finish the pending retry media request before refresh. The refreshed view issues a new
        // exact signed-URL request and renders the video again while retaining locale and queries.
        mediaGates.get(2)?.resolve('abort');
        await expect(mediaAlert).toBeVisible();
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect.poll(() => signRequestCount).toBe(3);
        await expect.poll(() => mediaRequestCount).toBe(3);
        await expectSignedVideo(page, locale, 3);
        await expectGuideLocation(page, locale);
        await expectLocalizedGuideCopy(page, locale);
        expect(signBodies).toEqual([{ expiresIn: 3600 }, { expiresIn: 3600 }, { expiresIn: 3600 }]);
      } finally {
        cleaningUp = true;
        initialSignGate.resolve();
        retrySignGate.resolve();
        for (const gate of mediaGates.values()) {
          gate.resolve('abort');
        }
        await expect.poll(() => activeHandlers).toBe(0);
        await page.unroute(VIDEO_STORAGE_PATTERN, storageHandler);
      }
    });
  }
});
