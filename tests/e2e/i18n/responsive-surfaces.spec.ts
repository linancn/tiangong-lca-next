import { isDeepStrictEqual } from 'node:util';

import { expect, test, type Locator, type Page, type Route } from './fixtures';

import { CONTENT_LANGUAGE_REGISTRY } from '../../../src/services/general/contentLanguageRegistry';
import { LOCALE_CAPABILITY_MATRIX } from '../../../src/services/general/localeCapabilities';
import { CANONICAL_SOURCE_APP_LOCALE } from '../../../src/services/general/localeRegistry';
import { signInViaUi } from './auth';
import {
  annotateEvidence,
  findRouteAssertion,
  getLocaleMessage,
  PLAYWRIGHT_BROWSER_PROJECTS,
  readStoredAppLocale,
  selectAppLocaleThroughUi,
} from './contracts';
import {
  readVerifiedProductionBackendTarget,
  type VerifiedProductionBackendTarget,
} from './production-backend-target';
import {
  assertAuditedSyntheticReadRequest,
  type AuditedSyntheticReadContract,
} from './production-request-guard';
import {
  assertResponsiveSurfaceClosure,
  RESPONSIVE_SURFACE_LOCALES,
  RESPONSIVE_SURFACE_SCENARIO,
  RESPONSIVE_THEMES,
  RESPONSIVE_VIEWPORTS,
  type ResponsiveSurfaceId,
} from './responsive-surface-registry';

const processAssertion = findRouteAssertion('/mydata/processes');
const welcomeAssertion = findRouteAssertion('/welcome');
const lifeCycleModelAssertion = findRouteAssertion('/mydata/models');

const LONG_TEXT_MESSAGE_ID = 'pages.welcome.overview.sections.modelingTraceability.description';
const MODEL_ID = 'c0de0000-0000-4000-8000-000000000635';
const PROCESS_ID = 'c0de0000-0000-4000-8000-000000000636';
const DATASET_VERSION = '01.00.000';
const GRAPH_NODE_ID = 'codex-responsive-node';
const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const PROCESS_INSTANCE_SELECT = [
  'id',
  'json->processDataSet->processInformation->dataSetInformation->name',
  'json->processDataSet->processInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class"',
  'json->processDataSet->processInformation->dataSetInformation->"common:generalComment"',
  'json->processDataSet->processInformation->time->>"common:referenceYear"',
  'json->processDataSet->modellingAndValidation->LCIMethodAndAllocation->typeOfDataSet',
  'json->processDataSet->processInformation->geography->locationOfOperationSupplyOrProduction->>"@location"',
  'version',
  'modified_at',
  'team_id',
  'user_id',
  'model_id',
].join(',');

const contentLongText = CONTENT_LANGUAGE_REGISTRY.map(({ languageCode }) => {
  const ownerLocale =
    LOCALE_CAPABILITY_MATRIX.find((capability) => capability.contentLanguage === languageCode)
      ?.appLocale ?? CANONICAL_SOURCE_APP_LOCALE;
  return {
    '@xml:lang': languageCode,
    '#text': getLocaleMessage(ownerLocale, LONG_TEXT_MESSAGE_ID),
  };
});

const multilingualProcessName = {
  baseName: contentLongText,
  functionalUnitFlowProperties: [],
  mixAndLocationTypes: [],
  treatmentStandardsRoutes: [],
};

const processListRow = {
  id: PROCESS_ID,
  json: {
    processDataSet: {
      modellingAndValidation: {
        LCIMethodAndAllocation: { typeOfDataSet: 'Unit process, single operation' },
      },
      processInformation: {
        dataSetInformation: {
          'common:generalComment': contentLongText,
          classificationInformation: {
            'common:classification': { 'common:class': [] },
          },
          name: multilingualProcessName,
        },
        time: { 'common:referenceYear': '2026' },
      },
    },
  },
  modified_at: '2026-07-19T00:00:00.000Z',
  model_id: null,
  state_code: 0,
  team_id: null,
  total_count: 1,
  version: DATASET_VERSION,
};

const lifeCycleModelRow = {
  json: {
    lifeCycleModelDataSet: {
      lifeCycleModelInformation: {
        dataSetInformation: {
          'common:UUID': MODEL_ID,
          name: multilingualProcessName,
        },
        quantitativeReference: { referenceToReferenceProcess: 1 },
      },
    },
  },
  json_tg: {
    submodels: [],
    xflow: {
      edges: [],
      nodes: [
        {
          data: {
            id: PROCESS_ID,
            label: multilingualProcessName,
            quantitativeReference: '1',
            version: DATASET_VERSION,
          },
          height: 150,
          id: GRAPH_NODE_ID,
          ports: {
            items: [
              {
                args: { x: 0, y: 92 },
                attrs: { text: {} },
                data: {
                  allocations: {},
                  quantitativeReference: false,
                  textLang: contentLongText,
                },
                group: 'groupInput',
                id: 'codex-responsive-input-port',
              },
            ],
          },
          shape: 'rect',
          size: { height: 150, width: 280 },
          width: 280,
          x: 24,
          y: 24,
        },
      ],
    },
  },
  modified_at: '2026-07-19T00:00:00.000Z',
  rule_verification: null,
  state_code: 0,
  team_id: null,
};

test.use({ screenshot: 'off', trace: 'off', video: 'off' });

function longTextForLocale(locale: (typeof RESPONSIVE_SURFACE_LOCALES)[number]): string {
  return getLocaleMessage(locale, LONG_TEXT_MESSAGE_ID);
}

function requestMatchesAuditedContract(
  route: Route,
  contract: AuditedSyntheticReadContract,
): boolean {
  const request = route.request();
  const target = new URL(request.url());
  let actualJsonBody: unknown;
  try {
    actualJsonBody = request.postData() === null ? undefined : JSON.parse(request.postData()!);
  } catch {
    return false;
  }
  const actualSearchEntries = [...target.searchParams.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
  const expectedSearchEntries = Object.entries(contract.searchParams).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return (
    request.method().toUpperCase() === contract.method &&
    target.origin === new URL(contract.expectedOrigin).origin &&
    target.pathname === contract.pathname &&
    request.headers().apikey === contract.expectedPublishableKey &&
    isDeepStrictEqual(actualSearchEntries, expectedSearchEntries) &&
    isDeepStrictEqual(actualJsonBody, contract.jsonBody)
  );
}

function readExactAuthenticatedRpcBody(
  route: Route,
  expectedWithoutUserId: Record<string, unknown>,
): Record<string, unknown> | undefined {
  let actualBody: unknown;
  try {
    actualBody = JSON.parse(route.request().postData() ?? '');
  } catch {
    return undefined;
  }
  if (typeof actualBody !== 'object' || actualBody === null || Array.isArray(actualBody)) {
    return undefined;
  }
  const userId = (actualBody as Record<string, unknown>).this_user_id;
  if (typeof userId !== 'string' || !USER_ID_PATTERN.test(userId)) {
    return undefined;
  }
  const expectedBody = { ...expectedWithoutUserId, this_user_id: userId };
  return isDeepStrictEqual(actualBody, expectedBody) ? expectedBody : undefined;
}

function readContract(
  expectedTarget: Pick<VerifiedProductionBackendTarget, 'origin' | 'publishableKey'>,
  contract: Omit<AuditedSyntheticReadContract, 'expectedOrigin' | 'expectedPublishableKey'>,
): AuditedSyntheticReadContract {
  return {
    ...contract,
    expectedOrigin: expectedTarget.origin,
    expectedPublishableKey: expectedTarget.publishableKey,
  };
}

async function fulfillAuditedJson(
  route: Route,
  contract: AuditedSyntheticReadContract,
  body: unknown,
): Promise<void> {
  assertAuditedSyntheticReadRequest(route.request(), contract);
  const rowCount = Array.isArray(body) ? body.length : 1;
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: 'application/json',
    headers: { 'content-range': rowCount > 0 ? `0-${rowCount - 1}/${rowCount}` : '*/0' },
    status: 200,
  });
}

async function setTheme(page: Page, dark: boolean): Promise<void> {
  await page.evaluate((nextDarkMode) => {
    localStorage.setItem('isDarkMode', String(nextDarkMode));
  }, dark);
}

async function configureThemeAndReload(page: Page, dark: boolean): Promise<void> {
  await setTheme(page, dark);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('isDarkMode')))
    .toBe(String(dark));
}

async function expectAppliedTheme(
  page: Page,
  locale: (typeof RESPONSIVE_SURFACE_LOCALES)[number],
  dark: boolean,
): Promise<void> {
  const toggle = page.getByRole('button', {
    name: getLocaleMessage(locale, 'pages.theme.toggleDarkMode'),
    exact: true,
  });
  await expect(toggle).toBeVisible();
  await expect(toggle.locator(`svg[data-icon="${dark ? 'sun' : 'moon'}"]`)).toHaveCount(1);
  await expect(toggle.locator(`svg[data-icon="${dark ? 'moon' : 'sun'}"]`)).toHaveCount(0);
}

async function expectNoPageLevelHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0) <=
          document.documentElement.clientWidth + 1,
      ),
    )
    .toBe(true);
}

async function expectContainerInsideViewport(locator: Locator, page: Page): Promise<void> {
  await expect(locator).toBeVisible();
  const [box, viewport] = await Promise.all([
    locator.boundingBox(),
    page.evaluate(() => ({ height: window.innerHeight, width: window.innerWidth })),
  ]);
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function expectLocatorInsideContainer(locator: Locator, container: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  await expect(container).toBeVisible();
  const [box, containerBox] = await Promise.all([locator.boundingBox(), container.boundingBox()]);
  expect(box).not.toBeNull();
  expect(containerBox).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(containerBox!.x - 1);
  expect(box!.y).toBeGreaterThanOrEqual(containerBox!.y - 1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(containerBox!.x + containerBox!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(containerBox!.y + containerBox!.height + 1);
}

async function waitForDrawerWrapperToSettle(locator: Locator, page: Page): Promise<void> {
  await expect(locator).toBeVisible();
  await expect
    .poll(
      async () => {
        const [box, viewportWidth] = await Promise.all([
          locator.boundingBox(),
          page.evaluate(() => window.innerWidth),
        ]);
        return Boolean(box && box.x >= -1 && box.x <= 1 && box.x + box.width <= viewportWidth + 1);
      },
      { timeout: 10_000 },
    )
    .toBe(true);
}

type BlankGraphPoint = {
  targetKind: 'graph-root' | 'svg-descendant';
  visibleGraphRect: { bottom: number; left: number; right: number; top: number };
  x: number;
  y: number;
};

async function findBlankGraphPoint(graph: Locator): Promise<BlankGraphPoint> {
  return graph.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const visibleGraphRect = {
      bottom: Math.min(bounds.bottom, window.innerHeight),
      left: Math.max(bounds.left, 0),
      right: Math.min(bounds.right, window.innerWidth),
      top: Math.max(bounds.top, 0),
    };
    if (
      visibleGraphRect.right - visibleGraphRect.left <= 4 ||
      visibleGraphRect.bottom - visibleGraphRect.top <= 4
    ) {
      throw new Error('The visible X6 graph clip is too small for a user gesture.');
    }

    const candidates: Array<{ x: number; y: number }> = [];
    const candidateKeys = new Set<string>();
    const addCandidate = (x: number, y: number) => {
      if (
        x <= visibleGraphRect.left ||
        x >= visibleGraphRect.right ||
        y <= visibleGraphRect.top ||
        y >= visibleGraphRect.bottom
      ) {
        return;
      }
      const key = `${Math.round(x * 4)}:${Math.round(y * 4)}`;
      if (!candidateKeys.has(key)) {
        candidateKeys.add(key);
        candidates.push({ x, y });
      }
    };

    const edgeInset = 2;
    const scanStep = 12;
    const left = visibleGraphRect.left + edgeInset;
    const right = visibleGraphRect.right - edgeInset;
    const top = visibleGraphRect.top + edgeInset;
    const bottom = visibleGraphRect.bottom - edgeInset;
    addCandidate(right, bottom);
    addCandidate(left, bottom);
    addCandidate(right, top);
    addCandidate(left, top);
    for (let y = bottom; y >= top; y -= scanStep) {
      addCandidate(right, y);
      addCandidate(left, y);
    }
    for (let x = right; x >= left; x -= scanStep) {
      addCandidate(x, bottom);
      addCandidate(x, top);
    }
    for (let y = bottom; y >= top; y -= scanStep) {
      for (let x = right; x >= left; x -= scanStep) {
        addCandidate(x, y);
      }
    }

    for (const { x, y } of candidates) {
      const target = document.elementFromPoint(x, y);
      if (!(target instanceof Element) || (target !== element && !element.contains(target))) {
        continue;
      }
      const targetKind =
        target === element
          ? ('graph-root' as const)
          : target.closest('.x6-graph-svg') !== null
            ? ('svg-descendant' as const)
            : undefined;
      const isInteractiveCell =
        target.closest(
          '.x6-cell, .x6-cell-tools, .x6-widget-transform-resize, .x6-widget-transform-rotate',
        ) !== null;
      if (targetKind && !isInteractiveCell) {
        return { targetKind, visibleGraphRect, x, y };
      }
    }
    throw new Error('No blank point inside the visible X6 graph clip accepts a user gesture.');
  });
}

async function armGraphWheelConsumptionProbe(graph: Locator): Promise<void> {
  await graph.evaluate((element) => {
    const graphElement = element as HTMLElement;
    delete graphElement.dataset.responsiveWheelConsumption;
    graphElement.addEventListener(
      'wheel',
      (event) => {
        graphElement.dataset.responsiveWheelConsumption = event.defaultPrevented
          ? 'consumed'
          : 'unconsumed';
      },
      { once: true },
    );
  });
}

async function expectWrappedTextInside(locator: Locator, container: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const metrics = await locator.evaluate(
    (element, containerElement) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const containerBounds = (containerElement as Element).getBoundingClientRect();
      const fragments = Array.from(range.getClientRects()).filter(
        (rect) => rect.width > 0 && rect.height > 0,
      );
      return {
        containerLeft: containerBounds.left,
        containerRight: containerBounds.right,
        fragmentLines: new Set(fragments.map((rect) => Math.round(rect.top))).size,
        fragmentLefts: fragments.map((rect) => rect.left),
        fragmentRights: fragments.map((rect) => rect.right),
        whiteSpace: getComputedStyle(containerElement as Element).whiteSpace,
      };
    },
    await container.elementHandle(),
  );
  expect(metrics.whiteSpace).not.toBe('nowrap');
  expect(metrics.fragmentLines).toBeGreaterThan(1);
  expect(metrics.fragmentLefts.every((left) => left >= metrics.containerLeft - 1)).toBe(true);
  expect(metrics.fragmentRights.every((right) => right <= metrics.containerRight + 1)).toBe(true);
}

async function surfaceColor(locator: Locator): Promise<string> {
  await expect(locator).toBeVisible();
  return locator.evaluate((element) => getComputedStyle(element).backgroundColor);
}

async function closeVisiblePortal(page: Page, portalClassName: string): Promise<void> {
  const portal = page.locator(portalClassName).filter({ visible: true });
  await portal
    .locator('.ant-modal-close, .ant-drawer-close')
    .first()
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
  await expect(portal).toHaveCount(0);
}

async function installProcessTableFixture(page: Page): Promise<() => number> {
  const expectedTarget = readVerifiedProductionBackendTarget();
  let listRequests = 0;
  await page.route('**/rest/v1/rpc/get_latest_process_versions', async (route) => {
    const expectedBody = readExactAuthenticatedRpcBody(route, {
      data_source: 'my',
      page_current: 1,
      page_size: 10,
      sort_by: 'modified_at',
      sort_direction: 'desc',
      state_code_filter: null,
      team_id_filter: null,
      type_of_data_set_filter: 'all',
    });
    if (!expectedBody) {
      await route.fallback();
      return;
    }
    const contract = readContract(expectedTarget, {
      jsonBody: expectedBody,
      method: 'POST',
      pathname: '/rest/v1/rpc/get_latest_process_versions',
      searchParams: {},
    });
    if (!requestMatchesAuditedContract(route, contract)) {
      await route.fallback();
      return;
    }
    listRequests += 1;
    await fulfillAuditedJson(route, contract, [processListRow]);
  });
  await page.route('**/rest/v1/processes*', async (route) => {
    const contract = readContract(expectedTarget, {
      method: 'GET',
      pathname: '/rest/v1/processes',
      searchParams: {
        id: `in.(${PROCESS_ID})`,
        select: 'id,version,state_code',
      },
    });
    if (!requestMatchesAuditedContract(route, contract)) {
      await route.fallback();
      return;
    }
    await fulfillAuditedJson(route, contract, [
      { id: PROCESS_ID, state_code: 0, version: DATASET_VERSION },
    ]);
  });
  return () => listRequests;
}

async function installWelcomeTeamFixture(page: Page): Promise<() => number> {
  const expectedTarget = readVerifiedProductionBackendTarget();
  let teamRequests = 0;
  await page.route('**/rest/v1/teams*', async (route) => {
    const contract = readContract(expectedTarget, {
      method: 'GET',
      pathname: '/rest/v1/teams',
      searchParams: {
        order: 'rank.asc',
        rank: 'gt.0',
        select: 'id,json,rank',
      },
    });
    if (!requestMatchesAuditedContract(route, contract)) {
      await route.fallback();
      return;
    }
    teamRequests += 1;
    await fulfillAuditedJson(route, contract, [
      {
        id: 'codex-responsive-team',
        json: { description: contentLongText, title: contentLongText },
        rank: 1,
      },
    ]);
  });
  return () => teamRequests;
}

async function installLifeCycleModelFixture(page: Page): Promise<() => number> {
  const expectedTarget = readVerifiedProductionBackendTarget();
  let detailRequests = 0;
  await page.route('**/rest/v1/rpc/get_latest_lifecyclemodel_versions', async (route) => {
    const expectedBody = readExactAuthenticatedRpcBody(route, {
      data_source: 'my',
      page_current: 1,
      page_size: 10,
      sort_by: 'modified_at',
      sort_direction: 'desc',
      state_code_filter: null,
      team_id_filter: null,
    });
    if (!expectedBody) {
      await route.fallback();
      return;
    }
    const contract = readContract(expectedTarget, {
      jsonBody: expectedBody,
      method: 'POST',
      pathname: '/rest/v1/rpc/get_latest_lifecyclemodel_versions',
      searchParams: {},
    });
    if (!requestMatchesAuditedContract(route, contract)) {
      await route.fallback();
      return;
    }
    await fulfillAuditedJson(route, contract, []);
  });
  await page.route('**/rest/v1/lifecyclemodels*', async (route) => {
    const contract = readContract(expectedTarget, {
      method: 'GET',
      pathname: '/rest/v1/lifecyclemodels',
      searchParams: {
        id: `eq.${MODEL_ID}`,
        select: 'json,json_tg,state_code,rule_verification,team_id',
        version: `eq.${DATASET_VERSION}`,
      },
    });
    if (!requestMatchesAuditedContract(route, contract)) {
      await route.fallback();
      return;
    }
    detailRequests += 1;
    await fulfillAuditedJson(route, contract, [lifeCycleModelRow]);
  });
  await page.route('**/rest/v1/processes*', async (route) => {
    const contract = readContract(expectedTarget, {
      method: 'GET',
      pathname: '/rest/v1/processes',
      searchParams: {
        or: `and(id.eq.${PROCESS_ID},version.eq.${DATASET_VERSION})`,
        select: PROCESS_INSTANCE_SELECT,
      },
    });
    if (!requestMatchesAuditedContract(route, contract)) {
      await route.fallback();
      return;
    }
    await fulfillAuditedJson(route, contract, []);
  });
  return () => detailRequests;
}

test('process table keeps registry-derived long labels accessible through its internal scroller', async ({
  browserName,
  page,
}, testInfo) => {
  test.skip(browserName !== PLAYWRIGHT_BROWSER_PROJECTS[0], 'Responsive surfaces run in Chromium.');
  test.skip(
    process.env.E2E_AUTHENTICATED !== 'true',
    'Responsive table semantics require explicitly supplied runtime credentials.',
  );
  test.setTimeout(10 * 60_000);
  annotateEvidence(testInfo, processAssertion, RESPONSIVE_SURFACE_SCENARIO);
  const observedSurfaces = new Set<ResponsiveSurfaceId>();
  const readListRequests = await installProcessTableFixture(page);
  await signInViaUi(page);

  for (const locale of RESPONSIVE_SURFACE_LOCALES) {
    for (const viewport of RESPONSIVE_VIEWPORTS) {
      let lightColor: string | undefined;
      for (const theme of RESPONSIVE_THEMES) {
        const color =
          await test.step(`${locale} ${viewport.id} ${theme.id} process table`, async () => {
            await page.setViewportSize(viewport);
            await page.goto('/#/mydata/processes', { waitUntil: 'domcontentloaded' });
            await configureThemeAndReload(page, theme.dark);
            await selectAppLocaleThroughUi(page, locale);
            await expect.poll(() => readStoredAppLocale(page)).toBe(locale);
            await page.reload({ waitUntil: 'domcontentloaded' });

            const expectedLongText = longTextForLocale(locale);
            const tableRoot = page.locator('.responsive-data-list-table').filter({ visible: true });
            await expect(tableRoot).toHaveCount(1);
            const longCell = tableRoot
              .locator('.responsive-data-list-cell-text')
              .filter({ hasText: expectedLongText });
            await expect(longCell).toHaveCount(1);
            await expect(longCell).toBeVisible();
            await expect(longCell).toHaveAttribute('title', expectedLongText);
            const clippingPolicy = await longCell.evaluate((element) => {
              const style = getComputedStyle(element);
              return { overflow: style.overflow, textOverflow: style.textOverflow };
            });
            expect(clippingPolicy).toEqual({ overflow: 'hidden', textOverflow: 'ellipsis' });

            const scroller = tableRoot.locator('.ant-table-content').filter({ visible: true });
            await expect(scroller).toHaveCount(1);
            if (viewport.id === 'narrow') {
              await expect
                .poll(() =>
                  scroller.evaluate(
                    (element) =>
                      element.scrollWidth > element.clientWidth && element.clientWidth > 0,
                  ),
                )
                .toBe(true);
              await scroller.evaluate((element) => {
                element.scrollLeft = element.scrollWidth;
              });
              await expect
                .poll(() => scroller.evaluate((element) => element.scrollLeft))
                .toBeGreaterThan(0);
            }
            await expectNoPageLevelHorizontalOverflow(page);
            return surfaceColor(tableRoot.locator('.ant-table').first());
          });
        if (theme.dark) {
          expect(color).not.toBe(lightColor);
        } else {
          lightColor = color;
        }
      }
    }
  }
  expect(readListRequests()).toBeGreaterThan(0);
  observedSurfaces.add('process-data-table');
  assertResponsiveSurfaceClosure('/mydata/processes', observedSurfaces);
});

test('welcome modal wraps every registry locale across responsive themes', async ({
  browserName,
  page,
}, testInfo) => {
  test.skip(browserName !== PLAYWRIGHT_BROWSER_PROJECTS[0], 'Responsive surfaces run in Chromium.');
  test.skip(
    process.env.E2E_AUTHENTICATED !== 'true',
    'Responsive modal semantics require explicitly supplied runtime credentials.',
  );
  test.setTimeout(10 * 60_000);
  annotateEvidence(testInfo, welcomeAssertion, RESPONSIVE_SURFACE_SCENARIO);
  const observedSurfaces = new Set<ResponsiveSurfaceId>();
  const readTeamRequests = await installWelcomeTeamFixture(page);
  await signInViaUi(page);

  for (const locale of RESPONSIVE_SURFACE_LOCALES) {
    for (const viewport of RESPONSIVE_VIEWPORTS) {
      let lightColor: string | undefined;
      for (const theme of RESPONSIVE_THEMES) {
        const color =
          await test.step(`${locale} ${viewport.id} ${theme.id} welcome modal`, async () => {
            await page.setViewportSize(viewport);
            await page.goto('/#/welcome', { waitUntil: 'domcontentloaded' });
            await configureThemeAndReload(page, theme.dark);
            await selectAppLocaleThroughUi(page, locale);
            await page
              .getByRole('button', {
                name: getLocaleMessage(locale, 'pages.welcome.overview.actions.dataEcosystem'),
                exact: true,
              })
              .click();

            const dialog = page.getByRole('dialog').filter({ visible: true });
            await expect(dialog).toHaveCount(1);
            const modalContent = dialog.locator('.ant-modal-content');
            await expect(modalContent).toHaveCount(1);
            await expectContainerInsideViewport(modalContent, page);
            const expectedLongText = longTextForLocale(locale);
            const longTitle = dialog.getByText(expectedLongText, { exact: true }).first();
            const titleContainer = longTitle.locator(
              'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " ant-card-meta-title ")][1]',
            );
            await expect(titleContainer).toHaveCount(1);
            await expectWrappedTextInside(longTitle, titleContainer);
            const modalBody = dialog.locator('.ant-modal-body');
            await expect(modalBody).toBeVisible();
            const scrollState = await modalBody.evaluate((element) => {
              const style = getComputedStyle(element);
              return {
                clientHeight: element.clientHeight,
                overflowY: style.overflowY,
                scrollHeight: element.scrollHeight,
              };
            });
            expect(scrollState.overflowY).toBe('auto');
            if (
              viewport.id === 'narrow' &&
              scrollState.scrollHeight > scrollState.clientHeight + 1
            ) {
              await modalBody.evaluate((element) => {
                element.scrollTop = element.scrollHeight;
              });
              await expect
                .poll(() => modalBody.evaluate((element) => element.scrollTop))
                .toBeGreaterThan(0);
              await modalBody.evaluate((element) => {
                element.scrollTop = 0;
              });
            }
            await expectNoPageLevelHorizontalOverflow(page);

            const renderedColor = await surfaceColor(modalContent);
            await closeVisiblePortal(page, '.ant-modal');
            return renderedColor;
          });
        if (theme.dark) {
          expect(color).not.toBe(lightColor);
        } else {
          lightColor = color;
        }
      }
    }
  }
  expect(readTeamRequests()).toBeGreaterThan(0);
  observedSurfaces.add('welcome-data-ecosystem-modal');
  assertResponsiveSurfaceClosure('/welcome', observedSurfaces);
});

test('life-cycle model drawer exposes accessible long graph labels and operable pan/zoom', async ({
  browserName,
  page,
}, testInfo) => {
  test.skip(browserName !== PLAYWRIGHT_BROWSER_PROJECTS[0], 'Responsive surfaces run in Chromium.');
  test.skip(
    process.env.E2E_AUTHENTICATED !== 'true',
    'Responsive graph semantics require explicitly supplied runtime credentials.',
  );
  test.setTimeout(10 * 60_000);
  annotateEvidence(testInfo, lifeCycleModelAssertion, RESPONSIVE_SURFACE_SCENARIO);
  const observedSurfaces = new Set<ResponsiveSurfaceId>();
  const readDetailRequests = await installLifeCycleModelFixture(page);
  await signInViaUi(page);

  for (const locale of RESPONSIVE_SURFACE_LOCALES) {
    for (const viewport of RESPONSIVE_VIEWPORTS) {
      let lightColor: string | undefined;
      for (const theme of RESPONSIVE_THEMES) {
        const color =
          await test.step(`${locale} ${viewport.id} ${theme.id} model graph`, async () => {
            await page.setViewportSize(viewport);
            await page.goto('/#/welcome', { waitUntil: 'domcontentloaded' });
            await selectAppLocaleThroughUi(page, locale);
            await expect.poll(() => readStoredAppLocale(page)).toBe(locale);
            await configureThemeAndReload(page, theme.dark);
            await page.goto(
              `/#/mydata/models?id=${MODEL_ID}&version=${DATASET_VERSION}&mode=view`,
              {
                waitUntil: 'domcontentloaded',
              },
            );
            await expectAppliedTheme(page, locale, theme.dark);

            const drawer = page.getByRole('dialog').filter({ visible: true });
            await expect(drawer).toHaveCount(1);
            await expect(
              drawer.getByText(getLocaleMessage(locale, 'pages.flow.model.drawer.title.view'), {
                exact: true,
              }),
            ).toBeVisible();

            const drawerWrapper = page
              .locator('.ant-drawer-content-wrapper')
              .filter({ visible: true });
            const drawerContent = page.locator('.ant-drawer-content').filter({ visible: true });
            const drawerBody = drawer.locator('.ant-drawer-body');
            await expect(drawerWrapper).toHaveCount(1);
            await expect(drawerContent).toHaveCount(1);
            await expect(drawerBody).toBeVisible();
            await waitForDrawerWrapperToSettle(drawerWrapper, page);
            await expectContainerInsideViewport(drawerWrapper, page);
            await expectContainerInsideViewport(drawerContent, page);
            await expectLocatorInsideContainer(drawerContent, drawerWrapper);

            const graph = drawer.locator('.x6-graph');
            await expect(graph).toBeVisible();
            await expectLocatorInsideContainer(graph, drawerBody);
            const graphNode = graph.locator(`.x6-node[data-cell-id="${GRAPH_NODE_ID}"]`);
            await expect(graphNode).toBeVisible();
            const expectedLongText = longTextForLocale(locale);
            const nodeLabel = graph.locator('[data-responsive-label-kind="node-title"]');
            const portLabel = graph.locator('[data-responsive-label-kind="port-label"]');
            await expect(nodeLabel).toHaveCount(1);
            await expect(portLabel).toHaveCount(1);
            await expect(nodeLabel).toBeVisible();
            await expect(portLabel).toBeVisible();
            await expect(nodeLabel).toHaveAttribute('aria-label', expectedLongText);
            await expect(portLabel).toHaveAttribute('aria-label', expectedLongText);
            await expect(graph.locator('title').filter({ hasText: expectedLongText })).toHaveCount(
              2,
            );
            for (const renderedLabel of [nodeLabel, portLabel]) {
              const renderedText = await renderedLabel.textContent();
              expect(renderedText).not.toBe(expectedLongText);
              expect(renderedText).toMatch(/\.\.\.$/u);
            }

            const graphOverflow = await graph.evaluate(
              (element) => getComputedStyle(element).overflow,
            );
            expect(graphOverflow).toBe('hidden');
            await expectNoPageLevelHorizontalOverflow(page);

            const graphTransformViewport = graph.locator('.x6-graph-svg-viewport');
            await expect(graphTransformViewport).toBeVisible();
            await expect(
              page.locator('.ant-spin-fullscreen').filter({ visible: true }),
            ).toHaveCount(0, { timeout: 15_000 });
            await expect(graph).toHaveClass(/\bx6-graph-pannable\b/u);
            const zoomPoint = await findBlankGraphPoint(graph);
            expect(zoomPoint.x).toBeGreaterThan(zoomPoint.visibleGraphRect.left);
            expect(zoomPoint.x).toBeLessThan(zoomPoint.visibleGraphRect.right);
            expect(zoomPoint.y).toBeGreaterThan(zoomPoint.visibleGraphRect.top);
            expect(zoomPoint.y).toBeLessThan(zoomPoint.visibleGraphRect.bottom);
            expect(['graph-root', 'svg-descendant']).toContain(zoomPoint.targetKind);
            await page.mouse.move(zoomPoint.x, zoomPoint.y);
            await page.mouse.click(zoomPoint.x, zoomPoint.y, { button: 'left' });
            await expect(graph).toHaveClass(/\bx6-graph-pannable\b/u);
            const beforeZoom = await graphTransformViewport.getAttribute('transform');
            await armGraphWheelConsumptionProbe(graph);
            await page.mouse.wheel(0, -240);
            await expect(graph).toHaveAttribute('data-responsive-wheel-consumption', 'consumed');
            await expect
              .poll(() => graphTransformViewport.getAttribute('transform'))
              .not.toBe(beforeZoom);
            await graph.evaluate((element) => {
              delete (element as HTMLElement).dataset.responsiveWheelConsumption;
            });

            const beforePan = await graphTransformViewport.getAttribute('transform');
            const blankPoint = await findBlankGraphPoint(graph);
            await page.mouse.move(blankPoint.x, blankPoint.y);
            await page.mouse.down({ button: 'left' });
            await expect(graph).toHaveClass(/\bx6-graph-panning\b/u);
            await page.mouse.move(blankPoint.x - 36, blankPoint.y - 28, { steps: 4 });
            await page.mouse.up({ button: 'left' });
            await expect(graph).not.toHaveClass(/\bx6-graph-panning\b/u);
            await expect
              .poll(() => graphTransformViewport.getAttribute('transform'))
              .not.toBe(beforePan);
            const graphViewport = await graph.evaluate((element) => ({
              clientHeight: element.clientHeight,
              clientWidth: element.clientWidth,
              overflow: getComputedStyle(element).overflow,
              scrollHeight: element.scrollHeight,
              scrollWidth: element.scrollWidth,
            }));
            expect(graphViewport.clientHeight).toBeGreaterThan(0);
            expect(graphViewport.clientWidth).toBeGreaterThan(0);
            expect(graphViewport.overflow).toBe('hidden');
            expect(graphViewport.scrollHeight).toBeLessThanOrEqual(graphViewport.clientHeight + 1);
            expect(graphViewport.scrollWidth).toBeLessThanOrEqual(graphViewport.clientWidth + 1);
            await expectLocatorInsideContainer(graph, drawerBody);

            return surfaceColor(drawerContent);
          });
        if (theme.dark) {
          expect(color).not.toBe(lightColor);
        } else {
          lightColor = color;
        }
      }
    }
  }
  expect(readDetailRequests()).toBeGreaterThan(0);
  observedSurfaces.add('life-cycle-model-drawer');
  observedSurfaces.add('life-cycle-model-graph-node');
  assertResponsiveSurfaceClosure('/mydata/models', observedSurfaces);
});
