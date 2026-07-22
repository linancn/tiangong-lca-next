import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { CONTENT_LANGUAGE_REGISTRY } from '../../../src/services/general/contentLanguageRegistry';
import { AUTHORING_LANGUAGES, REPOSITORY_ROOT } from '../../e2e/i18n/contracts';
import {
  bindVerifiedProductionRequestGuardOptions,
  verifyProductionBackendTargetSources,
} from '../../e2e/i18n/production-backend-target';
import {
  getCodexE2EProcessSynonym,
  type ProductionDataLedger,
} from '../../e2e/i18n/production-data-safety';
import {
  assertAuditedSyntheticReadRequest,
  assertLedgerControlledSaveDraftClosure,
  AUDITED_READ_ONLY_RPC_NAMES,
  classifyProductionRequest,
  installReadOnlyProductionGuard,
  type ProductionRequestGuardOptions,
} from '../../e2e/i18n/production-request-guard';

const EXPECTED_ORIGIN = 'https://example.supabase.co';
const EXPECTED_PUBLISHABLE_KEY = 'public-key';
const backend = (pathname: string) => `${EXPECTED_ORIGIN}${pathname}`;
const classify = (method: string, pathname: string, postData?: string | null) =>
  classifyProductionRequest(
    method,
    backend(pathname),
    EXPECTED_ORIGIN,
    postData,
    { apikey: EXPECTED_PUBLISHABLE_KEY },
    EXPECTED_PUBLISHABLE_KEY,
  );

async function withAuthorizedProductionWriteEnvironment(
  action: () => Promise<void>,
): Promise<void> {
  const originalEnvironment = process.env;
  process.env = {
    ...originalEnvironment,
    CI: '',
    E2E_ALLOW_PRODUCTION_DATA: 'true',
    E2E_AUTHENTICATED: 'true',
    E2E_BACKEND_TARGET: 'production',
    E2E_PRODUCTION_WRITE_CONFIRMATION: 'I_AUTHORIZE_ONE_CODEX_E2E_PRODUCTION_PROCESS',
    GITHUB_ACTIONS: '',
  };
  try {
    await action();
  } finally {
    process.env = originalEnvironment;
  }
}

async function withoutProductionWriteAuthorization(action: () => Promise<void>): Promise<void> {
  const originalEnvironment = process.env;
  process.env = {
    ...originalEnvironment,
    CI: '',
    E2E_ALLOW_PRODUCTION_DATA: '',
    E2E_AUTHENTICATED: '',
    E2E_BACKEND_TARGET: 'production',
    E2E_PRODUCTION_WRITE_CONFIRMATION: '',
    GITHUB_ACTIONS: '',
  };
  try {
    await action();
  } finally {
    process.env = originalEnvironment;
  }
}

const PROCESS_FIELDS = [
  'baseName',
  'treatmentStandardsRoutes',
  'mixAndLocationTypes',
  'functionalUnitFlowProperties',
  'generalComment',
] as const;
function makeLedger(): ProductionDataLedger {
  const id = '11111111-1111-4111-8111-111111111111';
  return {
    cleaned: 0,
    cleanupPrepared: false,
    createAttempted: true,
    created: 1,
    id,
    leaked: 1,
    marker: `codex-e2e-${id}`,
    state: 'created',
    table: 'processes',
    version: '01.01.000',
  };
}

function makeExactSaveDraftPostData(ledger: ProductionDataLedger): string {
  const multilingualField = (field: (typeof PROCESS_FIELDS)[number]) =>
    AUTHORING_LANGUAGES.map((languageCode) => ({
      '#text': `${ledger.marker} ${field} ${languageCode}`,
      '@xml:lang': languageCode,
    }));
  return JSON.stringify({
    id: ledger.id,
    jsonOrdered: {
      processDataSet: {
        processInformation: {
          dataSetInformation: {
            'common:UUID': ledger.id,
            name: {
              baseName: multilingualField('baseName'),
              treatmentStandardsRoutes: multilingualField('treatmentStandardsRoutes'),
              mixAndLocationTypes: multilingualField('mixAndLocationTypes'),
              functionalUnitFlowProperties: multilingualField('functionalUnitFlowProperties'),
            },
            'common:synonyms': AUTHORING_LANGUAGES.map((languageCode) => ({
              '#text': getCodexE2EProcessSynonym(ledger, languageCode, 'after-ui-save'),
              '@xml:lang': languageCode,
            })),
            'common:generalComment': multilingualField('generalComment'),
          },
        },
      },
    },
    ruleVerification: false,
    table: ledger.table,
    version: ledger.version,
  });
}

type FakeRoute = {
  abort: (reason: string) => Promise<void>;
  fallback: () => Promise<void>;
  request: () => {
    headers: () => Record<string, string>;
    method: () => string;
    postData: () => string | null;
    url: () => string;
  };
};

type FakeWebSocketRoute = {
  close: (options: { code: number; reason: string }) => Promise<void>;
  connectToServer: () => Promise<void>;
};

async function makeInstalledGuard(
  options: Omit<ProductionRequestGuardOptions, 'expectedPublishableKey'>,
) {
  let routeMatcher: unknown;
  let routeHandler: ((route: FakeRoute) => Promise<void>) | undefined;
  let webSocketMatcher: ((url: URL) => boolean) | undefined;
  let webSocketHandler: ((route: FakeWebSocketRoute) => Promise<void>) | undefined;
  const target = {
    route: jest.fn(async (matcher: unknown, handler: (route: FakeRoute) => Promise<void>) => {
      routeMatcher = matcher;
      routeHandler = handler;
    }),
    routeWebSocket: jest.fn(
      async (
        matcher: (url: URL) => boolean,
        handler: (route: FakeWebSocketRoute) => Promise<void>,
      ) => {
        webSocketMatcher = matcher;
        webSocketHandler = handler;
      },
    ),
  };
  const guard = await installReadOnlyProductionGuard(target as never, EXPECTED_ORIGIN, {
    expectedPublishableKey: EXPECTED_PUBLISHABLE_KEY,
    ...options,
  });
  return {
    guard,
    routeHandler: () => routeHandler!,
    routeMatcher: () => routeMatcher,
    webSocketHandler: () => webSocketHandler!,
    webSocketMatcher: () => webSocketMatcher!,
  };
}

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? listTypeScriptFiles(entryPath)
      : entry.isFile() && entry.name.endsWith('.ts')
        ? [entryPath]
        : [];
  });
}

describe('production browser request guard', () => {
  it('derives the production authoring fixture languages from the content registry contract', () => {
    expect(AUTHORING_LANGUAGES).toEqual(
      CONTENT_LANGUAGE_REGISTRY.filter(({ authoring }) => authoring.enabled).map(
        ({ languageCode }) => languageCode,
      ),
    );
  });

  it.each([
    ['GET', '/rest/v1/teams?select=*'],
    ['HEAD', '/rest/v1/processes'],
    ['OPTIONS', '/functions/v1/process_hybrid_search'],
    ['POST', '/auth/v1/token?grant_type=password'],
    ['POST', '/storage/v1/object/sign/sys-files/logo.svg'],
    ['POST', '/functions/v1/process_hybrid_search'],
    ['POST', '/functions/v1/lca_results'],
  ])('allows the explicit read-only boundary: %s %s', (method, pathname) => {
    expect(classify(method, pathname)).toBe('allow');
  });

  it.each([
    ['GET', '/storage/v1/object/public/sys-files/logo/brand.svg'],
    ['HEAD', '/storage/v1/object/sign/sys-files/logo/brand.svg?token=signed-read-token'],
    ['GET', '/storage/v1/render/image/public/sys-files/logo/brand.png?width=160'],
    ['GET', '/auth/v1/.well-known/jwks.json'],
  ])(
    'allows only reviewed public or static reads without an API key: %s %s',
    (method, pathname) => {
      expect(
        classifyProductionRequest(
          method,
          backend(pathname),
          EXPECTED_ORIGIN,
          null,
          {},
          'wrong-key',
        ),
      ).toBe('allow');
    },
  );

  it('keeps the public JWKS path exact and blocks unreviewed query parameters', () => {
    expect(
      classifyProductionRequest(
        'GET',
        backend('/auth/v1/.well-known/jwks.json?unreviewed=true'),
        EXPECTED_ORIGIN,
        null,
        {},
        EXPECTED_PUBLISHABLE_KEY,
      ),
    ).toBe('block');
  });

  it.each([
    ['GET', '/graphql/v1', null],
    ['GET', `/realtime/v1/websocket?apikey=${EXPECTED_PUBLISHABLE_KEY}`, null],
    ['POST', '/graphql/v1', '{}'],
    ['GET', '/future/v1/public', null],
    ['GET', '/api/data', null],
    ['GET', '/unknown-prefix/v99/read', null],
    ['GET', '/rest/v1/rpc%2Fapp_team_update', null],
    ['GET', '/index.html', null],
  ])(
    'blocks every unreviewed request on the verified production origin: %s %s',
    (method, pathname, body) => {
      expect(classify(method, pathname, body)).toBe('block');
    },
  );

  it('requires exact token query parameters and the verified publishable key', () => {
    const exactUrl = backend('/auth/v1/token?grant_type=password');
    expect(
      classifyProductionRequest(
        'POST',
        exactUrl,
        EXPECTED_ORIGIN,
        '{}',
        { APIKEY: EXPECTED_PUBLISHABLE_KEY },
        EXPECTED_PUBLISHABLE_KEY,
      ),
    ).toBe('allow');

    for (const [url, headers] of [
      [backend('/auth/v1/token'), { apikey: EXPECTED_PUBLISHABLE_KEY }],
      [backend('/auth/v1/token?grant_type=signup'), { apikey: EXPECTED_PUBLISHABLE_KEY }],
      [
        backend('/auth/v1/token?grant_type=password&redirect_to=https%3A%2F%2Funverified.invalid'),
        { apikey: EXPECTED_PUBLISHABLE_KEY },
      ],
      [
        backend('/auth/v1/token?grant_type=password&grant_type=refresh_token'),
        { apikey: EXPECTED_PUBLISHABLE_KEY },
      ],
      [exactUrl, {}],
      [exactUrl, { apikey: 'wrong-key' }],
    ] as const) {
      expect(
        classifyProductionRequest(
          'POST',
          url,
          EXPECTED_ORIGIN,
          '{}',
          headers,
          EXPECTED_PUBLISHABLE_KEY,
        ),
      ).toBe('block');
    }
  });

  it('requires the exact key and a bodyless request for authenticated reads', () => {
    expect(
      classifyProductionRequest(
        'GET',
        backend('/rest/v1/teams?select=*'),
        EXPECTED_ORIGIN,
        null,
        { apikey: EXPECTED_PUBLISHABLE_KEY },
        EXPECTED_PUBLISHABLE_KEY,
      ),
    ).toBe('allow');
    expect(
      classifyProductionRequest(
        'GET',
        backend('/rest/v1/teams?select=*'),
        EXPECTED_ORIGIN,
        '{}',
        { apikey: EXPECTED_PUBLISHABLE_KEY },
        EXPECTED_PUBLISHABLE_KEY,
      ),
    ).toBe('block');
    expect(
      classifyProductionRequest(
        'GET',
        backend('/rest/v1/teams?select=*'),
        EXPECTED_ORIGIN,
        null,
        { apikey: 'wrong-key' },
        EXPECTED_PUBLISHABLE_KEY,
      ),
    ).toBe('block');
  });

  it('allows only the exact read-only data-product publication list command', () => {
    expect(
      classify(
        'POST',
        '/functions/v1/app_data_product_commands',
        JSON.stringify({ action: 'list_publications', limit: 50 }),
      ),
    ).toBe('allow');
    expect(
      classify(
        'POST',
        '/functions/v1/app_data_product_commands',
        JSON.stringify({ action: 'list_publications', limit: 50, write: true }),
      ),
    ).toBe('block');
    expect(
      classify(
        'POST',
        '/functions/v1/app_data_product_commands',
        JSON.stringify({ action: 'publish_package', limit: 50 }),
      ),
    ).toBe('block');
  });

  it('permits synthetic fulfill only when origin, key, query, body, and guard all agree', () => {
    const exactRequest = {
      headers: () => ({ apikey: 'public-key' }),
      method: () => 'POST',
      postData: () => JSON.stringify({ action: 'list_publications', limit: 50 }),
      url: () => backend('/functions/v1/app_data_product_commands?forceFunctionRegion=us-east-1'),
    };
    expect(() =>
      assertAuditedSyntheticReadRequest(exactRequest, {
        expectedOrigin: EXPECTED_ORIGIN,
        expectedPublishableKey: 'public-key',
        jsonBody: { action: 'list_publications', limit: 50 },
        method: 'POST',
        pathname: '/functions/v1/app_data_product_commands',
        searchParams: { forceFunctionRegion: 'us-east-1' },
      }),
    ).not.toThrow();

    for (const request of [
      { ...exactRequest, headers: () => ({ apikey: 'wrong-key' }) },
      { ...exactRequest, headers: () => ({}) },
      {
        ...exactRequest,
        url: () =>
          'https://unverified.invalid/functions/v1/app_data_product_commands?forceFunctionRegion=us-east-1',
      },
      { ...exactRequest, postData: () => JSON.stringify({ action: 'publish_package', limit: 50 }) },
      {
        ...exactRequest,
        postData: () =>
          JSON.stringify({ action: 'list_publications', limit: 50, unreviewed: true }),
      },
      {
        ...exactRequest,
        url: () => backend('/functions/v1/app_data_product_commands?forceFunctionRegion=other'),
      },
      {
        ...exactRequest,
        url: () =>
          backend(
            '/functions/v1/app_data_product_commands?forceFunctionRegion=us-east-1&unreviewed=true',
          ),
      },
      {
        ...exactRequest,
        url: () =>
          backend(
            '/functions/v1/app_data_product_commands?forceFunctionRegion=us-east-1&forceFunctionRegion=us-east-1',
          ),
      },
    ]) {
      expect(() =>
        assertAuditedSyntheticReadRequest(request, {
          expectedOrigin: EXPECTED_ORIGIN,
          expectedPublishableKey: 'public-key',
          jsonBody: { action: 'list_publications', limit: 50 },
          method: 'POST',
          pathname: '/functions/v1/app_data_product_commands',
          searchParams: { forceFunctionRegion: 'us-east-1' },
        }),
      ).toThrow(/exact audited read contract/u);
    }
  });

  it.each(AUDITED_READ_ONLY_RPC_NAMES)('allows only the audited read-only RPC %s', (rpcName) => {
    expect(classify('POST', `/rest/v1/rpc/${rpcName}`, JSON.stringify({ page_size: 10 }))).toBe(
      'allow',
    );
  });

  it.each(['get_latest_unreviewed', 'qry_unreviewed', 'search_unreviewed'])(
    'does not infer read safety from the %s prefix',
    (rpcName) => {
      expect(classify('POST', `/rest/v1/rpc/${rpcName}`, '{}')).toBe('block');
    },
  );

  it('pins the current app RPC surface to the reviewed exact allowlist', () => {
    const rpcNames = listTypeScriptFiles(path.join(REPOSITORY_ROOT, 'src/services')).flatMap(
      (filePath) =>
        [...readFileSync(filePath, 'utf8').matchAll(/supabase[.]rpc[(]\s*'([^']+)'/gu)].map(
          (match) => match[1],
        ),
    );
    expect([...new Set(rpcNames)].sort()).toEqual([...AUDITED_READ_ONLY_RPC_NAMES].sort());
  });

  it.each([
    ['list', { action: 'list', limit: 20 }],
    ['read', { action: 'read', jobId: 'codex-e2e-read-only' }],
  ])('allows the read-only app_worker_jobs %s action', (_name, body) => {
    expect(classify('POST', '/functions/v1/app_worker_jobs', JSON.stringify(body))).toBe('allow');
  });

  it.each([
    ['cancel', JSON.stringify({ action: 'cancel', jobId: 'codex-e2e' })],
    ['list with an unreviewed key', JSON.stringify({ action: 'list', limit: 20, write: true })],
    [
      'read with an unreviewed key',
      JSON.stringify({ action: 'read', jobId: 'codex-e2e', write: true }),
    ],
    ['missing action', JSON.stringify({ limit: 20 })],
    ['unknown action', JSON.stringify({ action: 'status' })],
    ['malformed body', '{'],
  ])('blocks the write-capable or invalid app_worker_jobs %s request', (_name, body) => {
    expect(classify('POST', '/functions/v1/app_worker_jobs', body)).toBe('block');
  });

  it.each([
    [
      'read',
      {
        action: 'read',
        reviewSubmitJobId: '33333333-3333-4333-8333-333333333333',
      },
    ],
    [
      'read_latest',
      {
        action: 'read_latest',
        table: 'processes',
        id: '11111111-1111-4111-8111-111111111111',
        version: '01.00.000',
      },
    ],
    [
      'read_latest with revision checksum',
      {
        action: 'read_latest',
        table: 'processes',
        id: '11111111-1111-4111-8111-111111111111',
        version: '01.00.000',
        revisionChecksum: 'a'.repeat(64),
      },
    ],
  ])('allows the exact read-only review-submit %s action', (_name, body) => {
    expect(
      classify('POST', '/functions/v1/app_dataset_review_submit_jobs', JSON.stringify(body)),
    ).toBe('allow');
  });

  it.each([
    [
      'enqueue',
      {
        action: 'enqueue',
        table: 'processes',
        id: '11111111-1111-4111-8111-111111111111',
        version: '01.00.000',
      },
    ],
    [
      'read with an extra key',
      { action: 'read', reviewSubmitJobId: '33333333-3333-4333-8333-333333333333', write: true },
    ],
    ['read with a non-UUID id', { action: 'read', reviewSubmitJobId: 'latest' }],
    [
      'read_latest for another table',
      {
        action: 'read_latest',
        table: 'flows',
        id: '11111111-1111-4111-8111-111111111111',
        version: '01.00.000',
      },
    ],
    [
      'read_latest with a non-UUID id',
      { action: 'read_latest', table: 'processes', id: 'latest', version: '01.00.000' },
    ],
    [
      'read_latest with an invalid version',
      {
        action: 'read_latest',
        table: 'processes',
        id: '11111111-1111-4111-8111-111111111111',
        version: '1',
      },
    ],
    [
      'read_latest with an invalid checksum',
      {
        action: 'read_latest',
        table: 'processes',
        id: '11111111-1111-4111-8111-111111111111',
        version: '01.00.000',
        revisionChecksum: 'latest',
      },
    ],
    [
      'read_latest with an extra key',
      {
        action: 'read_latest',
        table: 'processes',
        id: '11111111-1111-4111-8111-111111111111',
        version: '01.00.000',
        write: true,
      },
    ],
    [
      'missing action',
      { table: 'processes', id: '11111111-1111-4111-8111-111111111111', version: '01.00.000' },
    ],
  ])('blocks the write-capable or invalid review-submit %s request', (_name, body) => {
    expect(
      classify('POST', '/functions/v1/app_dataset_review_submit_jobs', JSON.stringify(body)),
    ).toBe('block');
  });

  it('blocks a malformed review-submit request body', () => {
    expect(classify('POST', '/functions/v1/app_dataset_review_submit_jobs', '{')).toBe('block');
  });

  it.each([
    ['POST', '/rest/v1/teams'],
    ['PATCH', '/rest/v1/processes?id=eq.codex-e2e'],
    ['DELETE', '/rest/v1/processes?id=eq.codex-e2e'],
    ['PUT', '/storage/v1/object/sys-files/codex-e2e'],
    ['POST', '/rest/v1/rpc/app_team_update'],
    ['POST', '/rest/v1/rpc/unknown_read_claim'],
    ['POST', '/functions/v1/app_team_create'],
    ['POST', '/functions/v1/app_dataset_delete'],
    ['POST', '/functions/v1/unknown_read_claim'],
    ['POST', '/auth/v1/signup'],
  ])('blocks mutations and unknown write-capable calls: %s %s', (method, pathname) => {
    expect(classify(method, pathname)).toBe('block');
  });

  it('intercepts every request and blocks unknown same-origin paths before the network', async () => {
    const { guard, routeHandler, routeMatcher } = await makeInstalledGuard({});
    expect(routeMatcher()).toBe('**/*');
    const abort = jest.fn(async () => undefined);
    const fallback = jest.fn(async () => undefined);
    await routeHandler()({
      abort,
      fallback,
      request: () => ({
        headers: () => ({ apikey: EXPECTED_PUBLISHABLE_KEY }),
        method: () => 'POST',
        postData: () => '{}',
        url: () => backend('/graphql/v1'),
      }),
    });

    expect(abort).toHaveBeenCalledWith('blockedbyclient');
    expect(fallback).not.toHaveBeenCalled();
    expect(guard.blockedRequests).toEqual(['POST /graphql/v1']);
  });

  it('closes every verified-backend WebSocket without connecting to the server', async () => {
    const { guard, webSocketHandler, webSocketMatcher } = await makeInstalledGuard({});
    expect(webSocketMatcher()(new URL('wss://example.supabase.co/realtime/v1/websocket'))).toBe(
      true,
    );
    expect(webSocketMatcher()(new URL('ws://example.supabase.co/future/socket'))).toBe(true);
    expect(webSocketMatcher()(new URL('wss://unverified.invalid/realtime/v1/websocket'))).toBe(
      false,
    );
    expect(webSocketMatcher()(new URL('https://example.supabase.co/realtime/v1/websocket'))).toBe(
      false,
    );

    const close = jest.fn(async () => undefined);
    const connectToServer = jest.fn(async () => undefined);
    await webSocketHandler()({ close, connectToServer });

    expect(close).toHaveBeenCalledWith({
      code: 1008,
      reason: 'Production backend WebSocket blocked by E2E guard.',
    });
    expect(connectToServer).not.toHaveBeenCalled();
    expect(guard.blockedRequests).toEqual(['WEBSOCKET [verified-production-backend]']);
  });

  it('falls through candidate frontend assets while the catch-all route is installed', async () => {
    const { guard, routeHandler } = await makeInstalledGuard({});
    const abort = jest.fn(async () => undefined);
    const fallback = jest.fn(async () => undefined);
    await routeHandler()({
      abort,
      fallback,
      request: () => ({
        headers: () => ({}),
        method: () => 'GET',
        postData: () => null,
        url: () => 'http://127.0.0.1:8000/static/app.js',
      }),
    });

    expect(fallback).toHaveBeenCalledTimes(1);
    expect(abort).not.toHaveBeenCalled();
    expect(guard.blockedRequests).toEqual([]);
  });

  it('keeps an exact save-draft blocked without a per-test ledger opt-in', async () => {
    const ledger = makeLedger();
    const { guard, routeHandler } = await makeInstalledGuard({});
    const abort = jest.fn(async () => undefined);
    await routeHandler()({
      abort,
      fallback: jest.fn(async () => undefined),
      request: () => ({
        headers: () => ({ apikey: EXPECTED_PUBLISHABLE_KEY }),
        method: () => 'POST',
        postData: () => makeExactSaveDraftPostData(ledger),
        url: () => backend('/functions/v1/app_dataset_save_draft'),
      }),
    });

    expect(abort).toHaveBeenCalledWith('blockedbyclient');
    expect(guard.allowedLedgerControlledSaveDraftRequests).toBe(0);
  });

  it('keeps a ledger-matching save-draft blocked when the publishable key is not exact', async () => {
    const ledger = makeLedger();
    const { guard, routeHandler } = await makeInstalledGuard({
      ledgerControlledProcessSaveDraft: ledger,
    });
    const abort = jest.fn(async () => undefined);
    await routeHandler()({
      abort,
      fallback: jest.fn(async () => undefined),
      request: () => ({
        headers: () => ({ apikey: 'wrong-key' }),
        method: () => 'POST',
        postData: () => makeExactSaveDraftPostData(ledger),
        url: () => backend('/functions/v1/app_dataset_save_draft?forceFunctionRegion=us-east-1'),
      }),
    });

    expect(abort).toHaveBeenCalledWith('blockedbyclient');
    expect(guard.allowedLedgerControlledSaveDraftRequests).toBe(0);
  });

  it.each([
    ['missing', ''],
    ['wrong', '?forceFunctionRegion=eu-central-1'],
    ['additional', '?forceFunctionRegion=us-east-1&unreviewed=true'],
    ['repeated', '?forceFunctionRegion=us-east-1&forceFunctionRegion=us-east-1'],
  ])('keeps a ledger-matching save-draft blocked with a %s query', async (_name, query) => {
    const ledger = makeLedger();
    const { guard, routeHandler } = await makeInstalledGuard({
      ledgerControlledProcessSaveDraft: ledger,
    });
    const abort = jest.fn(async () => undefined);
    const fallback = jest.fn(async () => undefined);

    await withAuthorizedProductionWriteEnvironment(async () => {
      await routeHandler()({
        abort,
        fallback,
        request: () => ({
          headers: () => ({ apikey: EXPECTED_PUBLISHABLE_KEY }),
          method: () => 'POST',
          postData: () => makeExactSaveDraftPostData(ledger),
          url: () => backend(`/functions/v1/app_dataset_save_draft${query}`),
        }),
      });
    });

    expect(abort).toHaveBeenCalledWith('blockedbyclient');
    expect(fallback).not.toHaveBeenCalled();
    expect(guard.allowedLedgerControlledSaveDraftRequests).toBe(0);
    expect(guard.blockedRequests).toEqual(['POST /functions/v1/app_dataset_save_draft']);
  });

  it('allows one exact opted-in save-draft and blocks a repeated request', async () => {
    const ledger = makeLedger();
    const { guard, routeHandler } = await makeInstalledGuard({
      ledgerControlledProcessSaveDraft: ledger,
    });
    const firstFallback = jest.fn(async () => undefined);
    const repeatAbort = jest.fn(async () => undefined);
    const request = () => ({
      headers: () => ({ apikey: EXPECTED_PUBLISHABLE_KEY }),
      method: () => 'POST',
      postData: () => makeExactSaveDraftPostData(ledger),
      url: () => backend('/functions/v1/app_dataset_save_draft?forceFunctionRegion=us-east-1'),
    });

    await withAuthorizedProductionWriteEnvironment(async () => {
      await routeHandler()({
        abort: jest.fn(async () => undefined),
        fallback: firstFallback,
        request,
      });
    });
    expect(firstFallback).toHaveBeenCalledTimes(1);
    expect(guard.allowedLedgerControlledSaveDraftRequests).toBe(1);
    expect(() => assertLedgerControlledSaveDraftClosure(guard)).not.toThrow();

    await routeHandler()({
      abort: repeatAbort,
      fallback: jest.fn(async () => undefined),
      request,
    });
    expect(repeatAbort).toHaveBeenCalledWith('blockedbyclient');
    expect(guard.allowedLedgerControlledSaveDraftRequests).toBe(1);
    expect(guard.blockedRequests).toEqual(['POST /functions/v1/app_dataset_save_draft']);
  });

  it('fails closed at the network boundary when write authorization is no longer present', async () => {
    const ledger = makeLedger();
    const { guard, routeHandler } = await makeInstalledGuard({
      ledgerControlledProcessSaveDraft: ledger,
    });
    const fallback = jest.fn(async () => undefined);

    await withoutProductionWriteAuthorization(async () => {
      await expect(
        routeHandler()({
          abort: jest.fn(async () => undefined),
          fallback,
          request: () => ({
            headers: () => ({ apikey: EXPECTED_PUBLISHABLE_KEY }),
            method: () => 'POST',
            postData: () => makeExactSaveDraftPostData(ledger),
            url: () =>
              backend('/functions/v1/app_dataset_save_draft?forceFunctionRegion=us-east-1'),
          }),
        }),
      ).rejects.toThrow(/Production-data E2E/u);
    });

    expect(fallback).not.toHaveBeenCalled();
    expect(guard.allowedLedgerControlledSaveDraftRequests).toBe(0);
  });

  it('requires the opted-in save-draft request to occur exactly once', async () => {
    const ledger = makeLedger();
    const { guard } = await makeInstalledGuard({ ledgerControlledProcessSaveDraft: ledger });
    expect(() => assertLedgerControlledSaveDraftClosure(guard)).toThrow(/exactly once/u);
  });

  it.each([
    ['GET', '/rest/v1/teams'],
    ['GET', '/realtime/v1/websocket'],
    ['POST', '/auth/v1/token'],
    ['POST', '/rest/v1/rpc/get_latest_process_versions'],
    ['POST', '/functions/v1/process_hybrid_search'],
  ])('blocks API-shaped requests on every unverified origin: %s %s', (method, pathname) => {
    expect(
      classifyProductionRequest(
        method,
        `https://unverified.invalid${pathname}`,
        EXPECTED_ORIGIN,
        '{}',
      ),
    ).toBe('block');
  });

  it('ignores candidate frontend requests outside the production API boundary', () => {
    expect(
      classifyProductionRequest('POST', 'http://127.0.0.1:8000/local-action', EXPECTED_ORIGIN),
    ).toBe('ignore');
  });

  it('derives one backend origin only when candidate and tracked-main sources match exactly', () => {
    const environment =
      'SUPABASE_URL=https://example.supabase.co/path\nSUPABASE_PUBLISHABLE_KEY=public-key\n';
    expect(verifyProductionBackendTargetSources(environment, environment)).toMatchObject({
      origin: EXPECTED_ORIGIN,
      publishableKey: 'public-key',
    });
    expect(() =>
      verifyProductionBackendTargetSources(
        environment,
        'SUPABASE_URL=https://other.supabase.co\nSUPABASE_PUBLISHABLE_KEY=public-key\n',
      ),
    ).toThrow('Candidate backend target differs from tracked main production.');
    expect(() =>
      verifyProductionBackendTargetSources(
        environment,
        'SUPABASE_URL=https://example.supabase.co\nSUPABASE_PUBLISHABLE_KEY=other-key\n',
      ),
    ).toThrow('Candidate backend target differs from tracked main production.');
  });

  it('binds the verified publishable key after caller options so it cannot be omitted or overridden', () => {
    const ledger = makeLedger();
    expect(
      bindVerifiedProductionRequestGuardOptions({ publishableKey: EXPECTED_PUBLISHABLE_KEY }, {
        expectedPublishableKey: 'caller-controlled-key',
        ledgerControlledProcessSaveDraft: ledger,
      } as never),
    ).toEqual({
      expectedPublishableKey: EXPECTED_PUBLISHABLE_KEY,
      ledgerControlledProcessSaveDraft: ledger,
    });
  });

  it('keeps the raw guard installer behind the verified target helper', () => {
    const directory = path.join(REPOSITORY_ROOT, 'tests/e2e/i18n');
    const rawInstallerUsers = readdirSync(directory)
      .filter((fileName) => fileName.endsWith('.ts'))
      .filter((fileName) =>
        readFileSync(path.join(directory, fileName), 'utf8').includes(
          'installReadOnlyProductionGuard(',
        ),
      )
      .sort();
    expect(rawInstallerUsers).toEqual([
      'production-backend-target.ts',
      'production-request-guard.ts',
    ]);

    for (const fileName of [
      'access-fallback.spec.ts',
      'evidence-reporter.ts',
      'fixtures.ts',
      'route-inventory.spec.ts',
    ]) {
      expect(readFileSync(path.join(directory, fileName), 'utf8')).toContain(
        'installVerifiedProductionReadOnlyGuard(',
      );
    }
  });

  it('keeps typed synthetic API responses behind the audited fulfill classifier', () => {
    const source = readFileSync(
      path.join(REPOSITORY_ROOT, 'tests/e2e/i18n/typed-view-variants.spec.ts'),
      'utf8',
    );
    const fulfillCalls = source.match(/await route[.]fulfill[(]/gu) ?? [];
    const auditedCalls = source.match(/assertAuditedSyntheticReadRequest[(]/gu) ?? [];
    expect(fulfillCalls).toHaveLength(3);
    expect(auditedCalls).toHaveLength(fulfillCalls.length);
  });

  it('records blocked requests as method and pathname only', async () => {
    const { guard, routeHandler } = await makeInstalledGuard({});
    const abort = jest.fn(async () => undefined);
    await routeHandler()({
      abort,
      fallback: jest.fn(async () => undefined),
      request: () => ({
        headers: () => ({ apikey: EXPECTED_PUBLISHABLE_KEY }),
        method: () => 'GET',
        postData: () => null,
        url: () =>
          'https://unverified.invalid/rest/v1/teams?apikey=must-not-appear&token=must-not-appear',
      }),
    });

    expect(abort).toHaveBeenCalledWith('blockedbyclient');
    expect(guard.blockedRequests).toEqual(['GET /rest/v1/teams']);
    expect(JSON.stringify(guard.blockedRequests)).not.toContain('unverified.invalid');
    expect(JSON.stringify(guard.blockedRequests)).not.toContain('must-not-appear');
  });
});
