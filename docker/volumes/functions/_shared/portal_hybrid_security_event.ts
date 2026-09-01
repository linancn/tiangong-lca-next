import { PortalHmacError } from './portal_hmac.ts';
import { PortalTransportError } from './portal_public_transport.ts';
import {
  normalizePortalDeploymentSha,
  resolvePortalCorrelationId,
  type PortalSecurityHmacOutcome,
  type PortalSecurityTransportOutcome,
} from './portal_security_event.ts';

export const PORTAL_HYBRID_SECURITY_EVENT_SCHEMA = 'portal.hybrid-security-event.v1';
export const PORTAL_HYBRID_SECURITY_EVENT_DELIVERY_TIMEOUT_MS = 100;

export type PortalHybridErrorCode =
  | 'method_not_allowed'
  | 'request_too_large'
  | 'portal_auth_unavailable'
  | 'portal_auth_failed'
  | 'hybrid_disabled'
  | 'guard_unavailable'
  | 'replay_rejected'
  | 'budget_exhausted'
  | 'concurrency_exhausted'
  | 'circuit_open'
  | 'invalid_request'
  | 'hybrid_timeout'
  | 'hybrid_upstream_unavailable'
  | 'contract_failure'
  | 'internal_error';

export type PortalHybridSecurityEvent = {
  schemaVersion: typeof PORTAL_HYBRID_SECURITY_EVENT_SCHEMA;
  route: 'portal_hybrid_search_v1';
  correlationId: string;
  kind: 'process' | 'flow' | null;
  cache: 'not_checked' | 'hit' | 'miss' | 'invalid' | 'write_failed';
  hmacOutcome: PortalSecurityHmacOutcome;
  transportOutcome: PortalSecurityTransportOutcome;
  guardOutcome:
    | 'not_checked'
    | 'admitted'
    | 'replay_rejected'
    | 'budget_exhausted'
    | 'concurrency_exhausted'
    | 'unavailable';
  circuit:
    'not_checked' | 'closed' | 'open' | 'failure_recorded' | 'record_failed' | 'reset_failed';
  model: 'not_called' | 'cache_hit' | 'called' | 'failed' | 'aborted';
  rewriteOutcome: 'not_called' | 'cache_hit' | 'called' | 'succeeded' | 'failed' | 'aborted';
  embeddingOutcome: 'not_called' | 'cache_hit' | 'called' | 'succeeded' | 'failed' | 'aborted';
  rewriteLatencyMs: number | null;
  embeddingLatencyMs: number | null;
  database: 'not_called' | 'called' | 'failed' | 'contract_failed';
  latencyMs: number;
  items: number | null;
  status: number;
  errorCode: PortalHybridErrorCode | null;
  matchedKey: 'current' | 'previous' | null;
  recoveredLeaseCount: number;
  deploymentSha: string;
};

export type PortalHybridSecurityLogger = (
  event: Readonly<PortalHybridSecurityEvent>,
) => void | Promise<void>;

const ERROR_CODES = new Set<PortalHybridErrorCode>([
  'method_not_allowed',
  'request_too_large',
  'portal_auth_unavailable',
  'portal_auth_failed',
  'hybrid_disabled',
  'guard_unavailable',
  'replay_rejected',
  'budget_exhausted',
  'concurrency_exhausted',
  'circuit_open',
  'invalid_request',
  'hybrid_timeout',
  'hybrid_upstream_unavailable',
  'contract_failure',
  'internal_error',
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
const CACHE_OUTCOMES = new Set<PortalHybridSecurityEvent['cache']>([
  'not_checked',
  'hit',
  'miss',
  'invalid',
  'write_failed',
]);
const GUARD_OUTCOMES = new Set<PortalHybridSecurityEvent['guardOutcome']>([
  'not_checked',
  'admitted',
  'replay_rejected',
  'budget_exhausted',
  'concurrency_exhausted',
  'unavailable',
]);
const CIRCUIT_OUTCOMES = new Set<PortalHybridSecurityEvent['circuit']>([
  'not_checked',
  'closed',
  'open',
  'failure_recorded',
  'record_failed',
  'reset_failed',
]);
const MODEL_OUTCOMES = new Set<PortalHybridSecurityEvent['model']>([
  'not_called',
  'cache_hit',
  'called',
  'failed',
  'aborted',
]);
const PROVIDER_OUTCOMES = new Set<PortalHybridSecurityEvent['rewriteOutcome']>([
  'not_called',
  'cache_hit',
  'called',
  'succeeded',
  'failed',
  'aborted',
]);
const DATABASE_OUTCOMES = new Set<PortalHybridSecurityEvent['database']>([
  'not_called',
  'called',
  'failed',
  'contract_failed',
]);
const CORRELATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

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

function boundedNullableInteger(value: unknown, minimum: number, maximum: number): number | null {
  if (value === null) return null;
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum
    ? Number(value)
    : null;
}

export function normalizePortalHybridErrorCode(value: unknown): PortalHybridErrorCode {
  return typeof value === 'string' && ERROR_CODES.has(value as PortalHybridErrorCode)
    ? (value as PortalHybridErrorCode)
    : 'internal_error';
}

export function portalHybridHmacOutcome(error: unknown): PortalSecurityHmacOutcome {
  if (!(error instanceof PortalHmacError)) return 'config';
  switch (error.code) {
    case 'portal_hmac_config_invalid':
      return 'config';
    case 'portal_hmac_method_invalid':
      return 'method';
    case 'portal_hmac_path_invalid':
      return 'path';
    case 'portal_hmac_headers_missing':
    case 'portal_hmac_headers_invalid':
      return 'headers';
    case 'portal_hmac_timestamp_expired':
      return 'timestamp';
    case 'portal_hmac_body_hash_mismatch':
      return 'body_hash';
    case 'portal_hmac_key_unknown':
      return 'unknown_key';
    case 'portal_hmac_signature_invalid':
      return 'signature';
  }
}

export function portalHybridTransportOutcome(error: unknown): PortalSecurityTransportOutcome {
  if (!(error instanceof PortalTransportError)) return 'config';
  switch (error.code) {
    case 'portal_transport_config_invalid':
      return 'config';
    case 'portal_apikey_missing':
      return 'apikey_missing';
    case 'portal_apikey_invalid':
      return 'apikey_invalid';
    case 'portal_apikey_mismatch':
      return 'apikey_mismatch';
    case 'portal_authorization_invalid':
      return 'authorization_invalid';
    case 'portal_cookie_invalid':
      return 'cookie_invalid';
  }
}

export function sanitizePortalHybridSecurityEvent(
  event: Omit<PortalHybridSecurityEvent, 'schemaVersion' | 'route'>,
): PortalHybridSecurityEvent {
  return Object.freeze({
    schemaVersion: PORTAL_HYBRID_SECURITY_EVENT_SCHEMA,
    route: 'portal_hybrid_search_v1',
    correlationId: CORRELATION_ID_PATTERN.test(event.correlationId)
      ? event.correlationId
      : crypto.randomUUID(),
    kind: event.kind === 'process' || event.kind === 'flow' ? event.kind : null,
    cache: CACHE_OUTCOMES.has(event.cache) ? event.cache : 'not_checked',
    hmacOutcome: HMAC_OUTCOMES.has(event.hmacOutcome) ? event.hmacOutcome : 'not_checked',
    transportOutcome: TRANSPORT_OUTCOMES.has(event.transportOutcome)
      ? event.transportOutcome
      : 'not_checked',
    guardOutcome: GUARD_OUTCOMES.has(event.guardOutcome) ? event.guardOutcome : 'not_checked',
    circuit: CIRCUIT_OUTCOMES.has(event.circuit) ? event.circuit : 'not_checked',
    model: MODEL_OUTCOMES.has(event.model) ? event.model : 'not_called',
    rewriteOutcome: PROVIDER_OUTCOMES.has(event.rewriteOutcome)
      ? event.rewriteOutcome
      : 'not_called',
    embeddingOutcome: PROVIDER_OUTCOMES.has(event.embeddingOutcome)
      ? event.embeddingOutcome
      : 'not_called',
    rewriteLatencyMs: boundedNullableInteger(event.rewriteLatencyMs, 0, 3_600_000),
    embeddingLatencyMs: boundedNullableInteger(event.embeddingLatencyMs, 0, 3_600_000),
    database: DATABASE_OUTCOMES.has(event.database) ? event.database : 'not_called',
    latencyMs: boundedInteger(event.latencyMs, 0, 0, 3_600_000),
    items: event.items === null ? null : boundedInteger(event.items, 0, 0, 20),
    status: boundedInteger(event.status, 500, 100, 599),
    errorCode: event.errorCode === null ? null : normalizePortalHybridErrorCode(event.errorCode),
    matchedKey:
      event.matchedKey === 'current' || event.matchedKey === 'previous' ? event.matchedKey : null,
    recoveredLeaseCount: boundedInteger(event.recoveredLeaseCount, 0, 0, 10_000),
    deploymentSha: normalizePortalDeploymentSha(event.deploymentSha),
  });
}

export const defaultPortalHybridSecurityLogger: PortalHybridSecurityLogger = (event) => {
  console.info(JSON.stringify(event));
};

type PortalHybridEdgeRuntime = {
  waitUntil?: (promise: Promise<unknown>) => void;
};

function resolvePortalHybridWaitUntil(): ((promise: Promise<unknown>) => void) | null {
  try {
    const runtime = Reflect.get(globalThis, 'EdgeRuntime') as PortalHybridEdgeRuntime | undefined;
    return typeof runtime?.waitUntil === 'function' ? runtime.waitUntil.bind(runtime) : null;
  } catch (_error) {
    return null;
  }
}

function runPortalHybridSecurityLogger(
  logger: PortalHybridSecurityLogger,
  event: Readonly<PortalHybridSecurityEvent>,
): Promise<void> {
  const loggerPromise = Promise.resolve()
    .then(() => logger(event))
    .then(
      () => undefined,
      () => undefined,
    );
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<void>((resolve) => {
    timeoutId = setTimeout(resolve, PORTAL_HYBRID_SECURITY_EVENT_DELIVERY_TIMEOUT_MS);
  });
  return Promise.race([loggerPromise, timeoutPromise])
    .then(() => undefined)
    .finally(() => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    });
}

export function schedulePortalHybridSecurityEvent(
  logger: PortalHybridSecurityLogger,
  event: Readonly<PortalHybridSecurityEvent>,
): void {
  const delivery = new Promise<void>((resolve) => {
    setTimeout(() => {
      void runPortalHybridSecurityLogger(logger, event).then(resolve, resolve);
    }, 0);
  });

  const waitUntil = resolvePortalHybridWaitUntil();
  if (waitUntil) {
    try {
      waitUntil(delivery);
      return;
    } catch (_error) {
      // The scheduled fallback still owns and observes the delivery promise.
    }
  }
  void delivery.catch(() => undefined);
}

export { resolvePortalCorrelationId };
