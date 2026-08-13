import { expect, test, type Page } from '../fixtures';

import { signInViaUi } from '../auth';
import {
  annotateEvidence,
  findRouteAssertion,
  getLocaleMessage,
  PLAYWRIGHT_BROWSER_PROJECTS,
  selectAppLocaleThroughUi,
} from '../contracts';

// This qualification-only browser contract lives under the evidence collector's runtime
// exclusion because it proves deterministic mock/contract behavior, not production evidence.

const processAssertion = findRouteAssertion('/mydata/processes');
const flowAssertion = findRouteAssertion('/mydata/flows');
const flowPropertyAssertion = findRouteAssertion('/mydata/flowproperties');

const PROCESS_ID = 'c0de0000-0000-4000-8000-000000000801';
const FLOW_ID = 'c0de0000-0000-4000-8000-000000000802';
const FLOW_PROPERTY_ID = 'c0de0000-0000-4000-8000-000000000803';
const VERSION = '01.00.000';

const chineseText = (text: string) => ({ '@xml:lang': 'zh', '#text': text });

const processJson = {
  processDataSet: {
    processInformation: {
      dataSetInformation: {
        'common:UUID': PROCESS_ID,
        name: { baseName: [chineseText('中文过程')] },
        'common:generalComment': [chineseText('中文过程说明')],
        classificationInformation: {
          'common:classification': { 'common:class': [] },
        },
      },
      time: { 'common:referenceYear': '2026' },
    },
    modellingAndValidation: {
      LCIMethodAndAllocation: { typeOfDataSet: 'Unit process, single operation' },
    },
  },
};

const flowJson = {
  flowDataSet: {
    flowInformation: {
      dataSetInformation: {
        'common:UUID': FLOW_ID,
        name: { baseName: [chineseText('中文流')] },
        'common:synonyms': [chineseText('中文流别名')],
        classificationInformation: {
          'common:elementaryFlowCategorization': { 'common:category': [] },
        },
      },
      geography: { locationOfSupply: 'GLO' },
    },
    modellingAndValidation: { LCIMethod: { typeOfDataSet: 'Product flow' } },
    flowProperties: { flowProperty: [] },
  },
};

const flowPropertyJson = {
  flowPropertyDataSet: {
    flowPropertiesInformation: {
      dataSetInformation: {
        'common:UUID': FLOW_PROPERTY_ID,
        'common:name': [chineseText('中文流属性')],
        'common:generalComment': [chineseText('中文流属性说明')],
        classificationInformation: {
          'common:classification': { 'common:class': [] },
        },
      },
      quantitativeReference: {
        referenceToReferenceUnitGroup: {
          '@refObjectId': 'c0de0000-0000-4000-8000-000000000804',
          '@version': VERSION,
          'common:shortDescription': { baseName: [chineseText('千克')] },
        },
      },
    },
  },
};

const processRow = {
  id: PROCESS_ID,
  json: processJson,
  modified_at: '2026-08-01T00:00:00.000Z',
  model_id: null,
  state_code: 100,
  team_id: null,
  total_count: 1,
  version: VERSION,
};

const flowRow = {
  id: FLOW_ID,
  json: flowJson,
  modified_at: '2026-08-01T00:00:00.000Z',
  team_id: null,
  total_count: 1,
  version: VERSION,
};

const flowPropertyRow = {
  id: FLOW_PROPERTY_ID,
  json: flowPropertyJson,
  modified_at: '2026-08-01T00:00:00.000Z',
  team_id: null,
  total_count: 1,
  version: VERSION,
};

type SearchScenario = {
  assertion: ReturnType<typeof findRouteAssertion>;
  detailTable: string;
  drawerTitle: string;
  keyword: string;
  label: string;
  responseRow: Record<string, unknown>;
  route: string;
  searchTarget: string;
};

async function installSearchContract(page: Page, scenario: SearchScenario): Promise<() => number> {
  let requestCount = 0;
  await page.route(`**${scenario.searchTarget}**`, async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>;
    const query = body.query_text ?? body.query;

    expect(query).toBe(scenario.keyword);
    expect(body).not.toHaveProperty('search_text');
    expect(body.data_source).toBe('my');
    expect(body.page_current).toBe(1);
    expect(body.page_size).toBe(10);
    if (scenario.searchTarget.includes('/rest/v1/rpc/')) {
      expect(body).not.toHaveProperty('order_by');
    }

    requestCount += 1;
    await route.fulfill({
      body: JSON.stringify([scenario.responseRow]),
      contentType: 'application/json',
      status: 200,
    });
  });

  await page.route(`**/rest/v1/${scenario.detailTable}*`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      body: JSON.stringify([scenario.responseRow]),
      contentType: 'application/json',
      status: 200,
    });
  });

  await page.route('**/rest/v1/unitgroups*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      body: '[]',
      contentType: 'application/json',
      status: 200,
    });
  });

  return () => requestCount;
}

async function runSearchScenario(
  page: Page,
  testInfo: Parameters<typeof annotateEvidence>[0],
  scenario: SearchScenario,
): Promise<void> {
  test.skip(
    process.env.E2E_QUALIFICATION !== 'true',
    'Lexical search browser contracts run against the deterministic qualification backend.',
  );
  test.skip(
    testInfo.project.name !== PLAYWRIGHT_BROWSER_PROJECTS[0],
    'Lexical search browser contracts run in Chromium.',
  );

  annotateEvidence(testInfo, scenario.assertion, 'non-english-lexical-search');
  const requestCount = await installSearchContract(page, scenario);
  await signInViaUi(page);
  await page.goto(`/#${scenario.route}`, { waitUntil: 'domcontentloaded' });
  await selectAppLocaleThroughUi(page, 'zh-CN');

  const searchInput = page.getByPlaceholder(getLocaleMessage('zh-CN', 'pages.search.keyWord'), {
    exact: true,
  });
  await expect(searchInput).toBeVisible();
  await searchInput.fill(scenario.keyword);
  await searchInput.press('Enter');
  await expect.poll(requestCount, { timeout: 30_000 }).toBeGreaterThan(0);

  const resultRow = page
    .locator('.ant-table-tbody > tr')
    .filter({ hasText: scenario.label })
    .first();
  await expect(resultRow).toBeVisible();
  await expect(resultRow).toContainText(scenario.label);

  const actionButtons = resultRow.locator('td').last().locator('button');
  await expect(actionButtons.first()).toBeVisible();
  await actionButtons.first().click();

  const drawer = page.locator('.ant-drawer-content:visible').last();
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText(scenario.drawerTitle);
}

test('Process Chinese lexical search uses the formal RPC and preserves detail navigation', async ({
  page,
}, testInfo) => {
  await runSearchScenario(page, testInfo, {
    assertion: processAssertion,
    detailTable: 'processes',
    drawerTitle: '查看过程',
    keyword: '电力',
    label: '中文过程',
    responseRow: processRow,
    route: '/mydata/processes',
    searchTarget: '/rest/v1/rpc/search_processes',
  });
});

test('Flow Chinese lexical search uses the formal RPC and preserves detail navigation', async ({
  page,
}, testInfo) => {
  await runSearchScenario(page, testInfo, {
    assertion: flowAssertion,
    detailTable: 'flows',
    drawerTitle: '查看流',
    keyword: '电力',
    label: '中文流',
    responseRow: flowRow,
    route: '/mydata/flows',
    searchTarget: '/rest/v1/rpc/search_flows',
  });
});

test('Flow property Chinese lexical search uses the formal RPC and preserves detail navigation', async ({
  page,
}, testInfo) => {
  await runSearchScenario(page, testInfo, {
    assertion: flowPropertyAssertion,
    detailTable: 'flowproperties',
    drawerTitle: '查看流属性',
    keyword: '质量',
    label: '中文流属性',
    responseRow: flowPropertyRow,
    route: '/mydata/flowproperties',
    searchTarget: '/rest/v1/rpc/search_flowproperties',
  });
});
