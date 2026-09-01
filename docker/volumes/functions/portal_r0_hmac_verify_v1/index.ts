import '@supabase/functions-js/edge-runtime.d.ts';

import { loadPortalR0HmacKeyring, type PortalR0Environment } from '../_shared/portal_r0_hmac.ts';
import {
  admitPortalR0Request,
  createPortalR0RedisAdapter,
  readPortalR0RedisConfig,
  registerPortalR0Nonce,
  releasePortalR0Lease,
  type PortalR0RedisConfig,
} from '../_shared/portal_r0_redis.ts';
import {
  PortalR0TransportError,
  readPortalR0PublishableCredential,
  validatePortalR0InboundTransport,
} from '../_shared/portal_r0_transport.ts';
import {
  type PortalHmacKeyring,
  PortalHmacError,
  verifyPortalHmacRequest,
} from '../_shared/portal_hmac.ts';
import type { PortalRedisAdapter } from '../_shared/redis_client.ts';

export const PORTAL_R0_FUNCTION_NAME = 'portal_r0_hmac_verify_v1';
export const PORTAL_R0_FUNCTION_PATH = `/functions/v1/${PORTAL_R0_FUNCTION_NAME}`;
export const PORTAL_R0_RUNTIME_PATH = `/${PORTAL_R0_FUNCTION_NAME}`;
export const PORTAL_R0_MAX_REQUEST_BYTES = 512;
const REQUEST_SCHEMA_VERSION = 'portal.r0-hmac-verify-request.v1';
const RECEIPT_SCHEMA_VERSION = 'portal.r0-hmac-redis-receipt.v1';

type PortalR0HandlerOptions = {
  env?: PortalR0Environment;
  keyring?: PortalHmacKeyring;
  trustedPublishableKey?: string;
  redisConfig?: PortalR0RedisConfig;
  redis?: PortalRedisAdapter;
  redisFactory?: (env: PortalR0Environment) => Promise<PortalRedisAdapter>;
  nowSeconds?: () => number;
  nowMillis?: () => number;
};

async function readRawBody(request: Request): Promise<Uint8Array> {
  const contentLength = request.headers.get('content-length');
  if (
    contentLength &&
    /^\d+$/u.test(contentLength) &&
    Number(contentLength) > PORTAL_R0_MAX_REQUEST_BYTES
  ) {
    throw new RangeError('request_too_large');
  }
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > PORTAL_R0_MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new RangeError('request_too_large');
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function receipt(status: number, ok: boolean, code?: string): Response {
  return new Response(
    JSON.stringify({
      schemaVersion: RECEIPT_SCHEMA_VERSION,
      ok,
      ...(code === undefined ? {} : { code }),
    }),
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}

function hmacFailure(error: unknown): Response {
  if (error instanceof PortalHmacError && error.code === 'portal_hmac_method_invalid') {
    return receipt(405, false, 'method_not_allowed');
  }
  if (error instanceof PortalHmacError && error.code === 'portal_hmac_config_invalid') {
    return receipt(503, false, 'r0_unavailable');
  }
  return receipt(401, false, 'r0_auth_failed');
}

function isExactR0Request(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  return (
    entries.length === 1 &&
    entries[0][0] === 'schemaVersion' &&
    entries[0][1] === REQUEST_SCHEMA_VERSION
  );
}

export function createPortalR0HmacVerifyHandler(options: PortalR0HandlerOptions = {}) {
  return async (request: Request): Promise<Response> => {
    let rawBody: Uint8Array;
    try {
      rawBody = await readRawBody(request);
    } catch (_error) {
      return receipt(413, false, 'request_too_large');
    }

    const env = options.env ?? Deno.env;
    let verification;
    try {
      verification = await verifyPortalHmacRequest({
        request,
        rawBody,
        expectedFunctionPath: PORTAL_R0_FUNCTION_PATH,
        allowedRequestPaths: [PORTAL_R0_FUNCTION_PATH, PORTAL_R0_RUNTIME_PATH],
        keyring: options.keyring ?? loadPortalR0HmacKeyring(env),
        nowSeconds: options.nowSeconds?.(),
      });
    } catch (error) {
      return hmacFailure(error);
    }

    try {
      const trustedPublishableKey =
        options.trustedPublishableKey ?? readPortalR0PublishableCredential(env);
      validatePortalR0InboundTransport({ request, trustedPublishableKey });
    } catch (error) {
      return receipt(
        error instanceof PortalR0TransportError && error.kind === 'request' ? 401 : 503,
        false,
        error instanceof PortalR0TransportError && error.kind === 'request'
          ? 'r0_auth_failed'
          : 'r0_unavailable',
      );
    }

    let config: PortalR0RedisConfig;
    let redis: PortalRedisAdapter;
    let ownsRedis = false;
    try {
      config = options.redisConfig ?? readPortalR0RedisConfig(env);
      redis = options.redis ?? (await (options.redisFactory ?? createPortalR0RedisAdapter)(env));
      ownsRedis = options.redis === undefined;
    } catch (_error) {
      return receipt(503, false, 'r0_unavailable');
    }

    let response = receipt(503, false, 'r0_unavailable');
    let leaseId: string | undefined;
    let cleanupFailed = false;
    try {
      const registered = await registerPortalR0Nonce(
        { keyId: verification.keyId, nonce: verification.nonce },
        redis,
      );
      if (!registered) {
        response = receipt(403, false, 'replay_rejected');
      } else {
        const admission = await admitPortalR0Request(config, redis, options.nowMillis?.());
        if (admission.status === 'budget_exhausted') {
          response = receipt(429, false, 'budget_exhausted');
        } else if (admission.status === 'concurrency_exhausted') {
          response = receipt(429, false, 'concurrency_exhausted');
        } else if ('leaseId' in admission) {
          leaseId = admission.leaseId;
          let parsed: unknown;
          try {
            parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(rawBody));
          } catch (_error) {
            parsed = null;
          }
          response = isExactR0Request(parsed)
            ? receipt(200, true)
            : receipt(400, false, 'invalid_request');
        } else response = receipt(503, false, 'r0_unavailable');
      }
    } catch (_error) {
      response = receipt(503, false, 'r0_unavailable');
    } finally {
      if (leaseId) {
        try {
          await releasePortalR0Lease(leaseId, redis);
        } catch (_error) {
          cleanupFailed = true;
        }
      }
      if (ownsRedis) {
        try {
          await redis.close();
        } catch (_error) {
          cleanupFailed = true;
        }
      }
    }
    return cleanupFailed ? receipt(503, false, 'r0_unavailable') : response;
  };
}

export const handlePortalR0HmacVerify = createPortalR0HmacVerifyHandler();

if (import.meta.main) {
  Deno.serve(handlePortalR0HmacVerify);
}
