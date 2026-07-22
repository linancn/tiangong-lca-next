import type { BrowserContext, Page } from '@playwright/test';

import {
  assertProductionDataWriteAuthorization,
  isExactLedgerControlledProcessSaveDraftBody,
  type ProductionDataLedger,
} from './production-data-safety';

const READ_ONLY_METHODS = new Set(['GET', 'HEAD']);
const VERSIONED_SUPABASE_API_PATH =
  /^\/(?:auth|functions|graphql|realtime|rest|storage)\/v\d+(?:\/|$)/u;
const AUDITED_PREFLIGHT_PATH = /^\/(?:auth|functions|rest|storage)\/v1(?:\/|$)/u;
const PUBLIC_AUTH_READ_PATHS = new Set(['/auth/v1/.well-known/jwks.json']);
const AUTHENTICATED_AUTH_READ_PATHS = new Set(['/auth/v1/user']);
const AUTH_TOKEN_GRANT_TYPES = new Set(['password', 'refresh_token']);
const LEDGER_CONTROLLED_SAVE_DRAFT_SEARCH_ENTRIES = [['forceFunctionRegion', 'us-east-1']] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const PROCESS_VERSION_PATTERN = /^\d{2}[.]\d{2}[.]\d{3}$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/iu;
const STATIC_STORAGE_READ_PATH =
  /^\/storage\/v1\/(?:object|render\/image)\/(?:public|sign)\/[^/]+\/.+/u;
const AUTHENTICATED_STORAGE_READ_PATH =
  /^\/storage\/v1\/(?:object|render\/image)\/authenticated\/[^/]+\/.+/u;
const ENCODED_PATH_SEPARATOR = /%(?:2f|5c)/iu;
export const AUDITED_READ_ONLY_RPC_NAMES = [
  'get_latest_contact_versions',
  'get_latest_flow_versions',
  'get_latest_flowproperty_versions',
  'get_latest_lifecyclemodel_versions',
  'get_latest_process_versions',
  'get_latest_source_versions',
  'get_latest_unitgroup_versions',
  'qry_notification_get_my_data_count',
  'qry_notification_get_my_data_items',
  'qry_notification_get_my_issue_count',
  'qry_notification_get_my_issue_items',
  'qry_notification_get_my_team_count',
  'qry_notification_get_my_team_items',
  'qry_review_get_admin_queue_items',
  'qry_review_get_comment_items',
  'qry_review_get_items',
  'qry_review_get_member_list',
  'qry_review_get_member_queue_items',
  'qry_review_get_member_workload',
  'qry_system_get_member_list',
  'qry_team_find_invitable_user_by_email',
  'qry_team_get_member_list',
  'search_contacts_latest',
  'search_dataset_json_uuid_mentions',
  'search_flowproperties_latest',
  'search_flows_latest',
  'search_lifecyclemodels_latest',
  'search_processes_latest',
  'search_sources_latest',
  'search_unitgroups_latest',
] as const;
const READ_ONLY_RPC_NAMES = new Set<string>(AUDITED_READ_ONLY_RPC_NAMES);
const READ_ONLY_EDGE_FUNCTIONS = new Set([
  'data_product_results',
  'flow_hybrid_search',
  'lca_contribution_path_result',
  'lca_query_results',
  'lca_release_results',
  'lca_results',
  'lifecyclemodel_hybrid_search',
  'process_hybrid_search',
  'query_calculation_results',
  'query_calculation_status',
]);
function hasExactObjectKeys(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expectedKeys].sort())
  );
}

function hasNoRequestBody(postData: string | null | undefined): boolean {
  return postData === null || postData === undefined || postData === '';
}

function hasExactSearchEntries(
  requestTarget: URL,
  expectedEntries: readonly (readonly [string, string])[],
): boolean {
  const actualEntries = [...requestTarget.searchParams.entries()].sort(
    ([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
  );
  const sortedExpectedEntries = [...expectedEntries].sort(
    ([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
  );
  return JSON.stringify(actualEntries) === JSON.stringify(sortedExpectedEntries);
}

function readHeader(headers: Record<string, string> | undefined, name: string): string | undefined {
  const normalizedName = name.toLowerCase();
  return Object.entries(headers ?? {}).find(
    ([headerName]) => headerName.toLowerCase() === normalizedName,
  )?.[1];
}

function hasExactPublishableKey(
  headers: Record<string, string> | undefined,
  expectedPublishableKey: string | undefined,
): boolean {
  return (
    expectedPublishableKey !== undefined && readHeader(headers, 'apikey') === expectedPublishableKey
  );
}

function isExactWorkerReadBody(postData: string | null | undefined): boolean {
  try {
    const body = JSON.parse(postData ?? '');
    if (body.action === 'read') {
      return (
        hasExactObjectKeys(body, ['action', 'jobId']) &&
        typeof body.jobId === 'string' &&
        body.jobId.length > 0
      );
    }
    if (body.action !== 'list') {
      return false;
    }
    const allowedKeys = new Set([
      'action',
      'limit',
      'statuses',
      'subjectId',
      'subjectType',
      'visibility',
    ]);
    return (
      Object.keys(body).every((key) => allowedKeys.has(key)) &&
      (body.limit === undefined || (Number.isInteger(body.limit) && body.limit > 0)) &&
      (body.statuses === undefined ||
        (Array.isArray(body.statuses) &&
          body.statuses.length > 0 &&
          body.statuses.every((status: unknown) => typeof status === 'string'))) &&
      ['subjectId', 'subjectType', 'visibility'].every(
        (key) => body[key] === undefined || typeof body[key] === 'string',
      )
    );
  } catch {
    return false;
  }
}

function isExactReviewSubmitJobReadBody(postData: string | null | undefined): boolean {
  try {
    const body = JSON.parse(postData ?? '');
    if (body.action === 'read') {
      return (
        hasExactObjectKeys(body, ['action', 'reviewSubmitJobId']) &&
        typeof body.reviewSubmitJobId === 'string' &&
        UUID_PATTERN.test(body.reviewSubmitJobId)
      );
    }
    if (body.action !== 'read_latest') {
      return false;
    }
    const hasRevisionChecksum = Object.prototype.hasOwnProperty.call(body, 'revisionChecksum');
    return (
      hasExactObjectKeys(body, [
        'action',
        'table',
        'id',
        'version',
        ...(hasRevisionChecksum ? ['revisionChecksum'] : []),
      ]) &&
      body.table === 'processes' &&
      typeof body.id === 'string' &&
      UUID_PATTERN.test(body.id) &&
      typeof body.version === 'string' &&
      PROCESS_VERSION_PATTERN.test(body.version) &&
      (!hasRevisionChecksum ||
        (typeof body.revisionChecksum === 'string' && SHA256_PATTERN.test(body.revisionChecksum)))
    );
  } catch {
    return false;
  }
}

function isExactPublicationListBody(postData: string | null | undefined): boolean {
  try {
    const body = JSON.parse(postData ?? '');
    return (
      hasExactObjectKeys(body, ['action', 'limit']) &&
      body.action === 'list_publications' &&
      body.limit === 50
    );
  } catch {
    return false;
  }
}

export type ProductionRequestDecision = 'allow' | 'block' | 'ignore';

function finalPathSegment(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  try {
    return decodeURIComponent(segments[segments.length - 1] ?? '');
  } catch {
    return '';
  }
}

export function classifyProductionRequest(
  method: string,
  requestUrl: string,
  expectedProductionOrigin: string,
  postData?: string | null,
  headers?: Record<string, string>,
  expectedPublishableKey?: string,
): ProductionRequestDecision {
  const normalizedMethod = method.toUpperCase();
  const expectedOrigin = new URL(expectedProductionOrigin).origin;
  let requestTarget: URL;
  try {
    requestTarget = new URL(requestUrl);
  } catch {
    return 'block';
  }
  const { pathname } = requestTarget;
  if (requestTarget.origin !== expectedOrigin) {
    return VERSIONED_SUPABASE_API_PATH.test(pathname) ? 'block' : 'ignore';
  }
  if (ENCODED_PATH_SEPARATOR.test(pathname)) {
    return 'block';
  }

  // The verified production backend is a closed world: every same-origin request is blocked
  // unless one of the reviewed read-only transports below proves it is safe.
  if (
    normalizedMethod === 'OPTIONS' &&
    AUDITED_PREFLIGHT_PATH.test(pathname) &&
    hasNoRequestBody(postData)
  ) {
    return 'allow';
  }

  if (READ_ONLY_METHODS.has(normalizedMethod) && hasNoRequestBody(postData)) {
    if (
      (PUBLIC_AUTH_READ_PATHS.has(pathname) && hasExactSearchEntries(requestTarget, [])) ||
      STATIC_STORAGE_READ_PATH.test(pathname)
    ) {
      return 'allow';
    }
    if (
      (AUTHENTICATED_AUTH_READ_PATHS.has(pathname) ||
        AUTHENTICATED_STORAGE_READ_PATH.test(pathname)) &&
      hasExactPublishableKey(headers, expectedPublishableKey)
    ) {
      return 'allow';
    }
    if (/^\/rest\/v1\/[^/]+$/u.test(pathname)) {
      const isRpc = pathname.startsWith('/rest/v1/rpc/');
      const isAuditedRpc = isRpc && READ_ONLY_RPC_NAMES.has(finalPathSegment(pathname));
      return (!isRpc || isAuditedRpc) && hasExactPublishableKey(headers, expectedPublishableKey)
        ? 'allow'
        : 'block';
    }
  }

  if (normalizedMethod !== 'POST') {
    return 'block';
  }
  if (pathname === '/auth/v1/token') {
    const grantType = requestTarget.searchParams.get('grant_type');
    return grantType !== null &&
      AUTH_TOKEN_GRANT_TYPES.has(grantType) &&
      hasExactSearchEntries(requestTarget, [['grant_type', grantType]]) &&
      hasExactPublishableKey(headers, expectedPublishableKey)
      ? 'allow'
      : 'block';
  }
  if (/^\/storage\/v1\/object\/sign\/[^/]+\/.+/u.test(pathname)) {
    return hasExactPublishableKey(headers, expectedPublishableKey) ? 'allow' : 'block';
  }
  if (/^\/rest\/v1\/rpc\/[^/]+$/u.test(pathname)) {
    const rpcName = finalPathSegment(pathname);
    return READ_ONLY_RPC_NAMES.has(rpcName) &&
      hasExactPublishableKey(headers, expectedPublishableKey)
      ? 'allow'
      : 'block';
  }
  if (/^\/functions\/v1\/[^/]+$/u.test(pathname)) {
    if (
      !hasExactSearchEntries(
        requestTarget,
        requestTarget.searchParams.has('forceFunctionRegion')
          ? [['forceFunctionRegion', 'us-east-1']]
          : [],
      ) ||
      !hasExactPublishableKey(headers, expectedPublishableKey)
    ) {
      return 'block';
    }
    const functionName = finalPathSegment(pathname);
    if (READ_ONLY_EDGE_FUNCTIONS.has(functionName)) {
      return 'allow';
    }
    if (functionName === 'app_worker_jobs') {
      return isExactWorkerReadBody(postData) ? 'allow' : 'block';
    }
    if (functionName === 'app_dataset_review_submit_jobs') {
      return isExactReviewSubmitJobReadBody(postData) ? 'allow' : 'block';
    }
    if (functionName === 'app_data_product_commands') {
      return isExactPublicationListBody(postData) ? 'allow' : 'block';
    }
    return 'block';
  }
  return 'block';
}

type SyntheticFulfillRequest = {
  headers: () => Record<string, string>;
  method: () => string;
  postData: () => string | null;
  url: () => string;
};

export type AuditedSyntheticReadContract = {
  expectedOrigin: string;
  expectedPublishableKey: string;
  jsonBody?: unknown;
  method: 'GET' | 'POST';
  pathname: string;
  searchParams: Record<string, string>;
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(',')}}`;
  }
  return value === undefined ? 'undefined' : JSON.stringify(value);
}

export function assertAuditedSyntheticReadRequest(
  request: SyntheticFulfillRequest,
  contract: AuditedSyntheticReadContract,
): URL {
  const requestTarget = new URL(request.url());
  const expectedOrigin = new URL(contract.expectedOrigin).origin;
  const method = request.method().toUpperCase();
  const postData = request.postData();
  let actualJsonBody: unknown;
  try {
    actualJsonBody = postData === null ? undefined : JSON.parse(postData);
  } catch {
    throw new Error('Synthetic production read has a malformed JSON body.');
  }
  if (
    method !== contract.method ||
    requestTarget.origin !== expectedOrigin ||
    requestTarget.pathname !== contract.pathname ||
    readHeader(request.headers(), 'apikey') !== contract.expectedPublishableKey ||
    !hasExactSearchEntries(requestTarget, Object.entries(contract.searchParams)) ||
    stableJson(actualJsonBody) !== stableJson(contract.jsonBody) ||
    classifyProductionRequest(
      method,
      request.url(),
      expectedOrigin,
      postData,
      request.headers(),
      contract.expectedPublishableKey,
    ) !== 'allow'
  ) {
    throw new Error('Synthetic production response is outside its exact audited read contract.');
  }
  return requestTarget;
}

export type ProductionRequestGuard = {
  allowedLedgerControlledSaveDraftRequests: number;
  readonly blockedRequests: string[];
  expectedLedgerControlledSaveDraftRequests: number;
};

export type ProductionRequestGuardOptions = {
  expectedPublishableKey: string;
  ledgerControlledProcessSaveDraft?: ProductionDataLedger;
};

export async function installReadOnlyProductionGuard(
  target: BrowserContext | Page,
  expectedProductionOrigin: string,
  options: ProductionRequestGuardOptions,
): Promise<ProductionRequestGuard> {
  const guard: ProductionRequestGuard = {
    allowedLedgerControlledSaveDraftRequests: 0,
    blockedRequests: [],
    expectedLedgerControlledSaveDraftRequests: options.ledgerControlledProcessSaveDraft ? 1 : 0,
  };
  const normalizedExpectedOrigin = new URL(expectedProductionOrigin).origin;
  const expectedProductionHost = new URL(normalizedExpectedOrigin).host;
  await target.routeWebSocket(
    (requestTarget) =>
      (requestTarget.protocol === 'ws:' || requestTarget.protocol === 'wss:') &&
      requestTarget.host === expectedProductionHost,
    async (webSocketRoute) => {
      guard.blockedRequests.push('WEBSOCKET [verified-production-backend]');
      await webSocketRoute.close({
        code: 1008,
        reason: 'Production backend WebSocket blocked by E2E guard.',
      });
    },
  );
  await target.route('**/*', async (route) => {
    const request = route.request();
    const requestTarget = new URL(request.url());
    const requestMethod = request.method().toUpperCase();
    const isExactSaveDraftTarget =
      requestMethod === 'POST' &&
      requestTarget.origin === normalizedExpectedOrigin &&
      requestTarget.pathname === '/functions/v1/app_dataset_save_draft';
    if (
      isExactSaveDraftTarget &&
      options.ledgerControlledProcessSaveDraft &&
      guard.allowedLedgerControlledSaveDraftRequests === 0 &&
      hasExactSearchEntries(requestTarget, LEDGER_CONTROLLED_SAVE_DRAFT_SEARCH_ENTRIES) &&
      hasExactPublishableKey(request.headers(), options.expectedPublishableKey) &&
      isExactLedgerControlledProcessSaveDraftBody(
        request.postData(),
        options.ledgerControlledProcessSaveDraft,
      )
    ) {
      // This is the browser guard's sole production mutation escape hatch. Revalidate the
      // complete local operator envelope at the final network boundary, immediately before the
      // request is released; fixture setup and UI-click checks are intentionally not substitutes.
      assertProductionDataWriteAuthorization(process.env);
      guard.allowedLedgerControlledSaveDraftRequests += 1;
      await route.fallback();
      return;
    }
    const decision = classifyProductionRequest(
      requestMethod,
      request.url(),
      normalizedExpectedOrigin,
      request.postData(),
      request.headers(),
      options.expectedPublishableKey,
    );
    if (decision !== 'block') {
      await route.fallback();
      return;
    }
    const { pathname } = requestTarget;
    guard.blockedRequests.push(`${requestMethod} ${pathname}`);
    await route.abort('blockedbyclient');
  });
  return guard;
}

export function assertNoBlockedProductionRequests(guard: ProductionRequestGuard): void {
  if (guard.blockedRequests.length > 0) {
    throw new Error(
      `Browser E2E attempted requests outside the verified production origin and read-only boundary: ${guard.blockedRequests.join(', ')}`,
    );
  }
}

export function assertLedgerControlledSaveDraftClosure(guard: ProductionRequestGuard): void {
  if (
    guard.allowedLedgerControlledSaveDraftRequests !==
    guard.expectedLedgerControlledSaveDraftRequests
  ) {
    throw new Error(
      'Ledger-controlled Process UI save did not execute exactly once inside its verified boundary.',
    );
  }
}
