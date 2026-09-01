import '@supabase/functions-js/edge-runtime.d.ts';

import { extractEmbeddingVector } from '../_shared/embedding_vector.ts';
import {
  buildHybridFulltextQueryTerms,
  sanitizeHybridQueryOutput,
  type HybridSearchQuery,
} from '../_shared/hybrid_query_utils.ts';
import {
  portalHybridModelCacheSchema,
  portalHybridSearchPageSchema,
  portalHybridSearchRequestSchema,
  type PortalHybridInterpretation,
  type PortalHybridModelCache,
  type PortalHybridSearchPage,
  type PortalHybridSearchRequest,
} from '../_shared/portal_hybrid_contract.ts';
import {
  isPortalHybridDeadlineError,
  PortalHybridDeadline,
  PortalHybridDeadlineError,
} from '../_shared/portal_hybrid_deadline.ts';
import {
  generatePortalHybridSearchEmbedding,
  rewritePortalHybridSearchQuery,
  type PortalHybridKernelConfig,
  type PortalHybridKernelProviderConfig,
} from '../_shared/portal_hybrid_kernel.ts';
import {
  defaultPortalHybridSecurityLogger,
  normalizePortalHybridErrorCode,
  portalHybridHmacOutcome,
  portalHybridTransportOutcome,
  resolvePortalCorrelationId,
  sanitizePortalHybridSecurityEvent,
  schedulePortalHybridSecurityEvent,
  type PortalHybridErrorCode,
  type PortalHybridSecurityEvent,
  type PortalHybridSecurityLogger,
} from '../_shared/portal_hybrid_security_event.ts';
import {
  createPortalHybridRepository,
  PortalHybridRepositoryError,
  PORTAL_HYBRID_MAX_RESPONSE_BYTES,
  type PortalHybridRepository,
} from '../_shared/portal_hybrid_repository.ts';
import { readPortalHybridProviderConfig } from '../_shared/portal_hybrid_provider.ts';
import {
  loadPortalHmacKeyring,
  PortalHmacError,
  type PortalHmacKeyring,
  verifyPortalHmacRequest,
} from '../_shared/portal_hmac.ts';
import {
  PORTAL_HYBRID_TOTAL_TIMEOUT_MS,
  readPortalHybridCircuitLimits,
  readPortalHybridGuardLimits,
  readPortalHybridTotalTimeoutMs,
  readPortalResponseCache,
  recordPortalHybridCircuitFailure,
  recordPortalHybridCircuitSuccess,
  redisEvalAtomicHybridBegin,
  releasePortalConcurrencyLease,
  type PortalGuardTiming,
  type PortalHybridCircuitLimits,
  type PortalRouteGuardLimits,
  validatePortalHybridGuardLimits,
  writePortalResponseCache,
} from '../_shared/portal_redis_guard.ts';
import {
  PortalTransportError,
  readPortalLegacyAnonCredential,
  readPortalPublishableCredential,
  readPortalRawBody,
  validatePortalInboundTransport,
  validatePortalPublishableCredential,
} from '../_shared/portal_public_transport.ts';
import {
  createPortalRedisAdapter,
  type PortalRedisAdapter,
  PortalRedisError,
  readPortalRedisTimeoutMs,
} from '../_shared/redis_client.ts';
import { readPortalDeploymentSha } from '../_shared/portal_security_event.ts';

export const PORTAL_HYBRID_FUNCTION_NAME = 'portal_hybrid_search_v1';
export const PORTAL_HYBRID_FUNCTION_PATH = `/functions/v1/${PORTAL_HYBRID_FUNCTION_NAME}`;
export const PORTAL_HYBRID_RUNTIME_PATH = `/${PORTAL_HYBRID_FUNCTION_NAME}`;
export const PORTAL_HYBRID_MAX_REQUEST_BYTES = 32 * 1024;

type PortalHybridHandlerOptions = {
  keyring?: PortalHmacKeyring;
  redis?: PortalRedisAdapter;
  redisFactory?: () => Promise<PortalRedisAdapter>;
  guardLimits?: PortalRouteGuardLimits;
  circuitLimits?: PortalHybridCircuitLimits;
  repository?: PortalHybridRepository;
  repositoryFactory?: (trustedPublishableKey: string) => PortalHybridRepository;
  rewriteQuery?: (
    config: PortalHybridKernelConfig,
    query: string,
    signal: AbortSignal,
    provider?: Readonly<PortalHybridKernelProviderConfig>,
  ) => Promise<HybridSearchQuery>;
  generateEmbedding?: (
    semanticQuery: string,
    signal: AbortSignal,
    provider?: Readonly<PortalHybridKernelProviderConfig>,
  ) => Promise<number[]>;
  providerConfig?: Readonly<PortalHybridKernelProviderConfig>;
  providerConfigFactory?: () => Readonly<PortalHybridKernelProviderConfig>;
  enabled?: boolean;
  nowSeconds?: () => number;
  nowMillis?: () => number;
  timeoutMs?: number;
  redisTimeoutMs?: number;
  trustedPublishableKey?: string;
  trustedLegacyAnonKey?: string | null;
  deploymentSha?: string;
  logger?: PortalHybridSecurityLogger;
  scheduleSecurityEvent?: typeof schedulePortalHybridSecurityEvent;
  monotonicNow?: () => number;
};

type MutableHybridEventState = Pick<
  PortalHybridSecurityEvent,
  | 'kind'
  | 'cache'
  | 'hmacOutcome'
  | 'transportOutcome'
  | 'guardOutcome'
  | 'circuit'
  | 'model'
  | 'rewriteOutcome'
  | 'embeddingOutcome'
  | 'rewriteLatencyMs'
  | 'embeddingLatencyMs'
  | 'database'
  | 'items'
  | 'matchedKey'
  | 'recoveredLeaseCount'
>;

export function isPortalHybridEnabled(env: Pick<typeof Deno.env, 'get'> = Deno.env): boolean {
  return env.get('PORTAL_HYBRID_ENABLED') === 'true';
}

function jsonResponse(status: number, payload: unknown, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

function errorResponse(status: number, code: PortalHybridErrorCode, message: string): Response {
  return jsonResponse(status, { code, message });
}

function authFailure(error: unknown): Response {
  if (error instanceof PortalHmacError && error.code === 'portal_hmac_config_invalid') {
    return errorResponse(
      503,
      'portal_auth_unavailable',
      'Portal request authentication unavailable',
    );
  }
  if (error instanceof PortalHmacError && error.code === 'portal_hmac_method_invalid') {
    return errorResponse(405, 'method_not_allowed', 'Only POST is supported');
  }
  return errorResponse(401, 'portal_auth_failed', 'Portal request authentication failed');
}

function validateCircuitLimits(limits: PortalHybridCircuitLimits): PortalHybridCircuitLimits {
  const bounded = (value: number, minimum: number, maximum: number) =>
    Number.isSafeInteger(value) && value >= minimum && value <= maximum;
  if (
    !bounded(limits.failureThreshold, 1, 100) ||
    !bounded(limits.failureWindowSeconds, 1, 3_600) ||
    !bounded(limits.openSeconds, 1, 3_600)
  ) {
    throw new PortalRedisError();
  }
  return limits;
}

function buildKernelConfig(kind: PortalHybridSearchRequest['kind']): PortalHybridKernelConfig {
  return {
    functionName: PORTAL_HYBRID_FUNCTION_NAME,
    entityLabel: kind === 'process' ? 'Process' : 'Flow',
    entityPlural: kind === 'process' ? 'processes' : 'flows',
  };
}

function isHybridSearchQuery(value: unknown): value is HybridSearchQuery {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return (
    keys.length === 3 &&
    keys[0] === 'fulltext_query_en' &&
    keys[1] === 'fulltext_query_zh' &&
    keys[2] === 'semantic_query_en' &&
    typeof record.semantic_query_en === 'string' &&
    Array.isArray(record.fulltext_query_en) &&
    record.fulltext_query_en.every((item) => typeof item === 'string') &&
    Array.isArray(record.fulltext_query_zh) &&
    record.fulltext_query_zh.every((item) => typeof item === 'string')
  );
}

function uniqueInterpretationTerms(
  normalized: HybridSearchQuery,
): PortalHybridInterpretation['terms'] {
  const values: PortalHybridInterpretation['terms'] = [];
  const seen = new Set<string>();
  for (const [language, terms] of [
    ['en', normalized.fulltext_query_en],
    ['zh-CN', normalized.fulltext_query_zh],
  ] as const) {
    for (const value of terms) {
      const key = `${language}\u0000${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      values.push({ language, value });
    }
  }
  if (values.length === 0 && normalized.semantic_query_en) {
    values.push({ language: 'en', value: normalized.semantic_query_en });
  }
  return values.slice(0, 12);
}

function buildModelCache(
  rawRewrite: HybridSearchQuery,
  request: PortalHybridSearchRequest,
  embedding: number[],
): PortalHybridModelCache {
  const modelOnly = sanitizeHybridQueryOutput(rawRewrite, '');
  const retrieval = sanitizeHybridQueryOutput(rawRewrite, request.query);
  if (!modelOnly.semantic_query_en || !retrieval.semantic_query_en) {
    throw new PortalHybridRepositoryError('contract_failure');
  }
  const queryTerms = buildHybridFulltextQueryTerms(modelOnly).slice(0, 12);
  const candidate = {
    schemaVersion: 'portal.hybrid-model-cache.v1' as const,
    interpretation: {
      source: 'model_generated' as const,
      advisory: true as const,
      semanticQuery: modelOnly.semantic_query_en,
      terms: uniqueInterpretationTerms(modelOnly),
    },
    queryTerms,
    queryEmbedding: extractEmbeddingVector(embedding),
  };
  const parsed = portalHybridModelCacheSchema.safeParse(candidate);
  if (!parsed.success) throw new PortalHybridRepositoryError('contract_failure');
  return parsed.data;
}

function retrievalTermsFromModelCache(cache: PortalHybridModelCache, query: string): string[] {
  const normalizedModelQuery: HybridSearchQuery = {
    semantic_query_en: cache.interpretation.semanticQuery,
    fulltext_query_en: cache.interpretation.terms
      .filter((term) => term.language === 'en')
      .map((term) => term.value),
    fulltext_query_zh: cache.interpretation.terms
      .filter((term) => term.language === 'zh-CN')
      .map((term) => term.value),
  };
  return buildHybridFulltextQueryTerms(
    sanitizeHybridQueryOutput(normalizedModelQuery, query),
  ).slice(0, 12);
}

async function responseErrorCode(response: Response): Promise<PortalHybridErrorCode | null> {
  if (response.status < 400) return null;
  try {
    const payload = await response.clone().json();
    return normalizePortalHybridErrorCode(
      payload && typeof payload === 'object' ? (payload as Record<string, unknown>).code : null,
    );
  } catch (_error) {
    return 'internal_error';
  }
}

export function createPortalHybridSearchHandler(options: PortalHybridHandlerOptions = {}) {
  return async (request: Request): Promise<Response> => {
    const monotonicNow = () => {
      if (options.monotonicNow) {
        try {
          const value = options.monotonicNow();
          if (Number.isFinite(value)) return value;
        } catch (_error) {
          // Fall through to the runtime monotonic clock.
        }
      }
      return performance.now();
    };
    const startedAt = monotonicNow();
    let timeoutMs = PORTAL_HYBRID_TOTAL_TIMEOUT_MS;
    let timeoutConfigurationValid = true;
    try {
      timeoutMs = options.timeoutMs ?? readPortalHybridTotalTimeoutMs();
      if (
        !Number.isSafeInteger(timeoutMs) ||
        timeoutMs < 100 ||
        timeoutMs > PORTAL_HYBRID_TOTAL_TIMEOUT_MS
      ) {
        timeoutConfigurationValid = false;
        timeoutMs = PORTAL_HYBRID_TOTAL_TIMEOUT_MS;
      }
    } catch (_error) {
      timeoutConfigurationValid = false;
      timeoutMs = PORTAL_HYBRID_TOTAL_TIMEOUT_MS;
    }
    const deadline = new PortalHybridDeadline(timeoutMs, monotonicNow, startedAt);
    const operationController = new AbortController();
    const abortOperations = () => operationController.abort();
    if (deadline.signal.aborted) {
      abortOperations();
    } else {
      deadline.signal.addEventListener('abort', abortOperations, { once: true });
    }
    const operationSignal = operationController.signal;
    const correlationId = resolvePortalCorrelationId(request.headers);
    const event: MutableHybridEventState = {
      kind: null,
      cache: 'not_checked',
      hmacOutcome: 'not_checked',
      transportOutcome: 'not_checked',
      guardOutcome: 'not_checked',
      circuit: 'not_checked',
      model: 'not_called',
      rewriteOutcome: 'not_called',
      embeddingOutcome: 'not_called',
      rewriteLatencyMs: null,
      embeddingLatencyMs: null,
      database: 'not_called',
      items: null,
      matchedKey: null,
      recoveredLeaseCount: 0,
    };
    let rewriteStartedAt: number | null = null;
    let embeddingStartedAt: number | null = null;
    const runProviderStage = async <T>(
      stage: 'rewrite' | 'embedding',
      operation: () => Promise<T>,
    ): Promise<T> => {
      const stageStartedAt = monotonicNow();
      if (stage === 'rewrite') {
        rewriteStartedAt = stageStartedAt;
        event.rewriteOutcome = 'called';
      } else {
        embeddingStartedAt = stageStartedAt;
        event.embeddingOutcome = 'called';
      }
      try {
        const value = await operation();
        if (stage === 'rewrite') event.rewriteOutcome = 'succeeded';
        else event.embeddingOutcome = 'succeeded';
        return value;
      } catch (error) {
        const outcome = operationSignal.aborted || deadline.isExpired() ? 'aborted' : 'failed';
        if (stage === 'rewrite') event.rewriteOutcome = outcome;
        else event.embeddingOutcome = outcome;
        throw error;
      } finally {
        const latencyMs = Math.max(0, Math.round(monotonicNow() - stageStartedAt));
        if (stage === 'rewrite') event.rewriteLatencyMs = latencyMs;
        else event.embeddingLatencyMs = latencyMs;
      }
    };
    const markPendingProviderStagesAborted = () => {
      if (event.rewriteOutcome === 'called') {
        event.rewriteOutcome = 'aborted';
        event.rewriteLatencyMs = Math.max(
          0,
          Math.round(monotonicNow() - (rewriteStartedAt ?? startedAt)),
        );
      }
      if (event.embeddingOutcome === 'called') {
        event.embeddingOutcome = 'aborted';
        event.embeddingLatencyMs = Math.max(
          0,
          Math.round(monotonicNow() - (embeddingStartedAt ?? startedAt)),
        );
      }
    };
    const timeoutResponse = () =>
      errorResponse(503, 'hybrid_timeout', 'Portal Hybrid search timed out');

    const execute = async (): Promise<Response> => {
      let rawBody: Uint8Array;
      try {
        rawBody = await deadline.run(() =>
          readPortalRawBody(request, PORTAL_HYBRID_MAX_REQUEST_BYTES),
        );
      } catch (error) {
        if (isPortalHybridDeadlineError(error)) return timeoutResponse();
        return errorResponse(413, 'request_too_large', 'Request body exceeds the allowed size');
      }

      let verification;
      try {
        verification = await deadline.run(() =>
          verifyPortalHmacRequest({
            request,
            rawBody,
            expectedFunctionPath: PORTAL_HYBRID_FUNCTION_PATH,
            allowedRequestPaths: [PORTAL_HYBRID_FUNCTION_PATH, PORTAL_HYBRID_RUNTIME_PATH],
            keyring: options.keyring ?? loadPortalHmacKeyring(),
            nowSeconds: options.nowSeconds?.(),
          }),
        );
        event.hmacOutcome = 'accepted';
        event.matchedKey = verification.matchedKey;
      } catch (error) {
        if (isPortalHybridDeadlineError(error)) return timeoutResponse();
        event.hmacOutcome = portalHybridHmacOutcome(error);
        return authFailure(error);
      }

      let trustedPublishableKey: string;
      try {
        trustedPublishableKey = validatePortalPublishableCredential(
          options.trustedPublishableKey ?? readPortalPublishableCredential(),
        );
        validatePortalInboundTransport({
          request,
          trustedPublishableKey,
          trustedLegacyAnonKey:
            options.trustedLegacyAnonKey === undefined
              ? request.headers.has('authorization')
                ? readPortalLegacyAnonCredential()
                : null
              : options.trustedLegacyAnonKey,
        });
        event.transportOutcome = 'accepted';
      } catch (error) {
        event.transportOutcome = portalHybridTransportOutcome(error);
        if (
          !(error instanceof PortalTransportError) ||
          error.code === 'portal_transport_config_invalid'
        ) {
          return errorResponse(
            503,
            'portal_auth_unavailable',
            'Portal request authentication unavailable',
          );
        }
        return errorResponse(401, 'portal_auth_failed', 'Portal request authentication failed');
      }

      if (!(options.enabled ?? isPortalHybridEnabled())) {
        return errorResponse(503, 'hybrid_disabled', 'Portal Hybrid search is disabled');
      }

      let providerConfig: Readonly<PortalHybridKernelProviderConfig>;
      try {
        providerConfig =
          options.providerConfig ??
          options.providerConfigFactory?.() ??
          readPortalHybridProviderConfig();
      } catch (_error) {
        return errorResponse(
          503,
          'hybrid_upstream_unavailable',
          'Portal Hybrid search unavailable',
        );
      }

      let repository: PortalHybridRepository;
      try {
        repository =
          options.repository ??
          options.repositoryFactory?.(trustedPublishableKey) ??
          createPortalHybridRepository({ publishableKey: trustedPublishableKey });
      } catch (_error) {
        return errorResponse(
          503,
          'hybrid_upstream_unavailable',
          'Portal Hybrid search unavailable',
        );
      }

      let guardLimits: PortalRouteGuardLimits;
      let circuitLimits: PortalHybridCircuitLimits;
      try {
        if (!timeoutConfigurationValid) {
          throw new PortalRedisError();
        }
        const timing: PortalGuardTiming = {
          redisTimeoutMs: options.redisTimeoutMs ?? readPortalRedisTimeoutMs(),
          upstreamTimeoutMs: timeoutMs,
        };
        guardLimits = options.guardLimits
          ? validatePortalHybridGuardLimits(options.guardLimits, timing)
          : readPortalHybridGuardLimits(Deno.env, timing);
        circuitLimits = options.circuitLimits
          ? validateCircuitLimits(options.circuitLimits)
          : readPortalHybridCircuitLimits();
      } catch (_error) {
        event.guardOutcome = 'unavailable';
        return errorResponse(503, 'guard_unavailable', 'Portal request guard unavailable');
      }

      const wallNow = () => options.nowMillis?.() ?? Date.now();
      let redis: PortalRedisAdapter;
      let ownsRedis = false;
      try {
        redis =
          options.redis ??
          (await deadline.run(() => (options.redisFactory ?? createPortalRedisAdapter)()));
        ownsRedis = options.redis === undefined;
      } catch (error) {
        if (isPortalHybridDeadlineError(error)) return timeoutResponse();
        event.guardOutcome = 'unavailable';
        return errorResponse(503, 'guard_unavailable', 'Portal request guard unavailable');
      }

      let leaseId: string | undefined;
      let pendingModelCacheWrite: Promise<void> | null = null;
      const recordFailure = async (): Promise<boolean> => {
        try {
          await deadline.run(() =>
            recordPortalHybridCircuitFailure(
              { route: PORTAL_HYBRID_FUNCTION_NAME, limits: circuitLimits, nowMillis: wallNow() },
              redis,
            ),
          );
          event.circuit = 'failure_recorded';
          return true;
        } catch (_error) {
          event.circuit = 'record_failed';
          return !deadline.isExpired();
        }
      };
      const responseAfterCircuitFailure = async (response: Response): Promise<Response> =>
        (await recordFailure()) && !deadline.isExpired() ? response : timeoutResponse();

      try {
        let begin;
        try {
          begin = await deadline.run(() =>
            redisEvalAtomicHybridBegin(
              {
                route: PORTAL_HYBRID_FUNCTION_NAME,
                keyId: verification.keyId,
                nonce: verification.nonce,
                limits: guardLimits,
                nowMillis: wallNow(),
              },
              redis,
            ),
          );
        } catch (error) {
          if (isPortalHybridDeadlineError(error)) return timeoutResponse();
          event.guardOutcome = 'unavailable';
          return errorResponse(503, 'guard_unavailable', 'Portal request guard unavailable');
        }
        event.recoveredLeaseCount = begin.recoveredLeaseCount;
        if (begin.status === 'replay_rejected') {
          event.guardOutcome = 'replay_rejected';
          return errorResponse(403, 'replay_rejected', 'Portal request replay rejected');
        }
        if (begin.status === 'budget_exhausted') {
          event.guardOutcome = 'budget_exhausted';
          return errorResponse(429, 'budget_exhausted', 'Portal route budget exhausted');
        }
        if (begin.status === 'concurrency_exhausted') {
          event.guardOutcome = 'concurrency_exhausted';
          return errorResponse(429, 'concurrency_exhausted', 'Portal route concurrency exhausted');
        }
        leaseId = begin.leaseId;
        event.guardOutcome = 'admitted';
        if (begin.status === 'circuit_open') {
          event.circuit = 'open';
          return errorResponse(503, 'circuit_open', 'Portal Hybrid circuit is open');
        }
        event.circuit = 'closed';

        if (deadline.isExpired()) return timeoutResponse();

        let payload: unknown;
        try {
          payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(rawBody));
        } catch (_error) {
          return errorResponse(400, 'invalid_request', 'Invalid Portal Hybrid request');
        }
        const parsedRequest = portalHybridSearchRequestSchema.safeParse(payload);
        if (!parsedRequest.success) {
          return errorResponse(400, 'invalid_request', 'Invalid Portal Hybrid request');
        }
        const hybridRequest = parsedRequest.data;
        event.kind = hybridRequest.kind;

        let cached: string | null;
        try {
          cached = await deadline.run(() =>
            readPortalResponseCache(
              { route: PORTAL_HYBRID_FUNCTION_NAME, bodyHash: verification.bodyHash },
              redis,
            ),
          );
        } catch (error) {
          if (isPortalHybridDeadlineError(error)) return timeoutResponse();
          event.cache = 'invalid';
          event.guardOutcome = 'unavailable';
          return errorResponse(503, 'guard_unavailable', 'Portal request guard unavailable');
        }

        let modelCache: PortalHybridModelCache;
        if (cached !== null) {
          let parsedCache;
          try {
            parsedCache = portalHybridModelCacheSchema.safeParse(JSON.parse(cached));
          } catch (_error) {
            parsedCache = { success: false } as const;
          }
          if (!parsedCache.success) {
            event.cache = 'invalid';
            return await responseAfterCircuitFailure(
              errorResponse(503, 'contract_failure', 'Portal Hybrid contract unavailable'),
            );
          }
          event.cache = 'hit';
          event.model = 'cache_hit';
          event.rewriteOutcome = 'cache_hit';
          event.embeddingOutcome = 'cache_hit';
          modelCache = parsedCache.data;
        } else {
          event.cache = 'miss';
          if (deadline.isExpired()) return timeoutResponse();
          let rawRewrite: unknown;
          let embedding: number[];
          event.model = 'called';
          try {
            [rawRewrite, embedding] = await deadline.run(() =>
              Promise.all([
                runProviderStage('rewrite', () =>
                  (options.rewriteQuery ?? rewritePortalHybridSearchQuery)(
                    buildKernelConfig(hybridRequest.kind),
                    hybridRequest.query,
                    operationSignal,
                    providerConfig,
                  ),
                ),
                runProviderStage('embedding', () =>
                  (options.generateEmbedding ?? generatePortalHybridSearchEmbedding)(
                    hybridRequest.query,
                    operationSignal,
                    providerConfig,
                  ),
                ),
              ]),
            );
          } catch (error) {
            event.model = deadline.signal.aborted ? 'aborted' : 'failed';
            abortOperations();
            markPendingProviderStagesAborted();
            const code =
              typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : null;
            return await responseAfterCircuitFailure(
              isPortalHybridDeadlineError(error) || deadline.isExpired()
                ? timeoutResponse()
                : code === 'EMBEDDING_VECTOR_MISSING' || code === 'EMBEDDING_DIMENSION_MISMATCH'
                  ? errorResponse(503, 'contract_failure', 'Portal Hybrid contract unavailable')
                  : errorResponse(
                      503,
                      'hybrid_upstream_unavailable',
                      'Portal Hybrid search unavailable',
                    ),
            );
          }

          if (!isHybridSearchQuery(rawRewrite)) {
            event.model = 'failed';
            return await responseAfterCircuitFailure(
              errorResponse(503, 'contract_failure', 'Portal Hybrid contract unavailable'),
            );
          }

          const modelOnly = sanitizeHybridQueryOutput(rawRewrite, '');
          if (!modelOnly.semantic_query_en) {
            event.model = 'failed';
            return await responseAfterCircuitFailure(
              errorResponse(503, 'contract_failure', 'Portal Hybrid contract unavailable'),
            );
          }

          try {
            modelCache = buildModelCache(rawRewrite, hybridRequest, embedding);
          } catch (error) {
            event.model = 'failed';
            if (error instanceof PortalHybridRepositoryError && error.code === 'contract_failure') {
              return await responseAfterCircuitFailure(
                errorResponse(503, 'contract_failure', 'Portal Hybrid contract unavailable'),
              );
            }
            const code =
              typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : null;
            return await responseAfterCircuitFailure(
              code === 'EMBEDDING_VECTOR_MISSING' || code === 'EMBEDDING_DIMENSION_MISMATCH'
                ? errorResponse(503, 'contract_failure', 'Portal Hybrid contract unavailable')
                : errorResponse(
                    503,
                    'hybrid_upstream_unavailable',
                    'Portal Hybrid search unavailable',
                  ),
            );
          }

          pendingModelCacheWrite = deadline
            .run(() =>
              writePortalResponseCache(
                {
                  route: PORTAL_HYBRID_FUNCTION_NAME,
                  bodyHash: verification.bodyHash,
                  value: JSON.stringify(modelCache),
                  ttlSeconds: guardLimits.cacheTtlSeconds,
                },
                redis,
              ),
            )
            .catch((error) => {
              if (isPortalHybridDeadlineError(error)) throw error;
              event.cache = 'write_failed';
            });
        }

        if (deadline.isExpired()) {
          event.model = event.model === 'called' ? 'aborted' : event.model;
          markPendingProviderStagesAborted();
          return await responseAfterCircuitFailure(timeoutResponse());
        }

        const queryTerms = retrievalTermsFromModelCache(modelCache, hybridRequest.query);

        let databasePage;
        try {
          if (deadline.isExpired()) return timeoutResponse();
          event.database = 'called';
          const databaseOperation = deadline.run(() =>
            repository.query(hybridRequest, queryTerms, modelCache.queryEmbedding, operationSignal),
          );
          if (pendingModelCacheWrite) {
            const [databaseResult, cacheWriteResult] = await Promise.allSettled([
              databaseOperation,
              pendingModelCacheWrite,
            ]);
            if (cacheWriteResult.status === 'rejected') throw cacheWriteResult.reason;
            if (databaseResult.status === 'rejected') throw databaseResult.reason;
            databasePage = databaseResult.value;
          } else {
            databasePage = await databaseOperation;
          }
        } catch (error) {
          if (isPortalHybridDeadlineError(error) || deadline.isExpired()) {
            event.database = 'failed';
            return await responseAfterCircuitFailure(timeoutResponse());
          }
          const contractFailure =
            error instanceof PortalHybridRepositoryError && error.code === 'contract_failure';
          event.database = contractFailure ? 'contract_failed' : 'failed';
          return await responseAfterCircuitFailure(
            contractFailure
              ? errorResponse(503, 'contract_failure', 'Portal Hybrid contract unavailable')
              : errorResponse(
                  503,
                  'hybrid_upstream_unavailable',
                  'Portal Hybrid search unavailable',
                ),
          );
        }

        const edgePage: PortalHybridSearchPage = {
          schemaVersion: 'portal.hybrid-search-page.v1',
          kind: databasePage.kind,
          queryFingerprint: databasePage.queryFingerprint,
          interpretation: modelCache.interpretation,
          items: databasePage.items,
        };
        const parsedPage = portalHybridSearchPageSchema.safeParse(edgePage);
        if (!parsedPage.success || parsedPage.data.kind !== hybridRequest.kind) {
          event.database = 'contract_failed';
          return await responseAfterCircuitFailure(
            errorResponse(503, 'contract_failure', 'Portal Hybrid contract unavailable'),
          );
        }
        const serialized = JSON.stringify(parsedPage.data);
        if (new TextEncoder().encode(serialized).byteLength > PORTAL_HYBRID_MAX_RESPONSE_BYTES) {
          event.database = 'contract_failed';
          return await responseAfterCircuitFailure(
            errorResponse(503, 'contract_failure', 'Portal Hybrid contract unavailable'),
          );
        }

        try {
          await deadline.run(() =>
            recordPortalHybridCircuitSuccess({ route: PORTAL_HYBRID_FUNCTION_NAME }, redis),
          );
        } catch (error) {
          if (isPortalHybridDeadlineError(error)) return timeoutResponse();
          event.circuit = 'reset_failed';
        }
        if (deadline.isExpired()) return timeoutResponse();
        event.items = parsedPage.data.items.length;
        return jsonResponse(200, parsedPage.data, {
          'X-Portal-Cache': event.cache === 'hit' ? 'hit' : 'miss',
        });
      } catch (error) {
        if (isPortalHybridDeadlineError(error)) return timeoutResponse();
        if (error instanceof PortalRedisError) {
          event.guardOutcome = 'unavailable';
          return errorResponse(503, 'guard_unavailable', 'Portal request guard unavailable');
        }
        return errorResponse(503, 'internal_error', 'Portal Hybrid search unavailable');
      } finally {
        if (pendingModelCacheWrite || leaseId || ownsRedis) {
          deadline.detach(
            async () => {
              if (pendingModelCacheWrite) {
                await pendingModelCacheWrite.catch(() => undefined);
              }
              if (leaseId) {
                await releasePortalConcurrencyLease(
                  { route: PORTAL_HYBRID_FUNCTION_NAME, leaseId },
                  redis,
                );
              }
            },
            ownsRedis ? () => redis.close() : undefined,
          );
        }
      }
    };

    let response: Response;
    let errorCode: PortalHybridErrorCode | null;
    try {
      response = await deadline.run(execute);
      if (deadline.isExpired()) throw new PortalHybridDeadlineError();
      errorCode = await deadline.run(() => responseErrorCode(response));
      if (response.status === 200 && deadline.isExpired()) {
        throw new PortalHybridDeadlineError();
      }
    } catch (error) {
      if (isPortalHybridDeadlineError(error) || deadline.isExpired()) {
        response = timeoutResponse();
        errorCode = 'hybrid_timeout';
        event.items = null;
      } else {
        response = errorResponse(503, 'internal_error', 'Portal Hybrid search unavailable');
        errorCode = 'internal_error';
      }
    }
    response.headers.set('X-Portal-Correlation-Id', correlationId);
    let deploymentSha = options.deploymentSha ?? 'unknown';
    if (options.deploymentSha === undefined) {
      try {
        deploymentSha = readPortalDeploymentSha('PORTAL_HYBRID_DEPLOYMENT_SHA');
      } catch (_error) {
        // Observability configuration must not alter the response.
      }
    }
    deadline.signal.removeEventListener('abort', abortOperations);
    deadline.dispose();

    let securityEvent: PortalHybridSecurityEvent | null = null;
    while (true) {
      try {
        securityEvent = sanitizePortalHybridSecurityEvent({
          correlationId,
          ...event,
          latencyMs: Math.max(0, Math.round(monotonicNow() - startedAt)),
          status: response.status,
          errorCode,
          deploymentSha,
        });
      } catch (_error) {
        securityEvent = null;
      }

      const expiredBeforeReturn = deadline.isExpired();
      if (response.status !== 200 || !expiredBeforeReturn) break;

      response = timeoutResponse();
      response.headers.set('X-Portal-Correlation-Id', correlationId);
      errorCode = 'hybrid_timeout';
      event.items = null;
    }

    if (securityEvent) {
      (options.scheduleSecurityEvent ?? schedulePortalHybridSecurityEvent)(
        options.logger ?? defaultPortalHybridSecurityLogger,
        securityEvent,
      );
    }
    return response;
  };
}

export const handlePortalHybridSearch = createPortalHybridSearchHandler();

if (import.meta.main) {
  Deno.serve(handlePortalHybridSearch);
}
