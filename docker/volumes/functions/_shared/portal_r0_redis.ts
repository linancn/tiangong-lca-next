import { PORTAL_ATOMIC_GUARD_LUA } from './portal_redis_guard.ts';
import {
  createPortalRedisAdapter,
  type PortalRedisAdapter,
  PortalRedisError,
  type PortalRedisRuntimeConfig,
} from './redis_client.ts';
import type { PortalR0Environment } from './portal_r0_hmac.ts';

const R0_ROUTE = 'portal_r0_hmac_verify_v1';
const R0_NONCE_TTL_SECONDS = 120;
const MINUTE_COUNTER_TTL_SECONDS = 120;
const DAILY_COUNTER_TTL_SECONDS = 172_800;
const KEY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const NAMESPACE_PATTERN = /^portal:r0:[a-z0-9][a-z0-9-]{7,47}:v1$/;
const FORBIDDEN_NAMESPACE_SEGMENTS = /(?:^|-)(?:dev|main|prod|production)(?:-|$)/u;
const RELEASE_LEASE_LUA = `return redis.call('ZREM', KEYS[1], ARGV[1])`;

export type PortalR0RuntimeTarget = 'preview' | 'test';

export type PortalR0RedisConfig = PortalRedisRuntimeConfig & {
  target: PortalR0RuntimeTarget;
  minuteBudget: number;
  dailyBudget: number;
  maxConcurrency: number;
  leaseTtlSeconds: number;
};

export type PortalR0Admission =
  | { status: 'admitted'; leaseId: string }
  | { status: 'budget_exhausted' | 'concurrency_exhausted' };

function environmentValue(env: PortalR0Environment, name: string): string | undefined {
  let value: string | undefined;
  try {
    value = env.get(name);
  } catch (_error) {
    throw new PortalRedisError();
  }
  if (value === undefined || value === '') return undefined;
  if (value.length === 0 || value !== value.trim() || /[\u0000-\u001f\u007f-\u009f]/u.test(value)) {
    throw new PortalRedisError();
  }
  return value;
}

function requiredEnvironmentValue(env: PortalR0Environment, name: string): string {
  const value = environmentValue(env, name);
  if (value === undefined) throw new PortalRedisError();
  return value;
}

function requiredInteger(
  env: PortalR0Environment,
  name: string,
  minimum: number,
  maximum: number,
): number {
  const value = requiredEnvironmentValue(env, name);
  if (!/^\d+$/u.test(value)) throw new PortalRedisError();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new PortalRedisError();
  }
  return parsed;
}

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function parseProviderUrl(value: string): URL {
  try {
    const url = new URL(value);
    if (
      url.username !== '' ||
      url.password !== '' ||
      url.search !== '' ||
      url.hash !== '' ||
      (url.pathname !== '' && url.pathname !== '/')
    ) {
      throw new PortalRedisError();
    }
    return url;
  } catch (_error) {
    throw new PortalRedisError();
  }
}

export function readPortalR0RedisConfig(env: PortalR0Environment = Deno.env): PortalR0RedisConfig {
  const target = requiredEnvironmentValue(env, 'PORTAL_R0_RUNTIME_TARGET');
  if (target !== 'preview' && target !== 'test') throw new PortalRedisError();
  const provider = requiredEnvironmentValue(env, 'PORTAL_R0_REDIS_CLIENT_TYPE');
  if (provider !== 'upstash' && provider !== 'standard') throw new PortalRedisError();

  const namespace = requiredEnvironmentValue(env, 'PORTAL_R0_REDIS_NAMESPACE');
  const namespaceFixture = namespace.split(':')[2] ?? '';
  if (!NAMESPACE_PATTERN.test(namespace) || FORBIDDEN_NAMESPACE_SEGMENTS.test(namespaceFixture)) {
    throw new PortalRedisError();
  }

  const timeoutMs = requiredInteger(env, 'PORTAL_R0_REDIS_TIMEOUT_MS', 50, 1_000);
  const common = {
    target,
    provider,
    namespace,
    timeoutMs,
    minuteBudget: requiredInteger(env, 'PORTAL_R0_MINUTE_BUDGET', 1, 10_000),
    dailyBudget: requiredInteger(env, 'PORTAL_R0_DAILY_BUDGET', 1, 100_000),
    maxConcurrency: requiredInteger(env, 'PORTAL_R0_MAX_CONCURRENCY', 1, 100),
    leaseTtlSeconds: requiredInteger(env, 'PORTAL_R0_LEASE_TTL_SECONDS', 20, 60),
  } satisfies Omit<
    PortalR0RedisConfig,
    'upstashUrl' | 'upstashToken' | 'redisUrl' | 'redisPassword'
  >;

  if (provider === 'upstash') {
    const upstashUrl = requiredEnvironmentValue(env, 'PORTAL_R0_UPSTASH_REDIS_URL');
    const upstashToken = requiredEnvironmentValue(env, 'PORTAL_R0_UPSTASH_REDIS_TOKEN');
    const parsedUrl = parseProviderUrl(upstashUrl);
    const secureRemote = parsedUrl.protocol === 'https:';
    const testLoopback =
      target === 'test' && parsedUrl.protocol === 'http:' && isLoopback(parsedUrl.hostname);
    if (!secureRemote && !testLoopback) throw new PortalRedisError();
    return { ...common, upstashUrl, upstashToken };
  }

  const redisUrl = requiredEnvironmentValue(env, 'PORTAL_R0_REDIS_URL');
  const parsedUrl = parseProviderUrl(redisUrl);
  const secureRemote = parsedUrl.protocol === 'rediss:';
  const testLoopback =
    target === 'test' && parsedUrl.protocol === 'redis:' && isLoopback(parsedUrl.hostname);
  if (!secureRemote && !testLoopback) throw new PortalRedisError();
  return {
    ...common,
    redisUrl,
    redisPassword: environmentValue(env, 'PORTAL_R0_REDIS_PASSWORD'),
  };
}

export async function createPortalR0RedisAdapter(
  env: PortalR0Environment = Deno.env,
): Promise<PortalRedisAdapter> {
  const config = readPortalR0RedisConfig(env);
  const runtimeConfig: PortalRedisRuntimeConfig = {
    provider: config.provider,
    namespace: config.namespace,
    timeoutMs: config.timeoutMs,
    upstashUrl: config.upstashUrl,
    upstashToken: config.upstashToken,
    redisUrl: config.redisUrl,
    redisPassword: config.redisPassword,
  };
  return await createPortalRedisAdapter(runtimeConfig);
}

function randomLeaseId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function integer(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function registerPortalR0Nonce(
  input: { keyId: string; nonce: string },
  adapter: PortalRedisAdapter,
): Promise<boolean> {
  if (!KEY_ID_PATTERN.test(input.keyId) || !NONCE_PATTERN.test(input.nonce)) {
    throw new PortalRedisError();
  }
  try {
    return await adapter.setNxEx(
      `${adapter.namespace}:replay:${input.keyId}:${input.nonce}`,
      '1',
      R0_NONCE_TTL_SECONDS,
    );
  } catch (_error) {
    throw new PortalRedisError();
  }
}

export async function admitPortalR0Request(
  config: PortalR0RedisConfig,
  adapter: PortalRedisAdapter,
  nowMillis = Date.now(),
): Promise<PortalR0Admission> {
  if (!Number.isSafeInteger(nowMillis) || nowMillis < 0) throw new PortalRedisError();
  const leaseId = randomLeaseId();
  const leaseExpiresMillis = nowMillis + config.leaseTtlSeconds * 1_000;
  const minuteWindow = Math.floor(nowMillis / 60_000);
  const dailyWindow = Math.floor(nowMillis / 86_400_000);
  let result: unknown;
  try {
    result = await adapter.eval(
      PORTAL_ATOMIC_GUARD_LUA,
      [
        `${adapter.namespace}:budget:${R0_ROUTE}:minute:${minuteWindow}`,
        `${adapter.namespace}:budget:${R0_ROUTE}:daily:${dailyWindow}`,
        `${adapter.namespace}:lease:${R0_ROUTE}`,
      ],
      [
        String(nowMillis),
        String(leaseExpiresMillis),
        leaseId,
        String(config.minuteBudget),
        String(config.dailyBudget),
        String(config.maxConcurrency),
        String(MINUTE_COUNTER_TTL_SECONDS),
        String(DAILY_COUNTER_TTL_SECONDS),
        String(config.leaseTtlSeconds + 1),
        '1',
      ],
    );
  } catch (_error) {
    throw new PortalRedisError();
  }
  if (!Array.isArray(result) || result.length !== 5) throw new PortalRedisError();
  const values = result.map(integer);
  if (values.some((value) => value === null)) throw new PortalRedisError();
  const [code, remainingMinute, remainingDaily, remainingConcurrency, recovered] =
    values as number[];
  if (remainingMinute < 0 || remainingDaily < 0 || remainingConcurrency < 0 || recovered < 0) {
    throw new PortalRedisError();
  }
  if (code === 0) return { status: 'admitted', leaseId };
  if (code === 1) return { status: 'budget_exhausted' };
  if (code === 2) return { status: 'concurrency_exhausted' };
  throw new PortalRedisError();
}

export async function releasePortalR0Lease(
  leaseId: string,
  adapter: PortalRedisAdapter,
): Promise<void> {
  if (!NONCE_PATTERN.test(leaseId)) throw new PortalRedisError();
  let result: unknown;
  try {
    result = await adapter.eval(
      RELEASE_LEASE_LUA,
      [`${adapter.namespace}:lease:${R0_ROUTE}`],
      [leaseId],
    );
  } catch (_error) {
    throw new PortalRedisError();
  }
  const removed = integer(result);
  if (removed === null || removed < 0 || removed > 1) throw new PortalRedisError();
}

export { PORTAL_ATOMIC_GUARD_LUA as PORTAL_R0_ATOMIC_GUARD_LUA, R0_NONCE_TTL_SECONDS };
