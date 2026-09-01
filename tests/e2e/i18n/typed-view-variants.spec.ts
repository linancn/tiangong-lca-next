import { expect, test, type Locator, type Page, type Route } from './fixtures';

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
import {
  assertExactReadOnlyProcessValidationDraft,
  PROCESS_SAVE_DRAFT_PATH,
  PROCESS_SAVE_DRAFT_ROUTE_PATTERN,
} from './typed-view-readonly-fixture';

test.use({ semanticPersona: 'data_product_manager' });

const dataProcessingAssertion = findRouteAssertion('/data-processing');
const processAssertion = findRouteAssertion('/mydata/processes');
const productionBackendTarget = readVerifiedProductionBackendTarget();
const MEMBERSHIP_RPC_PATTERN = '**/rest/v1/rpc/qry_membership_get_mine';
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
  if (await fallbackVerifiedPreflight(route, '/rest/v1/rpc/qry_membership_get_mine')) return false;
  assertAuditedSyntheticReadRequest(route.request(), {
    expectedOrigin: productionBackendTarget.origin,
    expectedPublishableKey: productionBackendTarget.publishableKey,
    jsonBody: {},
    method: 'POST',
    pathname: '/rest/v1/rpc/qry_membership_get_mine',
    searchParams: {},
  });
  await route.fulfill({
    // Shape a synthetic one-row read response for deterministic UI-state coverage only;
    // this does not claim that the supplied account has production manager authorization.
    body: JSON.stringify([
      {
        role: 'data_product_manager',
        team_id: '00000000-0000-0000-0000-000000000000',
        user_id: '70400000-0000-4000-8000-000000000704',
      },
    ]),
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

type AuditedWorkerReadKind = 'lca-job' | 'lcia-package-job' | 'lcia-result-build';

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
  const readKind: AuditedWorkerReadKind | undefined = isLciaResultBuildRead
    ? 'lcia-result-build'
    : isLcaPackageJobRead
      ? 'lcia-package-job'
      : isLcaJobRead
        ? 'lca-job'
        : undefined;
  expect(readKind, 'Only three exact audited worker list bodies may be fulfilled.').toBeTruthy();
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
        : {
            action: 'list',
            limit: 30,
            statuses: expectedPackageStatuses,
            subjectType: 'lca_job',
          };
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

type AuditedDataProductReadKind = 'publications' | 'result-sets' | 'task-feed';
const SYNTHETIC_RESULT_SET_ID = '77777777-7777-4777-8777-777777777777';

async function fulfillEmptyDataProductRead(
  route: Route,
): Promise<AuditedDataProductReadKind | undefined> {
  if (await fallbackVerifiedPreflight(route, '/functions/v1/app_data_product_commands')) {
    return undefined;
  }
  const requestBody = route.request().postDataJSON() as unknown;
  const isTaskFeedRead =
    typeof requestBody === 'object' &&
    requestBody !== null &&
    !Array.isArray(requestBody) &&
    (requestBody as Record<string, unknown>).action === 'list_task_feed';
  const isResultSetRead =
    typeof requestBody === 'object' &&
    requestBody !== null &&
    !Array.isArray(requestBody) &&
    (requestBody as Record<string, unknown>).action === 'list_result_sets';
  const body = isTaskFeedRead
    ? {
        action: 'list_task_feed',
        category: 'data_product',
        jobKinds: ['lcia.scope_closure_check', 'lcia_result.package_build'],
        limit: 200,
        rootOnly: false,
      }
    : isResultSetRead
      ? { action: 'list_result_sets', limit: 200 }
      : {
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
    body: JSON.stringify({
      data: isTaskFeedRead
        ? { items: [] }
        : isResultSetRead
          ? {
              items: [
                {
                  schemaVersion: 'lcia.result-set.v1',
                  resultSetId: SYNTHETIC_RESULT_SET_ID,
                  name: 'Semantic qualification result set',
                  createdAt: '2026-08-17T00:00:00.000Z',
                },
              ],
            }
          : [],
      ok: true,
    }),
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    status: 200,
  });
  return isTaskFeedRead ? 'task-feed' : isResultSetRead ? 'result-sets' : 'publications';
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
  await page.route(MEMBERSHIP_RPC_PATTERN, async (route) => {
    if (await fulfillDataProductManagerRole(route)) {
      fulfilledRoleReads += 1;
    }
  });
  const fulfilledWorkerReads: Record<AuditedWorkerReadKind, number> = {
    'lca-job': 0,
    'lcia-package-job': 0,
    'lcia-result-build': 0,
  };
  await page.route(WORKER_JOBS_API_PATTERN, async (route) => {
    const readKind = await fulfillEmptyBuildJobs(route);
    if (readKind) {
      fulfilledWorkerReads[readKind] += 1;
    }
  });
  const fulfilledDataProductReads: Record<AuditedDataProductReadKind, number> = {
    publications: 0,
    'result-sets': 0,
    'task-feed': 0,
  };
  await page.route(DATA_PRODUCT_COMMANDS_API_PATTERN, async (route) => {
    const readKind = await fulfillEmptyDataProductRead(route);
    if (readKind) {
      fulfilledDataProductReads[readKind] += 1;
    }
  });
  const readFulfilledRoleReads = () => fulfilledRoleReads;
  const readFulfilledPublicationReads = () => fulfilledDataProductReads.publications;

  try {
    for (const variant of DATA_PROCESSING_VARIANTS) {
      const location = {
        hashPath: '/data-processing',
        hashQuery: { resultSetId: SYNTHETIC_RESULT_SET_ID, tab: variant.id },
      } satisfies SpaLocationTarget;
      for (const locale of APP_LOCALES) {
        // The mutable counter is the intentional closure proving each full navigation
        // executed a fresh, exact synthetic role read before the gated UI is asserted.
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        await test.step(`${variant.id} ${locale}`, async () => {
          const roleReadsBeforeNavigation = fulfilledRoleReads;
          const publicationReadsBeforeNavigation = fulfilledDataProductReads.publications;
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
    expect(fulfilledWorkerReads['lcia-result-build']).toBe(0);
    expect(fulfilledWorkerReads['lcia-package-job']).toBeGreaterThan(0);
    expect(fulfilledDataProductReads['task-feed']).toBeGreaterThan(0);
    expect(fulfilledDataProductReads['result-sets']).toBeGreaterThan(0);
  } finally {
    // Closing the page aborts all mounted effects before the context-level production guard
    // performs its final no-blocked-request assertion.
    await page.close();
  }
});

async function expectProcessDrawerMounted(
  page: Page,
  mode: 'edit' | 'view',
  required: 'optional' | 'required' | undefined,
): Promise<Locator> {
  const state = page.getByTestId('process-deep-link-state');
  await expect(state).toBeAttached();
  await expect(state).toHaveAttribute('data-route-mode', mode);
  if (required) {
    await expect(state).toHaveAttribute('data-auto-check-required', required);
  } else {
    await expect(state).not.toHaveAttribute('data-auto-check-required');
  }
  const drawer = page.locator('.tg-process-drawer:visible').filter({ has: state });
  await expect(drawer).toHaveCount(1);
  await expect(drawer).toBeVisible();
  await expect(state).toHaveAttribute('data-detail-ready', 'true');
  return drawer;
}

async function expectProcessDrawer(
  page: Page,
  locale: (typeof APP_LOCALES)[number],
  mode: 'edit' | 'view',
  required: 'optional' | 'required' | undefined,
): Promise<void> {
  const drawer = await expectProcessDrawerMounted(page, mode, required);
  await expect(
    drawer.getByText(getLocaleMessage(locale, `pages.process.drawer.title.${mode}`), {
      exact: true,
    }),
  ).toBeVisible();
}

async function expectNativeOptionsRemainHorizontal(page: Page, tableRoot: Locator): Promise<void> {
  await expect(tableRoot).toHaveCount(1);
  const table = tableRoot.locator('table').filter({ visible: true }).first();
  await expect(table).toBeVisible();

  // Native ProTable options are currently non-focusable spans in the upstream beta. Scope the
  // visual check through the project-owned table root, then select only visible SVG controls
  // positioned above the table. Read every rectangle in one browser evaluation so a Drawer
  // transition cannot compare controls sampled from different animation frames. Visual order,
  // rather than upstream DOM order, owns the horizontal non-overlap contract.
  const readGeometry = () =>
    tableRoot.evaluate((element) => {
      const round = (value: number) => Math.round(value * 1_000) / 1_000;
      const isVisible = (candidate: Element) => {
        const bounds = candidate.getBoundingClientRect();
        const style = getComputedStyle(candidate);
        return (
          bounds.width > 0 &&
          bounds.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        );
      };
      const tableElement = Array.from(element.querySelectorAll('table')).find(isVisible);
      if (!tableElement) {
        return {
          aligned: false,
          contained: false,
          leftmostSvgIndex: -1,
          nonOverlapping: false,
          optionBoxes: [],
          optionCount: 0,
        };
      }

      const rootBounds = element.getBoundingClientRect();
      const tableBounds = tableElement.getBoundingClientRect();
      const optionBoxes = Array.from(element.querySelectorAll('svg'))
        .map((icon, svgIndex) => ({ bounds: icon.getBoundingClientRect(), icon, svgIndex }))
        .filter(
          ({ bounds, icon }) => isVisible(icon) && bounds.y + bounds.height / 2 < tableBounds.y,
        )
        .map(({ bounds, svgIndex }) => ({
          bottom: bounds.bottom,
          height: bounds.height,
          left: bounds.left,
          right: bounds.right,
          svgIndex,
          top: bounds.top,
          width: bounds.width,
        }))
        .sort((left, right) => left.left - right.left);
      const centers = optionBoxes.map(({ height, top }) => top + height / 2);

      return {
        aligned: centers.length > 0 && Math.max(...centers) - Math.min(...centers) <= 1,
        contained: optionBoxes.every(
          ({ left, right }) => left >= rootBounds.left - 1 && right <= rootBounds.right + 1,
        ),
        leftmostSvgIndex: optionBoxes[0]?.svgIndex ?? -1,
        nonOverlapping: optionBoxes.every(
          ({ left }, index) => index === 0 || left >= optionBoxes[index - 1]!.right - 1,
        ),
        optionBoxes: optionBoxes.map(({ bottom, left, right, top }) => ({
          bottom: round(bottom),
          left: round(left),
          right: round(right),
          top: round(top),
        })),
        optionCount: optionBoxes.length,
      };
    });

  await expect.poll(readGeometry).toMatchObject({
    aligned: true,
    contained: true,
    nonOverlapping: true,
    optionCount: 3,
  });
  const { leftmostSvgIndex } = await readGeometry();
  expect(leftmostSvgIndex).toBeGreaterThanOrEqual(0);

  await tableRoot.locator('svg').nth(leftmostSvgIndex).hover();
  await expect(page.getByRole('tooltip').filter({ visible: true })).toContainText(/\S/u);
  await page.mouse.move(0, 0);
}

async function expectProcessViewNativeOptionsRemainHorizontal(
  page: Page,
  drawer: Locator,
): Promise<void> {
  for (const tableClassName of ['.tg-process-view-input-table', '.tg-process-view-output-table']) {
    await expectNativeOptionsRemainHorizontal(
      page,
      drawer.locator(tableClassName).filter({ visible: true }),
    );
  }
}

async function expectNarrowFlowSelectorRemainsContained(
  page: Page,
  processDrawer: Locator,
  locale: (typeof APP_LOCALES)[number],
): Promise<void> {
  const previousViewport = page.viewportSize();
  await page.setViewportSize({ height: 844, width: 390 });

  try {
    await processDrawer
      .getByRole('tab', {
        name: getLocaleMessage(locale, 'pages.process.view.exchanges'),
        exact: true,
      })
      .click();
    const inputExchangeTable = processDrawer
      .locator('.process-exchange-table')
      .filter({ visible: true })
      .first();
    await inputExchangeTable
      .getByRole('button', {
        name: getLocaleMessage(locale, 'pages.button.create'),
        exact: true,
      })
      .click();

    const exchangeDrawer = page.getByRole('dialog', {
      name: getLocaleMessage(locale, 'pages.process.exchange.drawer.title.create'),
      exact: true,
    });
    await expect(exchangeDrawer).toBeVisible();
    const flowInput = exchangeDrawer.getByRole('textbox', {
      name: getLocaleMessage(locale, 'pages.process.view.exchange.refObjectId'),
      exact: true,
    });
    await expect(flowInput).toBeVisible();
    await expect(flowInput).toBeDisabled();
    await expect
      .poll(async () => {
        const [drawerBox, inputBox] = await Promise.all([
          exchangeDrawer.boundingBox(),
          flowInput.boundingBox(),
        ]);
        return Boolean(
          drawerBox &&
          inputBox &&
          drawerBox.x >= -1 &&
          drawerBox.x + drawerBox.width <= 391 &&
          inputBox.x >= drawerBox.x - 1 &&
          inputBox.x + inputBox.width <= drawerBox.x + drawerBox.width + 1 &&
          inputBox.x + inputBox.width <= 391,
        );
      })
      .toBe(true);

    await exchangeDrawer
      .getByRole('button', {
        name: getLocaleMessage(locale, 'pages.button.select'),
        exact: true,
      })
      .first()
      .click();
    const flowDrawer = page.getByRole('dialog', {
      name: getLocaleMessage(locale, 'pages.flow.drawer.title.select'),
      exact: true,
    });
    await expect(flowDrawer).toBeVisible();
    const selectorTable = flowDrawer
      .locator('.tg-dataset-selector-table')
      .filter({ visible: true });
    await expectNativeOptionsRemainHorizontal(page, selectorTable);

    const containment = await selectorTable.evaluate((element) => {
      const rootBounds = element.getBoundingClientRect();
      const internalScroller = Array.from(element.querySelectorAll<HTMLElement>('*')).find(
        (candidate) => {
          const style = getComputedStyle(candidate);
          return (
            candidate.clientWidth > 0 &&
            candidate.scrollWidth > candidate.clientWidth + 1 &&
            (style.overflowX === 'auto' || style.overflowX === 'scroll')
          );
        },
      );
      if (internalScroller) internalScroller.scrollLeft = internalScroller.scrollWidth;
      return {
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        rootLeft: rootBounds.left,
        rootRight: rootBounds.right,
        scrollerClientWidth: internalScroller?.clientWidth ?? 0,
        scrollerLeft: internalScroller?.scrollLeft ?? 0,
        scrollerScrollWidth: internalScroller?.scrollWidth ?? 0,
        viewportWidth: window.innerWidth,
      };
    });
    expect(containment.documentScrollWidth).toBeLessThanOrEqual(
      containment.documentClientWidth + 1,
    );
    expect(containment.rootLeft).toBeGreaterThanOrEqual(-1);
    expect(containment.rootRight).toBeLessThanOrEqual(containment.viewportWidth + 1);
    expect(containment.scrollerScrollWidth).toBeGreaterThan(containment.scrollerClientWidth);
    expect(containment.scrollerLeft).toBeGreaterThan(0);

    await flowDrawer
      .getByRole('button', {
        name: getLocaleMessage(locale, 'pages.button.cancel'),
        exact: true,
      })
      .click();
    await expect(flowDrawer).toBeHidden();
    await exchangeDrawer
      .getByRole('button', {
        name: getLocaleMessage(locale, 'pages.button.cancel'),
        exact: true,
      })
      .click();
    await expect(exchangeDrawer).toBeHidden();
  } finally {
    if (previousViewport) await page.setViewportSize(previousViewport);
  }
}

async function expectProcessDeepLinkMountSettled(input: {
  expectedLocation: SpaLocationTarget;
  page: Page;
  readTrappedValidationDrafts: () => number;
  required: 'optional' | 'required';
  trappedValidationDraftsBeforeMount: number;
}): Promise<void> {
  const {
    expectedLocation,
    page,
    readTrappedValidationDrafts,
    required,
    trappedValidationDraftsBeforeMount,
  } = input;
  await expectSpaLocation(page, expectedLocation);
  await expect(page.locator('.tg-global-header-avatar-trigger')).toBeAttached();
  await expect(page.locator('.tg-global-language-selector')).toBeVisible();

  const state = page.getByTestId('process-deep-link-state');
  await expect(state).toBeAttached();
  await expect(state).toHaveAttribute('data-route-mode', 'edit');
  await expect(state).toHaveAttribute('data-auto-check-required', required);
  const drawer = page.locator('.tg-process-drawer:visible').filter({ has: state });
  await expect(drawer).toHaveCount(1);
  await expect(drawer).toBeVisible();

  if (required === 'required') {
    await expect
      .poll(readTrappedValidationDrafts)
      .toBeGreaterThan(trappedValidationDraftsBeforeMount);
  }
  await expect(state).toHaveAttribute('data-detail-ready', 'true');
  if (required === 'optional') {
    expect(readTrappedValidationDrafts()).toBe(trappedValidationDraftsBeforeMount);
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
      (process.env.E2E_QUALIFICATION !== 'true' &&
        process.env.E2E_ALLOW_PRODUCTION_DATA !== 'true'),
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
        await expectSpaLocation(page, location);
        await expectProcessDrawerMounted(page, mode, mode === 'edit' ? 'optional' : undefined);
        await selectAppLocaleThroughUi(page, locale, { forceTrigger: true });
        await expectSpaLocation(page, location);
        await expect.poll(() => readStoredAppLocale(page)).toBe(locale);
        await expectProcessDrawer(page, locale, mode, mode === 'edit' ? 'optional' : undefined);

        if (mode === 'edit' && locale === 'en-US') {
          await test.step('narrow Flow selector stays inside its nested Drawer', async () => {
            const drawer = await expectProcessDrawerMounted(page, 'edit', 'optional');
            await expectNarrowFlowSelectorRemainsContained(page, drawer, locale);
          });
        }

        if (mode === 'view' && locale === APP_LOCALES[0]) {
          await test.step('native Input/Output options remain horizontal', async () => {
            const drawer = await expectProcessDrawerMounted(page, 'view', undefined);
            await drawer
              .getByRole('tab', {
                name: getLocaleMessage(locale, 'pages.process.view.exchanges'),
                exact: true,
              })
              .click();
            await expectProcessViewNativeOptionsRemainHorizontal(page, drawer);
          });
        }

        await page.reload({ waitUntil: 'domcontentloaded' });
        await expectSpaLocation(page, location);
        await expectProcessDrawer(page, locale, mode, mode === 'edit' ? 'optional' : undefined);
      });
    }
  }
});

PROCESS_REQUIRED_VARIANTS.forEach(({ assertionId, required }) => {
  test(`Process ${required} deep-link state is explicit and reload-stable`, async ({
    baseURL,
    browserName,
    page,
  }, testInfo) => {
    test.skip(
      browserName !== PLAYWRIGHT_BROWSER_PROJECTS[0] ||
        process.env.E2E_AUTHENTICATED !== 'true' ||
        (process.env.E2E_QUALIFICATION !== 'true' &&
          process.env.E2E_ALLOW_PRODUCTION_DATA !== 'true'),
      'Process required-state variants require the exact read-only global production ledger.',
    );
    test.setTimeout(10 * 60_000);
    annotateEvidence(testInfo, processAssertion, 'typed-process-required-state');
    const ledger = await readProductionDataLedger();
    expect(ledger).toBeTruthy();
    expect(baseURL).toBeTruthy();
    await signInViaUi(page);

    let trappedValidationDrafts = 0;
    await page.route(PROCESS_SAVE_DRAFT_ROUTE_PATTERN, async (route) => {
      if (await fallbackVerifiedPreflight(route, PROCESS_SAVE_DRAFT_PATH)) return;
      assertExactReadOnlyProcessValidationDraft({
        expectedOrigin: productionBackendTarget.origin,
        expectedPublishableKey: productionBackendTarget.publishableKey,
        ledger: ledger!,
        request: route.request(),
      });
      trappedValidationDrafts += 1;
      // `required=1` intentionally invokes the product's save-before-validation flow. This
      // dedicated test trap proves the exact ledger-controlled request and terminates it locally;
      // the production mutation allowlist remains unchanged and no request reaches the backend.
      await route.abort('blockedbyclient');
    });
    const readTrappedValidationDrafts = () => trappedValidationDrafts;
    let initialNavigationCount = 0;
    let reloadProofCount = 0;

    try {
      const hashQuery: Record<string, string> = {
        id: ledger!.id,
        mode: 'edit',
        version: ledger!.version,
      };
      if (required === 'required') {
        hashQuery.required = '1';
      }
      const location = { hashPath: '/mydata/processes', hashQuery } satisfies SpaLocationTarget;
      const trappedValidationDraftsBeforeNavigation = trappedValidationDrafts;
      await test.step(
        `${assertionId} initial mount`,
        async () => {
          await page.goto(spaLocationToCandidateUrl(baseURL!, location), {
            timeout: 45_000,
            waitUntil: 'domcontentloaded',
          });
          initialNavigationCount += 1;
          await expectProcessDeepLinkMountSettled({
            expectedLocation: location,
            page,
            readTrappedValidationDrafts,
            required,
            trappedValidationDraftsBeforeMount: trappedValidationDraftsBeforeNavigation,
          });
        },
        { timeout: 90_000 },
      );

      for (const locale of APP_LOCALES) {
        // The Playwright steps execute sequentially; these counters intentionally prove each
        // reload reached a fresh, settled mount before the next locale interaction.
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        await test.step(`${required} ${locale}`, async () => {
          await selectAppLocaleThroughUi(page, locale, { forceTrigger: true });
          await expectSpaLocation(page, location);
          await expect.poll(() => readStoredAppLocale(page)).toBe(locale);
          await expectProcessDrawer(page, locale, 'edit', required);

          const trappedValidationDraftsBeforeReload = trappedValidationDrafts;
          await page.reload({ waitUntil: 'domcontentloaded' });
          reloadProofCount += 1;
          await expectProcessDeepLinkMountSettled({
            expectedLocation: location,
            page,
            readTrappedValidationDrafts,
            required,
            trappedValidationDraftsBeforeMount: trappedValidationDraftsBeforeReload,
          });
          await expectProcessDrawer(page, locale, 'edit', required);
        });
      }

      expect(initialNavigationCount).toBe(1);
      expect(reloadProofCount).toBe(APP_LOCALES.length);
      const expectedTrappedValidationDrafts = required === 'required' ? APP_LOCALES.length + 1 : 0;
      expect(trappedValidationDrafts).toBe(expectedTrappedValidationDrafts);
    } finally {
      // Stop mounted auto-validation effects while the exact local trap is still active.
      await page.close();
    }
  });
});
