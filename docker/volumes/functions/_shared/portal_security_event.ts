export const PORTAL_SECURITY_EVENT_SCHEMA = 'portal.security-event.v1';

export type PortalSecurityMode =
  'process_all_impacts' | 'processes_one_impact' | 'ranked_processes_one_impact';

export type PortalSecurityCacheStatus = 'not_checked' | 'hit' | 'miss' | 'invalid' | 'write_failed';

export type PortalSecurityHmacOutcome =
  | 'not_checked'
  | 'accepted'
  | 'config'
  | 'method'
  | 'path'
  | 'headers'
  | 'timestamp'
  | 'body_hash'
  | 'unknown_key'
  | 'signature';

export type PortalSecurityTransportOutcome =
  | 'not_checked'
  | 'accepted'
  | 'config'
  | 'apikey_missing'
  | 'apikey_invalid'
  | 'apikey_mismatch'
  | 'authorization_invalid'
  | 'cookie_invalid';

export type PortalSecurityBackend = 'none' | 'supabase_public_rpc';

export type PortalSecurityErrorCode =
  | 'method_not_allowed'
  | 'request_too_large'
  | 'portal_auth_unavailable'
  | 'portal_auth_failed'
  | 'guard_unavailable'
  | 'replay_rejected'
  | 'budget_exhausted'
  | 'concurrency_exhausted'
  | 'invalid_request'
  | 'published_lcia_unavailable'
  | 'internal_error';

export type PortalSecurityEvent = {
  schemaVersion: typeof PORTAL_SECURITY_EVENT_SCHEMA;
  route: 'portal_data_product_results_v1';
  correlationId: string;
  mode: PortalSecurityMode | null;
  cache: PortalSecurityCacheStatus;
  hmacOutcome: PortalSecurityHmacOutcome;
  transportOutcome: PortalSecurityTransportOutcome;
  backend: PortalSecurityBackend;
  latencyMs: number;
  rows: number | null;
  status: number;
  errorCode: PortalSecurityErrorCode | null;
  matchedKey: 'current' | 'previous' | null;
  recoveredLeaseCount: number;
  deploymentSha: string;
};

export type PortalSecurityLogger = (event: Readonly<PortalSecurityEvent>) => void | Promise<void>;

const MODES = new Set<PortalSecurityMode>([
  'process_all_impacts',
  'processes_one_impact',
  'ranked_processes_one_impact',
]);
const CACHE_STATUSES = new Set<PortalSecurityCacheStatus>([
  'not_checked',
  'hit',
  'miss',
  'invalid',
  'write_failed',
]);
const HMAC_OUTCOMES = new Set<PortalSecurityHmacOutcome>([
  'not_checked',
  'accepted',
  'config',
  'method',
  'path',
  'headers',
  'timestamp',
  'body_hash',
  'unknown_key',
  'signature',
]);
const TRANSPORT_OUTCOMES = new Set<PortalSecurityTransportOutcome>([
  'not_checked',
  'accepted',
  'config',
  'apikey_missing',
  'apikey_invalid',
  'apikey_mismatch',
  'authorization_invalid',
  'cookie_invalid',
]);
const BACKENDS = new Set<PortalSecurityBackend>(['none', 'supabase_public_rpc']);
const ERROR_CODES = new Set<PortalSecurityErrorCode>([
  'method_not_allowed',
  'request_too_large',
  'portal_auth_unavailable',
  'portal_auth_failed',
  'guard_unavailable',
  'replay_rejected',
  'budget_exhausted',
  'concurrency_exhausted',
  'invalid_request',
  'published_lcia_unavailable',
  'internal_error',
]);

export function normalizePortalSecurityErrorCode(value: unknown): PortalSecurityErrorCode {
  return typeof value === 'string' && ERROR_CODES.has(value as PortalSecurityErrorCode)
    ? (value as PortalSecurityErrorCode)
    : 'internal_error';
}

function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum
    ? Number(value)
    : fallback;
}

export function normalizePortalDeploymentSha(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase();
  return normalized && /^[0-9a-f]{40,64}$/u.test(normalized) ? normalized : 'unknown';
}

export function readPortalDeploymentSha(
  name: 'PORTAL_LCIA_DEPLOYMENT_SHA' | 'PORTAL_HYBRID_DEPLOYMENT_SHA',
  env: Pick<typeof Deno.env, 'get'> = Deno.env,
): string {
  try {
    return normalizePortalDeploymentSha(env.get(name));
  } catch (_error) {
    return 'unknown';
  }
}

const CORRELATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export function resolvePortalCorrelationId(headers: Headers): string {
  const inbound = headers.get('x-portal-correlation-id')?.trim();
  return inbound && CORRELATION_ID_PATTERN.test(inbound) ? inbound : crypto.randomUUID();
}

export function sanitizePortalSecurityEvent(
  event: Omit<PortalSecurityEvent, 'schemaVersion' | 'route'>,
): PortalSecurityEvent {
  return Object.freeze({
    schemaVersion: PORTAL_SECURITY_EVENT_SCHEMA,
    route: 'portal_data_product_results_v1',
    correlationId: CORRELATION_ID_PATTERN.test(event.correlationId)
      ? event.correlationId
      : crypto.randomUUID(),
    mode: event.mode !== null && MODES.has(event.mode) ? event.mode : null,
    cache: CACHE_STATUSES.has(event.cache) ? event.cache : 'not_checked',
    hmacOutcome: HMAC_OUTCOMES.has(event.hmacOutcome) ? event.hmacOutcome : 'not_checked',
    transportOutcome: TRANSPORT_OUTCOMES.has(event.transportOutcome)
      ? event.transportOutcome
      : 'not_checked',
    backend: BACKENDS.has(event.backend) ? event.backend : 'none',
    latencyMs: boundedInteger(event.latencyMs, 0, 0, 3_600_000),
    rows: event.rows === null ? null : boundedInteger(event.rows, 0, 0, 50),
    status: boundedInteger(event.status, 500, 100, 599),
    errorCode: event.errorCode === null ? null : normalizePortalSecurityErrorCode(event.errorCode),
    matchedKey:
      event.matchedKey === 'current' || event.matchedKey === 'previous' ? event.matchedKey : null,
    recoveredLeaseCount: boundedInteger(event.recoveredLeaseCount, 0, 0, 10_000),
    deploymentSha: normalizePortalDeploymentSha(event.deploymentSha),
  });
}

export const defaultPortalSecurityLogger: PortalSecurityLogger = (event) => {
  console.info(JSON.stringify(event));
};

export function emitPortalSecurityEvent(
  logger: PortalSecurityLogger,
  event: Omit<PortalSecurityEvent, 'schemaVersion' | 'route'>,
): void {
  try {
    const result = logger(sanitizePortalSecurityEvent(event));
    if (result && typeof (result as PromiseLike<void>).then === 'function') {
      void Promise.resolve(result).catch(() => undefined);
    }
  } catch (_error) {
    // Observability must never alter the response or widen the request authority boundary.
  }
}
