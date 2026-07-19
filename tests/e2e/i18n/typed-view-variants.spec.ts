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
  spaLocationToCandidateUrl,
  type SpaLocationTarget,
} from './contracts';
import { readVerifiedProductionBackendTarget } from './production-backend-target';
import { readProductionDataLedger } from './production-data-ledger';
import { assertAuditedSyntheticReadRequest } from './production-request-guard';

const dataProcessingAssertion = findRouteAssertion('/data-processing');
const processAssertion = findRouteAssertion('/mydata/processes');
const productionBackendTarget = readVerifiedProductionBackendTarget();
const ROLES_API_PATTERN = '**/rest/v1/roles?*';
const WORKER_JOBS_API_PATTERN = '**/functions/v1/app_worker_jobs*';
const DATA_PRODUCT_COMMANDS_API_PATTERN = '**/functions/v1/app_data_product_commands*';

const DATA_PROCESSING_VARIANTS = [
  {
    assertionId: 'vv.data-processing.builds',
    id: 'builds',
    markerMessageId: 'pages.dataProcessing.form.packageName',
    markerRole: 'textbox',
    tabMessageId: 'pages.dataProcessing.tabs.builds',
  },
  {
    assertionId: 'vv.data-processing.preview',
    id: 'preview',
    markerMessageId: 'pages.dataProcessing.form.previewPackageId',
    markerRole: 'combobox',
    tabMessageId: 'pages.dataProcessing.tabs.preview',
  },
  {
    assertionId: 'vv.data-processing.publication',
    id: 'publication',
    markerMessageId: 'pages.dataProcessing.form.publishPackageId',
    markerRole: 'combobox',
    tabMessageId: 'pages.dataProcessing.tabs.publication',
  },
] as const;
const PROCESS_MODE_VARIANTS = [
  { assertionId: 'vv.process.drawer-edit', mode: 'edit' },
  { assertionId: 'vv.process.drawer-view', mode: 'view' },
] as const;
const PROCESS_REQUIRED_VARIANTS = [
  { assertionId: 'vv.process.required-optional', required: 'optional' },
  { assertionId: 'vv.process.required-enabled', required: 'required' },
] as const;

function readSpaLocation(page: Page): SpaLocationTarget {
  const hash = new URL(page.url()).hash.slice(1);
  const queryStart = hash.indexOf('?');
  return {
    hashPath: queryStart >= 0 ? hash.slice(0, queryStart) : hash,
    hashQuery: Object.fromEntries(
      new URLSearchParams(queryStart >= 0 ? hash.slice(queryStart + 1) : '').entries(),
    ),
  };
}

async function expectSpaLocation(page: Page, expected: SpaLocationTarget): Promise<void> {
  await expect.poll(() => readSpaLocation(page)).toEqual(expected);
}

async function fallbackVerifiedPreflight(route: Route, pathname: string): Promise<boolean> {
  if (route.request().method() !== 'OPTIONS') {
    return false;
  }
  const target = new URL(route.request().url());
  expect(target.origin).toBe(productionBackendTarget.origin);
  expect(target.pathname).toBe(pathname);
  expect(route.request().headers()['access-control-request-headers']).toContain('apikey');
  await route.fallback();
  return true;
}

async function fulfillDataProductManagerRole(route: Route): Promise<boolean> {
  if (await fallbackVerifiedPreflight(route, '/rest/v1/roles')) return false;
  const requestTarget = new URL(route.request().url());
  const userFilter = requestTarget.searchParams.get('user_id') ?? '';
  expect(userFilter).toMatch(/^eq\.[0-9a-f-]+$/iu);
  const target = assertAuditedSyntheticReadRequest(route.request(), {
    expectedOrigin: productionBackendTarget.origin,
    expectedPublishableKey: productionBackendTarget.publishableKey,
    method: 'GET',
    pathname: '/rest/v1/roles',
    searchParams: {
      select: 'user_id,role',
      team_id: 'eq.00000000-0000-0000-0000-000000000000',
      user_id: userFilter,
    },
  });
  const userId = target.searchParams.get('user_id')!.slice(3);
  await route.fulfill({
    // Shape a synthetic one-row read response for deterministic UI-state coverage only;
    // this does not claim that the supplied account has production manager authorization.
    body: JSON.stringify([{ role: 'data_product_manager', user_id: userId }]),
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'content-range',
      'content-range': '0-0/1',
    },
    status: 200,
  });
  return true;
}

type AuditedWorkerReadKind = 'lca-job' | 'lcia-package-job' | 'lcia-result-build' | 'review-submit';

function hasExactKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())
  );
}

async function fulfillEmptyBuildJobs(route: Route): Promise<AuditedWorkerReadKind | undefined> {
  if (await fallbackVerifiedPreflight(route, '/functions/v1/app_worker_jobs')) return undefined;
  const body = JSON.parse(route.request().postData() ?? '');
  const expectedPackageStatuses = [
    'queued',
    'running',
    'waiting',
    'completed',
    'blocked',
    'stale',
    'failed',
    'cancelled',
  ];
  const isLciaResultBuildRead =
    hasExactKeys(body, ['action', 'limit', 'subjectType', 'visibility']) &&
    body.action === 'list' &&
    body.limit === 50 &&
    body.subjectType === 'lcia_result_build' &&
    body.visibility === 'operator';
  const isLcaPackageJobRead =
    hasExactKeys(body, ['action', 'limit', 'statuses', 'subjectType']) &&
    body.action === 'list' &&
    body.limit === 30 &&
    body.subjectType === 'lca_package_job' &&
    JSON.stringify(body.statuses) === JSON.stringify(expectedPackageStatuses);
  const isLcaJobRead =
    hasExactKeys(body, ['action', 'limit', 'statuses', 'subjectType']) &&
    body.action === 'list' &&
    body.limit === 30 &&
    body.subjectType === 'lca_job' &&
    JSON.stringify(body.statuses) === JSON.stringify(expectedPackageStatuses);
  const isReviewSubmitRead =
    hasExactKeys(body, ['action', 'limit', 'subjectType']) &&
    body.action === 'list' &&
    body.limit === 50 &&
    body.subjectType === 'processes';
  const readKind: AuditedWorkerReadKind | undefined = isLciaResultBuildRead
    ? 'lcia-result-build'
    : isLcaPackageJobRead
      ? 'lcia-package-job'
      : isLcaJobRead
        ? 'lca-job'
        : isReviewSubmitRead
          ? 'review-submit'
          : undefined;
  expect(readKind, 'Only four exact audited worker list bodies may be fulfilled.').toBeTruthy();
  const expectedBody =
    readKind === 'lcia-result-build'
      ? { action: 'list', limit: 50, subjectType: 'lcia_result_build', visibility: 'operator' }
      : readKind === 'lcia-package-job'
        ? {
            action: 'list',
            limit: 30,
            statuses: expectedPackageStatuses,
            subjectType: 'lca_package_job',
          }
        : readKind === 'lca-job'
          ? {
              action: 'list',
              limit: 30,
              statuses: expectedPackageStatuses,
              subjectType: 'lca_job',
            }
          : { action: 'list', limit: 50, subjectType: 'processes' };
  expect(body).toEqual(expectedBody);
  assertAuditedSyntheticReadRequest(route.request(), {
    expectedOrigin: productionBackendTarget.origin,
    expectedPublishableKey: productionBackendTarget.publishableKey,
    jsonBody: expectedBody,
    method: 'POST',
    pathname: '/functions/v1/app_worker_jobs',
    searchParams: { forceFunctionRegion: 'us-east-1' },
  });
  await route.fulfill({
    body: JSON.stringify({ command: 'worker_jobs_list', data: [] }),
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    status: 200,
  });
  return readKind;
}

async function fulfillEmptyPublications(route: Route): Promise<boolean> {
  if (await fallbackVerifiedPreflight(route, '/functions/v1/app_data_product_commands')) {
    return false;
  }
  const body = {
    action: 'list_publications',
    limit: 50,
  };
  assertAuditedSyntheticReadRequest(route.request(), {
    expectedOrigin: productionBackendTarget.origin,
    expectedPublishableKey: productionBackendTarget.publishableKey,
    jsonBody: body,
    method: 'POST',
    pathname: '/functions/v1/app_data_product_commands',
    searchParams: { forceFunctionRegion: 'us-east-1' },
  });
  await route.fulfill({
    body: JSON.stringify({ data: [], ok: true }),
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    status: 200,
  });
  return true;
}

async function expectSelectedDataProcessingTab(
  page: Page,
  locale: (typeof APP_LOCALES)[number],
  variant: (typeof DATA_PROCESSING_VARIANTS)[number],
): Promise<void> {
  const tab = page.getByRole('tab', {
    name: getLocaleMessage(locale, variant.tabMessageId),
    exact: true,
  });
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  const markerName = getLocaleMessage(locale, variant.markerMessageId);
  const marker =
    variant.markerRole === 'textbox'
      ? page.getByRole('textbox', { name: markerName, exact: true })
      : page.getByRole('combobox', { name: markerName, exact: true });
  await expect(marker).toBeVisible();
  await expect(page.locator("[data-testid='access-denied']")).toHaveCount(0);
}

test('Data Processing typed tabs survive locale switches and reloads', async ({
  baseURL,
  browserName,
  page,
}, testInfo) => {
  test.skip(
    browserName !== PLAYWRIGHT_BROWSER_PROJECTS[0],
    'Typed view variants execute once in Chromium.',
  );
  test.skip(
    process.env.E2E_AUTHENTICATED !== 'true',
    'Data Processing typed tabs require an authenticated browser session.',
  );
  test.setTimeout(8 * 60_000);
  annotateEvidence(testInfo, dataProcessingAssertion, 'typed-data-processing-tabs');
  expect(baseURL).toBeTruthy();
  await signInViaUi(page);
  let fulfilledRoleReads = 0;
  await page.route(ROLES_API_PATTERN, async (route) => {
    if (await fulfillDataProductManagerRole(route)) {
      fulfilledRoleReads += 1;
    }
  });
  const fulfilledWorkerReads: Record<AuditedWorkerReadKind, number> = {
    'lca-job': 0,
    'lcia-package-job': 0,
    'lcia-result-build': 0,
    'review-submit': 0,
  };
  await page.route(WORKER_JOBS_API_PATTERN, async (route) => {
    const readKind = await fulfillEmptyBuildJobs(route);
    if (readKind) {
      fulfilledWorkerReads[readKind] += 1;
    }
  });
  let fulfilledPublicationReads = 0;
  await page.route(DATA_PRODUCT_COMMANDS_API_PATTERN, async (route) => {
    if (await fulfillEmptyPublications(route)) {
      fulfilledPublicationReads += 1;
    }
  });
  const readFulfilledRoleReads = () => fulfilledRoleReads;
  const readFulfilledPublicationReads = () => fulfilledPublicationReads;

  try {
    for (const variant of DATA_PROCESSING_VARIANTS) {
      const location = {
        hashPath: '/data-processing',
        hashQuery: { tab: variant.id },
      } satisfies SpaLocationTarget;
      for (const locale of APP_LOCALES) {
        // The mutable counter is the intentional closure proving each full navigation
        // executed a fresh, exact synthetic role read before the gated UI is asserted.
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        await test.step(`${variant.id} ${locale}`, async () => {
          const roleReadsBeforeNavigation = fulfilledRoleReads;
          const publicationReadsBeforeNavigation = fulfilledPublicationReads;
          await page.goto(spaLocationToCandidateUrl(baseURL!, location), {
            waitUntil: 'domcontentloaded',
          });
          // Hash-only page.goto is a same-document navigation from the signed-in app. Force
          // a document reload so initial-state role resolution runs through the exact mock.
          await page.reload({ waitUntil: 'domcontentloaded' });
          await expect.poll(readFulfilledRoleReads).toBeGreaterThan(roleReadsBeforeNavigation);
          await expect(page.locator("[data-testid='access-denied']")).toHaveCount(0);
          await selectAppLocaleThroughUi(page, locale);
          await expect.poll(() => readStoredAppLocale(page)).toBe(locale);
          await expectSpaLocation(page, location);
          await expect(page.locator("[data-testid='access-denied']")).toHaveCount(0);
          await expectSelectedDataProcessingTab(page, locale, variant);
          if (variant.id === 'publication') {
            await expect
              .poll(readFulfilledPublicationReads)
              .toBeGreaterThan(publicationReadsBeforeNavigation);
          }

          await page.reload({ waitUntil: 'domcontentloaded' });
          await expectSpaLocation(page, location);
          await expect.poll(() => readStoredAppLocale(page)).toBe(locale);
          await expectSelectedDataProcessingTab(page, locale, variant);
        });
      }
    }
    expect(fulfilledWorkerReads['lca-job']).toBeGreaterThan(0);
    expect(fulfilledWorkerReads['lcia-result-build']).toBeGreaterThan(0);
    expect(fulfilledWorkerReads['lcia-package-job']).toBeGreaterThan(0);
    expect(fulfilledWorkerReads['review-submit']).toBeGreaterThan(0);
  } finally {
    // Closing the page aborts all mounted effects before the context-level production guard
    // performs its final no-blocked-request assertion.
    await page.close();
  }
});

async function expectProcessDrawer(
  page: Page,
  locale: (typeof APP_LOCALES)[number],
  mode: 'edit' | 'view',
  required: 'optional' | 'required' | undefined,
): Promise<void> {
  const titleMessageId = `pages.process.drawer.title.${mode}`;
  const drawer = page.locator('.ant-drawer-content:visible').filter({
    has: page.getByText(getLocaleMessage(locale, titleMessageId), { exact: true }),
  });
  await expect(drawer).toHaveCount(1);
  await expect(drawer).toBeVisible();
  const state = drawer.getByTestId('process-deep-link-state');
  await expect(state).toHaveAttribute('data-route-mode', mode);
  if (required) {
    await expect(state).toHaveAttribute('data-auto-check-required', required);
  } else {
    await expect(state).not.toHaveAttribute('data-auto-check-required');
  }
}

test('Process edit and view deep links survive locale switches and reloads', async ({
  baseURL,
  browserName,
  page,
}, testInfo) => {
  test.skip(
    browserName !== PLAYWRIGHT_BROWSER_PROJECTS[0] ||
      process.env.E2E_AUTHENTICATED !== 'true' ||
      process.env.E2E_ALLOW_PRODUCTION_DATA !== 'true',
    'Process typed drawer modes require the exact read-only global production ledger.',
  );
  test.setTimeout(10 * 60_000);
  annotateEvidence(testInfo, processAssertion, 'typed-process-drawer-mode');
  const ledger = await readProductionDataLedger();
  expect(ledger).toBeTruthy();
  expect(baseURL).toBeTruthy();
  await signInViaUi(page);

  for (const { mode } of PROCESS_MODE_VARIANTS) {
    const location = {
      hashPath: '/mydata/processes',
      hashQuery: { id: ledger!.id, mode, version: ledger!.version },
    } satisfies SpaLocationTarget;
    for (const locale of APP_LOCALES) {
      await test.step(`${mode} ${locale}`, async () => {
        await page.goto(spaLocationToCandidateUrl(baseURL!, location), {
          waitUntil: 'domcontentloaded',
        });
        await selectAppLocaleThroughUi(page, locale, { forceTrigger: true });
        await expectSpaLocation(page, location);
        await expect.poll(() => readStoredAppLocale(page)).toBe(locale);
        await expectProcessDrawer(page, locale, mode, mode === 'edit' ? 'optional' : undefined);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await expectSpaLocation(page, location);
        await expectProcessDrawer(page, locale, mode, mode === 'edit' ? 'optional' : undefined);
      });
    }
  }
});

test('Process required deep-link state is explicit and reload-stable', async ({
  baseURL,
  browserName,
  page,
}, testInfo) => {
  test.skip(
    browserName !== PLAYWRIGHT_BROWSER_PROJECTS[0] ||
      process.env.E2E_AUTHENTICATED !== 'true' ||
      process.env.E2E_ALLOW_PRODUCTION_DATA !== 'true',
    'Process required-state variants require the exact read-only global production ledger.',
  );
  test.setTimeout(10 * 60_000);
  annotateEvidence(testInfo, processAssertion, 'typed-process-required-state');
  const ledger = await readProductionDataLedger();
  expect(ledger).toBeTruthy();
  expect(baseURL).toBeTruthy();
  await signInViaUi(page);

  for (const { required } of PROCESS_REQUIRED_VARIANTS) {
    const hashQuery: Record<string, string> = {
      id: ledger!.id,
      mode: 'edit',
      version: ledger!.version,
    };
    if (required === 'required') {
      hashQuery.required = '1';
    }
    const location = { hashPath: '/mydata/processes', hashQuery } satisfies SpaLocationTarget;
    for (const locale of APP_LOCALES) {
      await test.step(`${required} ${locale}`, async () => {
        await page.goto(spaLocationToCandidateUrl(baseURL!, location), {
          waitUntil: 'domcontentloaded',
        });
        await selectAppLocaleThroughUi(page, locale, { forceTrigger: true });
        await expectSpaLocation(page, location);
        await expect.poll(() => readStoredAppLocale(page)).toBe(locale);
        await expectProcessDrawer(page, locale, 'edit', required);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await expectSpaLocation(page, location);
        await expectProcessDrawer(page, locale, 'edit', required);
      });
    }
  }
});
