import '@supabase/functions-js/edge-runtime.d.ts';

import { z } from 'zod';

import {
  loadPortalHmacKeyring,
  PortalHmacError,
  type PortalHmacKeyring,
  verifyPortalHmacRequest,
} from '../_shared/portal_hmac.ts';
import {
  PortalPublishedLciaUpstreamError,
  PortalTransportError,
  readPortalBoundedStream,
  readPortalLegacyAnonCredential,
  readPortalPublishableCredential,
  readPortalRawBody,
  readPortalSupabaseUrl,
  validatePortalInboundTransport,
  validatePortalPublishableCredential,
  validatePortalSupabaseUrl,
} from '../_shared/portal_public_transport.ts';
import {
  readPortalLciaGuardLimits,
  readPortalResponseCache,
  redisEvalAtomicGuard,
  registerPortalNonce,
  releasePortalConcurrencyLease,
  type PortalGuardTiming,
  type PortalRouteGuardLimits,
  validatePortalLciaGuardLimits,
  writePortalResponseCache,
} from '../_shared/portal_redis_guard.ts';
import {
  createPortalRedisAdapter,
  type PortalRedisAdapter,
  PortalRedisError,
  readPortalRedisTimeoutMs,
} from '../_shared/redis_client.ts';
import {
  defaultPortalSecurityLogger,
  emitPortalSecurityEvent,
  normalizePortalSecurityErrorCode,
  resolvePortalCorrelationId,
  readPortalDeploymentSha,
  type PortalSecurityBackend,
  type PortalSecurityCacheStatus,
  type PortalSecurityErrorCode,
  type PortalSecurityHmacOutcome,
  type PortalSecurityLogger,
  type PortalSecurityMode,
  type PortalSecurityTransportOutcome,
} from '../_shared/portal_security_event.ts';

export {
  PortalPublishedLciaUpstreamError,
  PortalTransportError,
  readPortalLegacyAnonCredential,
  readPortalPublishableCredential,
  readPortalRawBody,
  readPortalSupabaseUrl,
  validatePortalInboundTransport,
  validatePortalPublishableCredential,
  validatePortalSupabaseUrl,
} from '../_shared/portal_public_transport.ts';

export const PORTAL_LCIA_FUNCTION_NAME = 'portal_data_product_results_v1';
export const PORTAL_LCIA_FUNCTION_PATH = `/functions/v1/${PORTAL_LCIA_FUNCTION_NAME}`;
export const PORTAL_LCIA_RUNTIME_PATH = `/${PORTAL_LCIA_FUNCTION_NAME}`;
export const PORTAL_LCIA_MAX_REQUEST_BYTES = 32 * 1024;
export const PORTAL_LCIA_MAX_RESPONSE_BYTES = 512 * 1024;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 8_000;

const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u);
const versionSchema = z.string().regex(/^\d{2}\.\d{2}\.\d{3}$/u);
const realSchema = z
  .string()
  .regex(/^(?=(?:[^0-9]*[0-9]){1,38}[^0-9]*$)(?:0|-?(?:[1-9]\d*(?:\.\d*[1-9])?|0\.\d*[1-9]))$/u);
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/u);
const nonEmptyStringSchema = z.string().min(1);
const localizedTextSchema = z.array(
  z
    .object({
      language: z
        .string()
        .min(2)
        .max(35)
        .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u),
      value: z.string(),
    })
    .strict(),
);
const processRefSchema = z.object({ id: uuidSchema, version: versionSchema }).strict();
const requestCursorSchema = z.string().min(1).max(4096).nullable().optional().default(null);
const requestLimitSchema = z.number().int().min(1).max(50).optional().default(50);

function uniqueProcessReferences(value: Array<{ id: string; version: string }>): boolean {
  return new Set(value.map((item) => `${item.id}@${item.version}`)).size === value.length;
}

export const portalPublishedLciaRequestSchema = z.discriminatedUnion('mode', [
  z
    .object({
      mode: z.literal('process_all_impacts'),
      processRefs: z.array(processRefSchema).length(1).refine(uniqueProcessReferences),
      impactCategoryId: z.null(),
      cursor: requestCursorSchema,
      limit: requestLimitSchema,
    })
    .strict(),
  z
    .object({
      mode: z.literal('processes_one_impact'),
      processRefs: z.array(processRefSchema).min(1).max(50).refine(uniqueProcessReferences),
      impactCategoryId: z.string().trim().min(1).max(512),
      cursor: requestCursorSchema,
      limit: requestLimitSchema,
    })
    .strict(),
  z
    .object({
      mode: z.literal('ranked_processes_one_impact'),
      processRefs: z.array(processRefSchema).min(1).max(50).refine(uniqueProcessReferences),
      impactCategoryId: z.string().trim().min(1).max(512),
      cursor: requestCursorSchema,
      limit: requestLimitSchema,
    })
    .strict(),
]);

export type PortalPublishedLciaRequest = z.infer<typeof portalPublishedLciaRequestSchema>;

const exactIdentitySchema = z.object({ id: uuidSchema, version: versionSchema }).strict();
const portalPublishedLciaRowSchema = z
  .object({
    process: exactIdentitySchema,
    functionalUnit: z
      .object({
        amount: realSchema,
        unit: nonEmptyStringSchema,
        description: localizedTextSchema,
      })
      .strict(),
    geography: z
      .object({
        code: nonEmptyStringSchema,
        precision: z.enum(['country', 'province', 'city', 'other', 'unknown']),
      })
      .strict(),
    referenceYear: z.number().int().min(0).max(9999),
    method: exactIdentitySchema,
    impact: z.object({ id: nonEmptyStringSchema, name: localizedTextSchema }).strict(),
    value: realSchema,
    unit: nonEmptyStringSchema,
    evidenceStatus: z.literal('verified'),
  })
  .strict();

export const portalPublishedLciaPageSchema = z
  .object({
    schemaVersion: z.literal('portal.published-lcia-page.v1'),
    mode: z.enum(['process_all_impacts', 'processes_one_impact', 'ranked_processes_one_impact']),
    publication: z
      .object({
        publicationId: uuidSchema,
        packageId: uuidSchema,
        packageVersion: nonEmptyStringSchema,
        publishedAt: z.string().datetime({ offset: true }),
        evidenceHash: sha256Schema,
      })
      .strict(),
    rows: z.array(portalPublishedLciaRowSchema).max(50),
    nextCursor: z.string().min(1).max(4096).nullable(),
  })
  .strict();

export type PortalPublishedLciaPage = z.infer<typeof portalPublishedLciaPageSchema>;

export interface PortalPublishedLciaRepository {
  query(
    request: PortalPublishedLciaRequest,
    signal: AbortSignal,
  ): Promise<PortalPublishedLciaPage | null>;
}

function upstreamTimeoutFromEnvironment(): number {
  const value = Deno.env.get('PORTAL_LCIA_UPSTREAM_TIMEOUT_MS')?.trim();
  if (!value) return DEFAULT_UPSTREAM_TIMEOUT_MS;
  if (!/^\d+$/u.test(value)) throw new PortalPublishedLciaUpstreamError();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 100 || parsed > DEFAULT_UPSTREAM_TIMEOUT_MS) {
    throw new PortalPublishedLciaUpstreamError();
  }
  return parsed;
}

async function readBoundedResponseJson(response: Response): Promise<unknown> {
  const contentLength = response.headers.get('content-length');
  if (
    contentLength &&
    /^\d+$/u.test(contentLength) &&
    Number(contentLength) > PORTAL_LCIA_MAX_RESPONSE_BYTES
  ) {
    throw new PortalPublishedLciaUpstreamError();
  }
  let bytes: Uint8Array;
  try {
    bytes = await readPortalBoundedStream(response.body, PORTAL_LCIA_MAX_RESPONSE_BYTES);
  } catch (_error) {
    throw new PortalPublishedLciaUpstreamError();
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (_error) {
    throw new PortalPublishedLciaUpstreamError();
  }
}

export function createPortalPublishedLciaRepository(
  options: {
    supabaseUrl?: string;
    publishableKey?: string;
    fetchImpl?: typeof fetch;
  } = {},
): PortalPublishedLciaRepository {
  const supabaseUrl = validatePortalSupabaseUrl(options.supabaseUrl ?? readPortalSupabaseUrl());
  const publishableKey = validatePortalPublishableCredential(
    options.publishableKey ?? readPortalPublishableCredential(),
  );
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async query(request, signal) {
      const response = await fetchImpl(
        `${supabaseUrl}/rest/v1/rpc/portal_get_published_lcia_values_v1`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            apikey: publishableKey,
            'Content-Profile': 'api',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_mode: request.mode,
            p_process_refs: request.processRefs,
            p_impact_ref: request.impactCategoryId,
            p_cursor: request.cursor,
            p_limit: request.limit,
          }),
          signal,
        },
      ).catch(() => {
        throw new PortalPublishedLciaUpstreamError();
      });
      if (!response.ok) throw new PortalPublishedLciaUpstreamError();
      const value = await readBoundedResponseJson(response);
      if (value === null) return null;
      const parsed = portalPublishedLciaPageSchema.safeParse(value);
      if (!parsed.success || parsed.data.mode !== request.mode) {
        throw new PortalPublishedLciaUpstreamError();
      }
      return parsed.data;
    },
  };
}

type PortalDataProductResultsHandlerOptions = {
  keyring?: PortalHmacKeyring;
  redis?: PortalRedisAdapter;
  redisFactory?: () => Promise<PortalRedisAdapter>;
  guardLimits?: PortalRouteGuardLimits;
  repository?: PortalPublishedLciaRepository;
  repositoryFactory?: (trustedPublishableKey: string) => PortalPublishedLciaRepository;
  nowSeconds?: () => number;
  nowMillis?: () => number;
  upstreamTimeoutMs?: number;
  redisTimeoutMs?: number;
  trustedPublishableKey?: string;
  trustedLegacyAnonKey?: string | null;
  deploymentSha?: string;
  logger?: PortalSecurityLogger;
  monotonicNow?: () => number;
};

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

function errorResponse(status: number, code: string, message: string): Response {
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

export function hmacSecurityOutcome(error: unknown): PortalSecurityHmacOutcome {
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

export function transportSecurityOutcome(error: unknown): PortalSecurityTransportOutcome {
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

async function responseSecurityErrorCode(
  response: Response,
): Promise<PortalSecurityErrorCode | null> {
  if (response.status < 400) return null;
  try {
    const payload = await response.clone().json();
    return normalizePortalSecurityErrorCode(
      payload && typeof payload === 'object' ? (payload as Record<string, unknown>).code : null,
    );
  } catch (_error) {
    return 'internal_error';
  }
}

export function createPortalDataProductResultsHandler(
  options: PortalDataProductResultsHandlerOptions = {},
) {
  return async (request: Request): Promise<Response> => {
    const readMonotonicTime = () => {
      try {
        const value = options.monotonicNow?.() ?? performance.now();
        return Number.isFinite(value) ? value : 0;
      } catch (_error) {
        return 0;
      }
    };
    const startedAt = readMonotonicTime();
    const correlationId = resolvePortalCorrelationId(request.headers);
    let eventMode: PortalSecurityMode | null = null;
    let eventCache: PortalSecurityCacheStatus = 'not_checked';
    let eventHmacOutcome: PortalSecurityHmacOutcome = 'not_checked';
    let eventTransportOutcome: PortalSecurityTransportOutcome = 'not_checked';
    let eventBackend: PortalSecurityBackend = 'none';
    let eventRows: number | null = null;
    let eventMatchedKey: 'current' | 'previous' | null = null;
    let eventRecoveredLeaseCount = 0;

    const execute = async (): Promise<Response> => {
      let rawBody: Uint8Array;
      try {
        rawBody = await readPortalRawBody(request);
      } catch (_error) {
        return errorResponse(413, 'request_too_large', 'Request body exceeds the allowed size');
      }

      let verification;
      try {
        verification = await verifyPortalHmacRequest({
          request,
          rawBody,
          expectedFunctionPath: PORTAL_LCIA_FUNCTION_PATH,
          allowedRequestPaths: [PORTAL_LCIA_FUNCTION_PATH, PORTAL_LCIA_RUNTIME_PATH],
          keyring: options.keyring ?? loadPortalHmacKeyring(),
          nowSeconds: options.nowSeconds?.(),
        });
        eventMatchedKey = verification.matchedKey;
        eventHmacOutcome = 'accepted';
      } catch (error) {
        eventHmacOutcome = hmacSecurityOutcome(error);
        return authFailure(error);
      }

      let trustedPublishableKey: string;
      try {
        trustedPublishableKey = options.trustedPublishableKey ?? readPortalPublishableCredential();
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
        eventTransportOutcome = 'accepted';
      } catch (error) {
        eventTransportOutcome = transportSecurityOutcome(error);
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

      let guardLimits: PortalRouteGuardLimits;
      let guardTiming: PortalGuardTiming;
      try {
        guardTiming = {
          redisTimeoutMs: options.redisTimeoutMs ?? readPortalRedisTimeoutMs(),
          upstreamTimeoutMs: options.upstreamTimeoutMs ?? upstreamTimeoutFromEnvironment(),
        };
        guardLimits = options.guardLimits
          ? validatePortalLciaGuardLimits(options.guardLimits, guardTiming)
          : readPortalLciaGuardLimits(Deno.env, guardTiming);
      } catch (_error) {
        return errorResponse(503, 'guard_unavailable', 'Portal request guard unavailable');
      }

      let redis: PortalRedisAdapter;
      let ownsRedis = false;
      try {
        redis = options.redis ?? (await (options.redisFactory ?? createPortalRedisAdapter)());
        ownsRedis = options.redis === undefined;
      } catch (_error) {
        return errorResponse(503, 'guard_unavailable', 'Portal request guard unavailable');
      }

      let leaseId: string | undefined;
      try {
        const nonceRegistered = await registerPortalNonce(
          { keyId: verification.keyId, nonce: verification.nonce },
          redis,
        );
        if (!nonceRegistered) {
          return errorResponse(403, 'replay_rejected', 'Portal request replay rejected');
        }

        const guard = await redisEvalAtomicGuard(
          {
            route: PORTAL_LCIA_FUNCTION_NAME,
            limits: guardLimits,
            nowMillis: options.nowMillis?.(),
          },
          redis,
        );
        eventRecoveredLeaseCount = guard.recoveredLeaseCount;
        if (guard.status === 'budget_exhausted') {
          return errorResponse(429, 'budget_exhausted', 'Portal route budget exhausted');
        }
        if (guard.status === 'concurrency_exhausted') {
          return errorResponse(429, 'concurrency_exhausted', 'Portal route concurrency exhausted');
        }
        if (!('leaseId' in guard)) {
          return errorResponse(503, 'guard_unavailable', 'Portal request guard unavailable');
        }
        leaseId = guard.leaseId;

        let requestPayload: unknown;
        try {
          requestPayload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(rawBody));
        } catch (_error) {
          return errorResponse(400, 'invalid_request', 'Invalid Portal LCIA request');
        }
        const parsedRequest = portalPublishedLciaRequestSchema.safeParse(requestPayload);
        if (!parsedRequest.success) {
          return errorResponse(400, 'invalid_request', 'Invalid Portal LCIA request');
        }
        eventMode = parsedRequest.data.mode;

        let cached: string | null;
        try {
          cached = await readPortalResponseCache(
            { route: PORTAL_LCIA_FUNCTION_NAME, bodyHash: verification.bodyHash },
            redis,
          );
        } catch (_error) {
          eventCache = 'invalid';
          return errorResponse(503, 'guard_unavailable', 'Portal request guard unavailable');
        }
        if (cached !== null) {
          try {
            const parsedCached = portalPublishedLciaPageSchema.safeParse(JSON.parse(cached));
            if (parsedCached.success && parsedCached.data.mode === parsedRequest.data.mode) {
              eventCache = 'hit';
              eventRows = parsedCached.data.rows.length;
              return jsonResponse(200, parsedCached.data, { 'X-Portal-Cache': 'hit' });
            }
          } catch (_error) {
            // A malformed cache entry is treated as an unavailable security dependency below.
          }
          eventCache = 'invalid';
          return errorResponse(503, 'guard_unavailable', 'Portal request guard unavailable');
        }
        eventCache = 'miss';

        const timeoutMs = guardTiming.upstreamTimeoutMs;
        if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 8_000) {
          return errorResponse(
            503,
            'published_lcia_unavailable',
            'Published LCIA results unavailable',
          );
        }
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
        let page: PortalPublishedLciaPage | null;
        try {
          const repository =
            options.repository ??
            options.repositoryFactory?.(trustedPublishableKey) ??
            createPortalPublishedLciaRepository({ publishableKey: trustedPublishableKey });
          eventBackend = 'supabase_public_rpc';
          page = await repository.query(parsedRequest.data, abortController.signal);
        } catch (_error) {
          return errorResponse(
            503,
            'published_lcia_unavailable',
            'Published LCIA results unavailable',
          );
        } finally {
          clearTimeout(timeoutId);
        }
        if (page === null) {
          eventRows = 0;
          return errorResponse(
            404,
            'published_lcia_unavailable',
            'Published LCIA results unavailable',
          );
        }
        const parsedPage = portalPublishedLciaPageSchema.safeParse(page);
        if (!parsedPage.success || parsedPage.data.mode !== parsedRequest.data.mode) {
          return errorResponse(
            503,
            'published_lcia_unavailable',
            'Published LCIA results unavailable',
          );
        }
        const serialized = JSON.stringify(parsedPage.data);
        if (new TextEncoder().encode(serialized).byteLength > PORTAL_LCIA_MAX_RESPONSE_BYTES) {
          return errorResponse(
            503,
            'published_lcia_unavailable',
            'Published LCIA results unavailable',
          );
        }
        try {
          await writePortalResponseCache(
            {
              route: PORTAL_LCIA_FUNCTION_NAME,
              bodyHash: verification.bodyHash,
              value: serialized,
              ttlSeconds: guardLimits.cacheTtlSeconds,
            },
            redis,
          );
        } catch (_error) {
          eventCache = 'write_failed';
          // Admission already succeeded. A best-effort cache write never widens database authority.
        }
        eventRows = parsedPage.data.rows.length;
        return jsonResponse(200, parsedPage.data, { 'X-Portal-Cache': 'miss' });
      } catch (error) {
        if (error instanceof PortalRedisError) {
          return errorResponse(503, 'guard_unavailable', 'Portal request guard unavailable');
        }
        return errorResponse(
          503,
          'published_lcia_unavailable',
          'Published LCIA results unavailable',
        );
      } finally {
        if (leaseId) {
          await releasePortalConcurrencyLease(
            { route: PORTAL_LCIA_FUNCTION_NAME, leaseId },
            redis,
          ).catch(() => undefined);
        }
        if (ownsRedis) await redis.close().catch(() => undefined);
      }
    };

    let response: Response;
    try {
      response = await execute();
    } catch (_error) {
      response = errorResponse(
        503,
        'published_lcia_unavailable',
        'Published LCIA results unavailable',
      );
    }
    const errorCode = await responseSecurityErrorCode(response);
    response.headers.set('X-Portal-Correlation-Id', correlationId);
    emitPortalSecurityEvent(options.logger ?? defaultPortalSecurityLogger, {
      correlationId,
      mode: eventMode,
      cache: eventCache,
      hmacOutcome: eventHmacOutcome,
      transportOutcome: eventTransportOutcome,
      backend: eventBackend,
      latencyMs: Math.max(0, Math.round(readMonotonicTime() - startedAt)),
      rows: eventRows,
      status: response.status,
      errorCode,
      matchedKey: eventMatchedKey,
      recoveredLeaseCount: eventRecoveredLeaseCount,
      deploymentSha: options.deploymentSha ?? readPortalDeploymentSha('PORTAL_LCIA_DEPLOYMENT_SHA'),
    });
    return response;
  };
}

export const handlePortalDataProductResults = createPortalDataProductResultsHandler();

if (import.meta.main) {
  Deno.serve(handlePortalDataProductResults);
}
