import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import methods from '../../../public/lciamethods/cache_manifest.json';

// Hermetic, read-only fixture: all remote requests are intercepted, including metadata.
const app = process.env.RESULT_PREVIEW_BASE_URL ?? 'http://127.0.0.1:8012';
const backend = 'https://semantic-harness.invalid';
const userId = '11111111-1111-4111-8111-111111111111';
const processId = '22222222-2222-4222-8222-222222222222';
const flowId = '33333333-3333-4333-8333-333333333333';
const packageId = '44444444-4444-4444-8444-444444444444';
const resultSetId = '55555555-5555-4555-8555-555555555555';
const version = '01.00.000';
const method = methods.methods.find(
  (item) => item.method_id === '6209b35f-9447-40b5-b68c-a1099e3674a0',
)!;
const resultSet = {
  schemaVersion: 'lcia.result-set.v1',
  resultSetId,
  name: 'Cement result set',
  createdAt: '2026-10-18T00:00:00Z',
};
const name = 'Portland cement production';
const processRecord = {
  processIndex: 0,
  rootProcess: { id: processId, version },
  quantitativeReference: {
    flow: { id: flowId, version },
    referenceUnit: 'kg',
    meanAmount: 1,
    direction: 'Output',
    exchangeInternalId: '0',
  },
};
const rows = {
  process_axis: [processRecord],
  lci: [
    {
      processIndex: 0,
      flow: { id: flowId, version },
      direction: 'Output',
      unit: 'kg',
      meanAmount: 1.25,
      location: 'GLO',
    },
  ],
  lcia: [
    {
      processIndex: 0,
      method: { id: method.method_id, version: method.method_version },
      meanAmount: 0.125,
    },
  ],
};
const artifacts = Object.entries(rows).map(([kind, records]) => {
  const content = records.map((record) => JSON.stringify(record)).join('\n') + '\n';
  return {
    kind,
    content,
    path: `${kind}.ndjson`,
    schemaVersion: 'fixture.v1',
    compression: 'none',
    mediaType: 'application/x-ndjson',
    sha256: createHash('sha256').update(content).digest('hex'),
    byteSize: Buffer.byteLength(content),
    recordCount: records.length,
    firstProcessIndex: 0,
    lastProcessIndex: 0,
    signedDownloadUrl: `${app}/preview-fixture/${kind}`,
    signedDownloadExpiresInSeconds: 900,
  };
});
const bundle = {
  packageId,
  packageVersion: version,
  snapshotId: userId,
  resultId: packageId,
  calculationBundle: {
    bundleContentHash: 'a'.repeat(64),
    manifestSha256: 'b'.repeat(64),
    manifestByteSize: 100,
    artifactCount: artifacts.length,
    manifest: {
      schemaVersion: 'tiangong.calculation-bundle.v1',
      calculationContractVersion: '1.0.0',
      calculationId: packageId,
      bundleContentHash: 'a'.repeat(64),
      scope: {
        coverageMode: 'global_eligible',
        processCount: 1,
        selectionManifestHash: 'c'.repeat(64),
      },
      snapshot: {
        id: userId,
        sha256: 'd'.repeat(64),
        processCount: 1,
        flowCount: 1,
        impactCount: 1,
      },
      solver: {},
      methodSet: {},
      artifacts: [],
      calculationEvidence: {},
      hashes: {},
    },
    artifacts,
    downloads: [],
    manifestDownload: {
      sha256: 'b'.repeat(64),
      byteSize: 100,
      mediaType: 'application/json',
      signedDownloadUrl: `${app}/preview-fixture/manifest`,
      signedDownloadExpiresInSeconds: 900,
    },
  },
};

test('opens exact process results with readable names, units and a usable narrow layout', async ({
  page,
  context,
}, testInfo) => {
  const encoded = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const user = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'preview@example.test',
    app_metadata: {},
    user_metadata: {},
  };
  const token = `${encoded({ alg: 'HS256', typ: 'JWT' })}.${encoded({ sub: userId, aud: 'authenticated', role: 'authenticated', exp: 2_000_000_000 })}.fixture`;
  await context.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
      localStorage.setItem('umi_locale', 'en-US');
    },
    {
      key: `sb-${new URL(backend).hostname.split('.')[0]}-auth-token`,
      session: {
        access_token: token,
        refresh_token: 'fixture',
        token_type: 'bearer',
        expires_at: 2_000_000_000,
        expires_in: 3600,
        user,
      },
    },
  );
  const unexpected: string[] = [];
  const writes: string[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const reply = (data: unknown) => route.fulfill({ json: data });
    if (url.origin === app) {
      const artifact = artifacts.find((item) => item.signedDownloadUrl === url.href);
      if (artifact)
        return route.fulfill({ body: artifact.content, contentType: artifact.mediaType });
      return route.continue();
    }
    if (url.origin !== new URL(backend).origin) {
      unexpected.push(url.origin);
      return route.abort();
    }
    if (url.pathname === '/auth/v1/user') return reply(user);
    if (url.pathname === '/rest/v1/rpc/qry_membership_get_mine')
      return reply([
        {
          role: 'data_product_manager',
          team_id: '00000000-0000-0000-0000-000000000000',
          user_id: userId,
        },
      ]);
    if (url.pathname === '/rest/v1/flows' || url.pathname === '/rest/v1/processes') {
      expect(url.searchParams.get('version')).toBe(`eq.${version}`);
      const flow = url.pathname.endsWith('/flows');
      return reply([
        {
          id: flow ? flowId : processId,
          version,
          json: {
            [flow ? 'flowDataSet' : 'processDataSet']: {
              [flow ? 'flowInformation' : 'processInformation']: {
                dataSetInformation: {
                  name: {
                    baseName: [{ '@xml:lang': 'en', '#text': flow ? 'Cement, at plant' : name }],
                  },
                },
              },
            },
          },
        },
      ]);
    }
    if (url.pathname.startsWith('/functions/v1/')) {
      const body = route.request().postDataJSON();
      let data: unknown = [];
      switch (body.action) {
        case 'list_result_sets':
          data = { items: [resultSet] };
          break;
        case 'get_result_set':
          data = resultSet;
          break;
        case 'list_task_feed':
          data = { items: [] };
          break;
        case 'get_calculation_bundle':
          expect(body.packageId).toBe(packageId);
          data = bundle;
          break;
        case 'preview_package':
          data = {
            summary: { packageId, defaultImpactCategory: method.method_id },
            detailPage: {
              status: 'ready',
              impactCategoryId: method.method_id,
              impactName: 'Climate change',
              impactVersion: method.method_version,
              unit: 'kg CO2 Equivalents',
              offset: 0,
              limit: 25,
              returnedCount: 1,
              totalCount: 1,
              rows: [{ processId, processVersion: version, processName: name, value: 0.125 }],
            },
          };
          break;
        default:
          if (/^(create|publish|unpublish)_/.test(body.action ?? '')) writes.push(body.action);
      }
      return reply({ ok: true, data });
    }
    return reply([]);
  });
  await page.goto(
    `${app}/#/data-processing?resultSetId=${resultSetId}&tab=preview&packageId=${packageId}`,
  );
  await expect(page.getByRole('link', { name })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('results-list.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'View results', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Process results' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(`${name} · ${version}`, { exact: true })).toBeVisible();
  await expect(dialog.getByRole('tab', { name: 'LCIA', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(dialog.getByText('0.12500000', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Cement, at plant', { exact: false })).toBeVisible();
  await expect(dialog.getByText(method.method_id, { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('process-lcia.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await dialog.getByRole('tab', { name: 'LCI', exact: true }).click();
  await expect(dialog.getByRole('cell', { name: 'Cement, at plant', exact: true })).toBeVisible();
  await expect(dialog.getByRole('cell', { name: '1.2500000', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.getByRole('tab', { name: 'LCI', exact: true })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('narrow-diagnostic.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('process-lci-narrow.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('tab', { name: 'Exports', exact: true }).click();
  await expect(page.getByText('calculation-bundle.json', { exact: true })).toBeVisible();
  await expect(page.getByText('Process results', { exact: true })).toHaveCount(0);
  expect(writes).toEqual([]);
  expect(unexpected).toEqual([]);
});
