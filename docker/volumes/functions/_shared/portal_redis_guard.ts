import {
  createPortalRedisAdapter,
  type PortalRedisAdapter,
  type PortalRedisEnvironment,
  PortalRedisError,
  readPortalRedisTimeoutMs,
} from './redis_client.ts';

const REPLAY_TTL_SECONDS = 120;
const MINUTE_COUNTER_TTL_SECONDS = 120;
const DAILY_COUNTER_TTL_SECONDS = 172_800;
const ROUTE_PATTERN = /^[a-z0-9][a-z0-9_]{0,63}$/;
const KEY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const BODY_HASH_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MINIMUM_LEASE_TTL_SECONDS = 20;
const DEFAULT_LEASE_TTL_SECONDS = 30;
const DEFAULT_HYBRID_LEASE_TTL_SECONDS = 35;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 8_000;
const PORTAL_LCIA_RESPONSE_CACHE_TTL_SECONDS = 60;
const PORTAL_HYBRID_CACHE_TTL_SECONDS = 60;
const PORTAL_HYBRID_TOTAL_TIMEOUT_MS = 25_000;
const DEFAULT_HYBRID_CIRCUIT_FAILURE_THRESHOLD = 5;
const DEFAULT_HYBRID_CIRCUIT_WINDOW_SECONDS = 60;
const DEFAULT_HYBRID_CIRCUIT_OPEN_SECONDS = 60;

export const PORTAL_ATOMIC_GUARD_LUA = `
local now_ms = tonumber(ARGV[1])
local lease_expires_ms = tonumber(ARGV[2])
local lease_id = ARGV[3]
local minute_limit = tonumber(ARGV[4])
local daily_limit = tonumber(ARGV[5])
local concurrency_limit = tonumber(ARGV[6])
local minute_ttl = tonumber(ARGV[7])
local daily_ttl = tonumber(ARGV[8])
local lease_set_ttl = tonumber(ARGV[9])
local cost = tonumber(ARGV[10])

local recovered_lease_count = tonumber(redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', now_ms))
local concurrency = tonumber(redis.call('ZCARD', KEYS[3]))
local minute_current = tonumber(redis.call('GET', KEYS[1]) or '0')
local daily_current = tonumber(redis.call('GET', KEYS[2]) or '0')

if minute_current + cost > minute_limit or daily_current + cost > daily_limit then
  return {1, minute_limit - minute_current, daily_limit - daily_current, concurrency_limit - concurrency, recovered_lease_count}
end
if concurrency >= concurrency_limit then
  return {2, minute_limit - minute_current, daily_limit - daily_current, 0, recovered_lease_count}
end

local minute_after = tonumber(redis.call('INCRBY', KEYS[1], cost))
if minute_after == cost then redis.call('EXPIRE', KEYS[1], minute_ttl) end
local daily_after = tonumber(redis.call('INCRBY', KEYS[2], cost))
if daily_after == cost then redis.call('EXPIRE', KEYS[2], daily_ttl) end
redis.call('ZADD', KEYS[3], lease_expires_ms, lease_id)
redis.call('EXPIRE', KEYS[3], lease_set_ttl)

return {0, minute_limit - minute_after, daily_limit - daily_after, concurrency_limit - concurrency - 1, recovered_lease_count}
`;

const PORTAL_RELEASE_LEASE_LUA = `
return redis.call('ZREM', KEYS[1], ARGV[1])
`;

export const PORTAL_HYBRID_CIRCUIT_CHECK_LUA = `
local now_ms = tonumber(ARGV[1])
local open_until_ms = tonumber(redis.call('GET', KEYS[1]) or '0')
if open_until_ms > now_ms then
  return {1, open_until_ms}
end
if open_until_ms > 0 then redis.call('DEL', KEYS[1]) end
return {0, 0}
`;

export const PORTAL_HYBRID_CIRCUIT_FAILURE_LUA = `
local threshold = tonumber(ARGV[1])
local window_seconds = tonumber(ARGV[2])
local open_seconds = tonumber(ARGV[3])
local now_ms = tonumber(ARGV[4])

local failures = tonumber(redis.call('INCR', KEYS[1]))
if failures == 1 then redis.call('EXPIRE', KEYS[1], window_seconds) end
if failures >= threshold then
  local open_until_ms = now_ms + (open_seconds * 1000)
  redis.call('SET', KEYS[2], tostring(open_until_ms), 'EX', open_seconds)
  redis.call('DEL', KEYS[1])
  return {1, failures, open_until_ms}
end
return {0, failures, 0}
`;

export const PORTAL_HYBRID_CIRCUIT_SUCCESS_LUA = `
return redis.call('DEL', KEYS[1])
`;

export const PORTAL_HYBRID_ATOMIC_BEGIN_LUA = `
local now_ms = tonumber(ARGV[1])
local lease_expires_ms = tonumber(ARGV[2])
local lease_id = ARGV[3]
local minute_limit = tonumber(ARGV[4])
local daily_limit = tonumber(ARGV[5])
local concurrency_limit = tonumber(ARGV[6])
local minute_ttl = tonumber(ARGV[7])
local daily_ttl = tonumber(ARGV[8])
local lease_set_ttl = tonumber(ARGV[9])
local cost = tonumber(ARGV[10])
local replay_ttl = tonumber(ARGV[11])

local nonce_registered = redis.call('SET', KEYS[1], '1', 'NX', 'EX', replay_ttl)
if not nonce_registered then return {3, 0, 0, 0, 0, 0} end

local recovered_lease_count = tonumber(redis.call('ZREMRANGEBYSCORE', KEYS[4], '-inf', now_ms))
local concurrency = tonumber(redis.call('ZCARD', KEYS[4]))
local minute_current = tonumber(redis.call('GET', KEYS[2]) or '0')
local daily_current = tonumber(redis.call('GET', KEYS[3]) or '0')

if minute_current + cost > minute_limit or daily_current + cost > daily_limit then
  return {1, minute_limit - minute_current, daily_limit - daily_current, concurrency_limit - concurrency, recovered_lease_count, 0}
end
if concurrency >= concurrency_limit then
  return {2, minute_limit - minute_current, daily_limit - daily_current, 0, recovered_lease_count, 0}
end

local minute_after = tonumber(redis.call('INCRBY', KEYS[2], cost))
if minute_after == cost then redis.call('EXPIRE', KEYS[2], minute_ttl) end
local daily_after = tonumber(redis.call('INCRBY', KEYS[3], cost))
if daily_after == cost then redis.call('EXPIRE', KEYS[3], daily_ttl) end
redis.call('ZADD', KEYS[4], lease_expires_ms, lease_id)
redis.call('EXPIRE', KEYS[4], lease_set_ttl)

local open_until_ms = tonumber(redis.call('GET', KEYS[5]) or '0')
if open_until_ms > now_ms then
  return {4, minute_limit - minute_after, daily_limit - daily_after, concurrency_limit - concurrency - 1, recovered_lease_count, open_until_ms}
end
if open_until_ms > 0 then redis.call('DEL', KEYS[5]) end
return {0, minute_limit - minute_after, daily_limit - daily_after, concurrency_limit - concurrency - 1, recovered_lease_count, 0}
`;

export type PortalRouteGuardLimits = {
  minuteBudget: number;
  dailyBudget: number;
  maxConcurrency: number;
  leaseTtlSeconds: number;
  cacheTtlSeconds: number;
};

export type PortalGuardTiming = {
  redisTimeoutMs: number;
  upstreamTimeoutMs: number;
};

export type PortalHybridCircuitLimits = {
  failureThreshold: number;
  failureWindowSeconds: number;
  openSeconds: number;
};

export type PortalHybridCircuitState =
  { status: 'closed'; retryAfterSeconds: 0 } | { status: 'open'; retryAfterSeconds: number };

export type PortalHybridCircuitFailure = {
  opened: boolean;
  failureCount: number;
  retryAfterSeconds: number;
};

export type PortalGuardAdmission =
  | {
      status: 'admitted';
      leaseId: string;
      remainingMinute: number;
      remainingDaily: number;
      remainingConcurrency: number;
      recoveredLeaseCount: number;
    }
  | {
      status: 'budget_exhausted' | 'concurrency_exhausted';
      remainingMinute: number;
      remainingDaily: number;
      remainingConcurrency: number;
      recoveredLeaseCount: number;
    };

export type PortalHybridAtomicBegin =
  | { status: 'replay_rejected'; recoveredLeaseCount: 0 }
  | (Omit<PortalGuardAdmission, 'status'> & { status: 'budget_exhausted' })
  | (Omit<PortalGuardAdmission, 'status'> & { status: 'concurrency_exhausted' })
  | (Omit<Extract<PortalGuardAdmission, { status: 'admitted' }>, 'status'> & {
      status: 'circuit_open';
      retryAfterSeconds: number;
    })
  | (Omit<Extract<PortalGuardAdmission, { status: 'admitted' }>, 'status'> & {
      status: 'admitted';
    });

function environmentValue(env: PortalRedisEnvironment, name: string): string | undefined {
  const value = env.get(name)?.trim();
  return value ? value : undefined;
}

function boundedEnvironmentInteger(
  env: PortalRedisEnvironment,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = environmentValue(env, name);
  if (value === undefined) return fallback;
  if (!/^\d+$/u.test(value)) throw new PortalRedisError();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new PortalRedisError();
  }
  return parsed;
}

export function readPortalLciaGuardLimits(
  env: PortalRedisEnvironment = Deno.env,
  timing: Partial<PortalGuardTiming> = {},
): PortalRouteGuardLimits {
  const resolvedTiming = {
    redisTimeoutMs: timing.redisTimeoutMs ?? readPortalRedisTimeoutMs(env),
    upstreamTimeoutMs:
      timing.upstreamTimeoutMs ??
      boundedEnvironmentInteger(
        env,
        'PORTAL_LCIA_UPSTREAM_TIMEOUT_MS',
        DEFAULT_UPSTREAM_TIMEOUT_MS,
        100,
        DEFAULT_UPSTREAM_TIMEOUT_MS,
      ),
  };
  return validatePortalLciaGuardLimits(
    {
      minuteBudget: boundedEnvironmentInteger(env, 'PORTAL_LCIA_MINUTE_BUDGET', 120, 1, 1_000_000),
      dailyBudget: boundedEnvironmentInteger(
        env,
        'PORTAL_LCIA_DAILY_BUDGET',
        20_000,
        1,
        100_000_000,
      ),
      maxConcurrency: boundedEnvironmentInteger(env, 'PORTAL_LCIA_MAX_CONCURRENCY', 20, 1, 10_000),
      leaseTtlSeconds: boundedEnvironmentInteger(
        env,
        'PORTAL_LCIA_LEASE_TTL_SECONDS',
        DEFAULT_LEASE_TTL_SECONDS,
        MINIMUM_LEASE_TTL_SECONDS,
        300,
      ),
      cacheTtlSeconds: boundedEnvironmentInteger(
        env,
        'PORTAL_LCIA_CACHE_TTL_SECONDS',
        PORTAL_LCIA_RESPONSE_CACHE_TTL_SECONDS,
        1,
        PORTAL_LCIA_RESPONSE_CACHE_TTL_SECONDS,
      ),
    },
    resolvedTiming,
  );
}

export function readPortalHybridTotalTimeoutMs(env: PortalRedisEnvironment = Deno.env): number {
  return boundedEnvironmentInteger(
    env,
    'PORTAL_HYBRID_TIMEOUT_MS',
    PORTAL_HYBRID_TOTAL_TIMEOUT_MS,
    100,
    PORTAL_HYBRID_TOTAL_TIMEOUT_MS,
  );
}

export function readPortalHybridGuardLimits(
  env: PortalRedisEnvironment = Deno.env,
  timing: Partial<PortalGuardTiming> = {},
): PortalRouteGuardLimits {
  const resolvedTiming = {
    redisTimeoutMs: timing.redisTimeoutMs ?? readPortalRedisTimeoutMs(env),
    upstreamTimeoutMs: timing.upstreamTimeoutMs ?? readPortalHybridTotalTimeoutMs(env),
  };
  return validatePortalHybridGuardLimits(
    {
      minuteBudget: boundedEnvironmentInteger(env, 'PORTAL_HYBRID_MINUTE_BUDGET', 60, 1, 1_000_000),
      dailyBudget: boundedEnvironmentInteger(
        env,
        'PORTAL_HYBRID_DAILY_BUDGET',
        5_000,
        1,
        100_000_000,
      ),
      maxConcurrency: boundedEnvironmentInteger(env, 'PORTAL_HYBRID_MAX_CONCURRENCY', 4, 1, 10_000),
      leaseTtlSeconds: boundedEnvironmentInteger(
        env,
        'PORTAL_HYBRID_LEASE_TTL_SECONDS',
        DEFAULT_HYBRID_LEASE_TTL_SECONDS,
        MINIMUM_LEASE_TTL_SECONDS,
        300,
      ),
      cacheTtlSeconds: boundedEnvironmentInteger(
        env,
        'PORTAL_HYBRID_CACHE_TTL_SECONDS',
        PORTAL_HYBRID_CACHE_TTL_SECONDS,
        1,
        PORTAL_HYBRID_CACHE_TTL_SECONDS,
      ),
    },
    resolvedTiming,
  );
}

export function readPortalHybridCircuitLimits(
  env: PortalRedisEnvironment = Deno.env,
): PortalHybridCircuitLimits {
  return {
    failureThreshold: boundedEnvironmentInteger(
      env,
      'PORTAL_HYBRID_CIRCUIT_FAILURE_THRESHOLD',
      DEFAULT_HYBRID_CIRCUIT_FAILURE_THRESHOLD,
      1,
      100,
    ),
    failureWindowSeconds: boundedEnvironmentInteger(
      env,
      'PORTAL_HYBRID_CIRCUIT_WINDOW_SECONDS',
      DEFAULT_HYBRID_CIRCUIT_WINDOW_SECONDS,
      1,
      3_600,
    ),
    openSeconds: boundedEnvironmentInteger(
      env,
      'PORTAL_HYBRID_CIRCUIT_OPEN_SECONDS',
      DEFAULT_HYBRID_CIRCUIT_OPEN_SECONDS,
      1,
      3_600,
    ),
  };
}

export function minimumPortalLeaseTtlSeconds(timing: PortalGuardTiming): number {
  if (
    !Number.isSafeInteger(timing.redisTimeoutMs) ||
    timing.redisTimeoutMs < 0 ||
    !Number.isSafeInteger(timing.upstreamTimeoutMs) ||
    timing.upstreamTimeoutMs < 0
  ) {
    throw new PortalRedisError();
  }
  return Math.max(
    MINIMUM_LEASE_TTL_SECONDS,
    Math.ceil((timing.redisTimeoutMs + timing.upstreamTimeoutMs) / 1000) + 5,
  );
}

export function validatePortalLciaGuardLimits(
  limits: PortalRouteGuardLimits,
  timing: PortalGuardTiming,
): PortalRouteGuardLimits {
  const integerWithin = (value: number, minimum: number, maximum: number) =>
    Number.isSafeInteger(value) && value >= minimum && value <= maximum;
  if (
    !integerWithin(limits.minuteBudget, 1, 1_000_000) ||
    !integerWithin(limits.dailyBudget, 1, 100_000_000) ||
    !integerWithin(limits.maxConcurrency, 1, 10_000) ||
    !integerWithin(limits.leaseTtlSeconds, MINIMUM_LEASE_TTL_SECONDS, 300) ||
    !integerWithin(limits.cacheTtlSeconds, 1, PORTAL_LCIA_RESPONSE_CACHE_TTL_SECONDS) ||
    limits.leaseTtlSeconds < minimumPortalLeaseTtlSeconds(timing)
  ) {
    throw new PortalRedisError();
  }
  return limits;
}

export function validatePortalHybridGuardLimits(
  limits: PortalRouteGuardLimits,
  timing: PortalGuardTiming,
): PortalRouteGuardLimits {
  const integerWithin = (value: number, minimum: number, maximum: number) =>
    Number.isSafeInteger(value) && value >= minimum && value <= maximum;
  if (
    !integerWithin(limits.minuteBudget, 1, 1_000_000) ||
    !integerWithin(limits.dailyBudget, 1, 100_000_000) ||
    !integerWithin(limits.maxConcurrency, 1, 10_000) ||
    !integerWithin(limits.leaseTtlSeconds, MINIMUM_LEASE_TTL_SECONDS, 300) ||
    !integerWithin(limits.cacheTtlSeconds, 1, PORTAL_HYBRID_CACHE_TTL_SECONDS) ||
    limits.leaseTtlSeconds < minimumPortalLeaseTtlSeconds(timing)
  ) {
    throw new PortalRedisError();
  }
  return limits;
}

async function usePortalRedisAdapter<T>(
  adapter: PortalRedisAdapter | undefined,
  operation: (resolved: PortalRedisAdapter) => Promise<T>,
): Promise<T> {
  const resolved = adapter ?? (await createPortalRedisAdapter());
  try {
    return await operation(resolved);
  } catch (_error) {
    throw new PortalRedisError();
  } finally {
    if (!adapter) await resolved.close().catch(() => undefined);
  }
}

export async function redisSetNxEx(
  key: string,
  value: string,
  ttlSeconds: number,
  adapter?: PortalRedisAdapter,
): Promise<boolean> {
  return await usePortalRedisAdapter(adapter, (resolved) =>
    resolved.setNxEx(key, value, ttlSeconds),
  );
}

function finiteInteger(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function randomLeaseId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

export async function redisEvalAtomicGuard(
  input: {
    route: string;
    limits: PortalRouteGuardLimits;
    nowMillis?: number;
    cost?: number;
  },
  adapter?: PortalRedisAdapter,
): Promise<PortalGuardAdmission> {
  if (!ROUTE_PATTERN.test(input.route)) throw new PortalRedisError();
  const nowMillis = input.nowMillis ?? Date.now();
  const cost = input.cost ?? 1;
  if (
    !Number.isSafeInteger(nowMillis) ||
    nowMillis < 0 ||
    !Number.isSafeInteger(cost) ||
    cost < 1
  ) {
    throw new PortalRedisError();
  }
  const leaseId = randomLeaseId();
  const leaseExpiresMillis = nowMillis + input.limits.leaseTtlSeconds * 1000;
  const minuteWindow = Math.floor(nowMillis / 60_000);
  const dailyWindow = Math.floor(nowMillis / 86_400_000);

  return await usePortalRedisAdapter(adapter, async (resolved) => {
    const prefix = resolved.namespace;
    const result = await resolved.eval(
      PORTAL_ATOMIC_GUARD_LUA,
      [
        `${prefix}:budget:${input.route}:minute:${minuteWindow}`,
        `${prefix}:budget:${input.route}:daily:${dailyWindow}`,
        `${prefix}:lease:${input.route}`,
      ],
      [
        String(nowMillis),
        String(leaseExpiresMillis),
        leaseId,
        String(input.limits.minuteBudget),
        String(input.limits.dailyBudget),
        String(input.limits.maxConcurrency),
        String(MINUTE_COUNTER_TTL_SECONDS),
        String(DAILY_COUNTER_TTL_SECONDS),
        String(input.limits.leaseTtlSeconds + 1),
        String(cost),
      ],
    );
    if (!Array.isArray(result) || result.length !== 5) throw new PortalRedisError();
    const values = result.map(finiteInteger);
    if (values.some((value) => value === null)) throw new PortalRedisError();
    const [code, remainingMinute, remainingDaily, remainingConcurrency, recoveredLeaseCount] =
      values as number[];
    if (recoveredLeaseCount < 0) throw new PortalRedisError();
    const common = {
      remainingMinute: Math.max(0, remainingMinute),
      remainingDaily: Math.max(0, remainingDaily),
      remainingConcurrency: Math.max(0, remainingConcurrency),
      recoveredLeaseCount,
    };
    if (code === 0) return { status: 'admitted', leaseId, ...common };
    if (code === 1) return { status: 'budget_exhausted', ...common };
    if (code === 2) return { status: 'concurrency_exhausted', ...common };
    throw new PortalRedisError();
  });
}

export async function redisEvalAtomicHybridBegin(
  input: {
    route: string;
    keyId: string;
    nonce: string;
    limits: PortalRouteGuardLimits;
    nowMillis?: number;
    cost?: number;
  },
  adapter?: PortalRedisAdapter,
): Promise<PortalHybridAtomicBegin> {
  if (
    !ROUTE_PATTERN.test(input.route) ||
    !KEY_ID_PATTERN.test(input.keyId) ||
    !NONCE_PATTERN.test(input.nonce)
  ) {
    throw new PortalRedisError();
  }
  const nowMillis = input.nowMillis ?? Date.now();
  const cost = input.cost ?? 1;
  const integerWithin = (value: number, minimum: number, maximum: number) =>
    Number.isSafeInteger(value) && value >= minimum && value <= maximum;
  if (
    !Number.isSafeInteger(nowMillis) ||
    nowMillis < 0 ||
    !integerWithin(cost, 1, 1_000_000) ||
    !integerWithin(input.limits.minuteBudget, 1, 1_000_000) ||
    !integerWithin(input.limits.dailyBudget, 1, 100_000_000) ||
    !integerWithin(input.limits.maxConcurrency, 1, 10_000) ||
    !integerWithin(input.limits.leaseTtlSeconds, MINIMUM_LEASE_TTL_SECONDS, 300) ||
    !integerWithin(input.limits.cacheTtlSeconds, 1, PORTAL_HYBRID_CACHE_TTL_SECONDS)
  ) {
    throw new PortalRedisError();
  }

  const leaseId = randomLeaseId();
  const leaseExpiresMillis = nowMillis + input.limits.leaseTtlSeconds * 1000;
  const minuteWindow = Math.floor(nowMillis / 60_000);
  const dailyWindow = Math.floor(nowMillis / 86_400_000);

  return await usePortalRedisAdapter(adapter, async (resolved) => {
    const prefix = resolved.namespace;
    const circuitKeys = portalHybridCircuitKeys(resolved, input.route);
    const result = await resolved.eval(
      PORTAL_HYBRID_ATOMIC_BEGIN_LUA,
      [
        `${prefix}:replay:${input.keyId}:${input.nonce}`,
        `${prefix}:budget:${input.route}:minute:${minuteWindow}`,
        `${prefix}:budget:${input.route}:daily:${dailyWindow}`,
        `${prefix}:lease:${input.route}`,
        circuitKeys.openUntil,
      ],
      [
        String(nowMillis),
        String(leaseExpiresMillis),
        leaseId,
        String(input.limits.minuteBudget),
        String(input.limits.dailyBudget),
        String(input.limits.maxConcurrency),
        String(MINUTE_COUNTER_TTL_SECONDS),
        String(DAILY_COUNTER_TTL_SECONDS),
        String(input.limits.leaseTtlSeconds + 1),
        String(cost),
        String(REPLAY_TTL_SECONDS),
      ],
    );
    if (!Array.isArray(result) || result.length !== 6) throw new PortalRedisError();
    const values = result.map(finiteInteger);
    if (values.some((value) => value === null)) throw new PortalRedisError();
    const [
      code,
      remainingMinute,
      remainingDaily,
      remainingConcurrency,
      recoveredLeaseCount,
      openUntilMillis,
    ] = values as number[];
    if (recoveredLeaseCount < 0) throw new PortalRedisError();
    const common = {
      remainingMinute: Math.max(0, remainingMinute),
      remainingDaily: Math.max(0, remainingDaily),
      remainingConcurrency: Math.max(0, remainingConcurrency),
      recoveredLeaseCount,
    };
    if (code === 3 && recoveredLeaseCount === 0 && openUntilMillis === 0) {
      return { status: 'replay_rejected', recoveredLeaseCount: 0 };
    }
    if (code === 1 && openUntilMillis === 0) {
      return { status: 'budget_exhausted', ...common };
    }
    if (code === 2 && openUntilMillis === 0) {
      return { status: 'concurrency_exhausted', ...common };
    }
    if (code === 4 && openUntilMillis > nowMillis) {
      return {
        status: 'circuit_open',
        leaseId,
        retryAfterSeconds: Math.max(1, Math.ceil((openUntilMillis - nowMillis) / 1000)),
        ...common,
      };
    }
    if (code === 0 && openUntilMillis === 0) {
      return {
        status: 'admitted',
        leaseId,
        ...common,
      };
    }
    throw new PortalRedisError();
  });
}

export async function registerPortalNonce(
  input: { keyId: string; nonce: string },
  adapter?: PortalRedisAdapter,
): Promise<boolean> {
  if (!KEY_ID_PATTERN.test(input.keyId) || !NONCE_PATTERN.test(input.nonce)) {
    throw new PortalRedisError();
  }
  return await usePortalRedisAdapter(adapter, (resolved) =>
    redisSetNxEx(
      `${resolved.namespace}:replay:${input.keyId}:${input.nonce}`,
      '1',
      REPLAY_TTL_SECONDS,
      resolved,
    ),
  );
}

export async function releasePortalConcurrencyLease(
  input: { route: string; leaseId: string },
  adapter?: PortalRedisAdapter,
): Promise<void> {
  if (!ROUTE_PATTERN.test(input.route) || !NONCE_PATTERN.test(input.leaseId)) return;
  await usePortalRedisAdapter(adapter, async (resolved) => {
    const result = await resolved.eval(
      PORTAL_RELEASE_LEASE_LUA,
      [`${resolved.namespace}:lease:${input.route}`],
      [input.leaseId],
    );
    if (finiteInteger(result) === null) throw new PortalRedisError();
  });
}

function portalHybridCircuitKeys(adapter: PortalRedisAdapter, route: string) {
  if (!ROUTE_PATTERN.test(route)) throw new PortalRedisError();
  return {
    failures: `${adapter.namespace}:circuit:${route}:failures`,
    openUntil: `${adapter.namespace}:circuit:${route}:open_until`,
  };
}

export async function checkPortalHybridCircuit(
  input: { route: string; nowMillis?: number },
  adapter?: PortalRedisAdapter,
): Promise<PortalHybridCircuitState> {
  const nowMillis = input.nowMillis ?? Date.now();
  if (!Number.isSafeInteger(nowMillis) || nowMillis < 0) throw new PortalRedisError();
  return await usePortalRedisAdapter(adapter, async (resolved) => {
    const keys = portalHybridCircuitKeys(resolved, input.route);
    const result = await resolved.eval(
      PORTAL_HYBRID_CIRCUIT_CHECK_LUA,
      [keys.openUntil],
      [String(nowMillis)],
    );
    if (!Array.isArray(result) || result.length !== 2) throw new PortalRedisError();
    const code = finiteInteger(result[0]);
    const openUntilMillis = finiteInteger(result[1]);
    if (code === null || openUntilMillis === null) throw new PortalRedisError();
    if (code === 0 && openUntilMillis === 0) return { status: 'closed', retryAfterSeconds: 0 };
    if (code === 1 && openUntilMillis > nowMillis) {
      return {
        status: 'open',
        retryAfterSeconds: Math.max(1, Math.ceil((openUntilMillis - nowMillis) / 1000)),
      };
    }
    throw new PortalRedisError();
  });
}

export async function recordPortalHybridCircuitFailure(
  input: {
    route: string;
    limits: PortalHybridCircuitLimits;
    nowMillis?: number;
  },
  adapter?: PortalRedisAdapter,
): Promise<PortalHybridCircuitFailure> {
  const nowMillis = input.nowMillis ?? Date.now();
  if (
    !Number.isSafeInteger(nowMillis) ||
    nowMillis < 0 ||
    !Number.isSafeInteger(input.limits.failureThreshold) ||
    input.limits.failureThreshold < 1 ||
    input.limits.failureThreshold > 100 ||
    !Number.isSafeInteger(input.limits.failureWindowSeconds) ||
    input.limits.failureWindowSeconds < 1 ||
    input.limits.failureWindowSeconds > 3_600 ||
    !Number.isSafeInteger(input.limits.openSeconds) ||
    input.limits.openSeconds < 1 ||
    input.limits.openSeconds > 3_600
  ) {
    throw new PortalRedisError();
  }
  return await usePortalRedisAdapter(adapter, async (resolved) => {
    const keys = portalHybridCircuitKeys(resolved, input.route);
    const result = await resolved.eval(
      PORTAL_HYBRID_CIRCUIT_FAILURE_LUA,
      [keys.failures, keys.openUntil],
      [
        String(input.limits.failureThreshold),
        String(input.limits.failureWindowSeconds),
        String(input.limits.openSeconds),
        String(nowMillis),
      ],
    );
    if (!Array.isArray(result) || result.length !== 3) throw new PortalRedisError();
    const code = finiteInteger(result[0]);
    const failureCount = finiteInteger(result[1]);
    const openUntilMillis = finiteInteger(result[2]);
    if (code === null || failureCount === null || failureCount < 1 || openUntilMillis === null) {
      throw new PortalRedisError();
    }
    if (code === 0 && openUntilMillis === 0) {
      return { opened: false, failureCount, retryAfterSeconds: 0 };
    }
    if (code === 1 && openUntilMillis > nowMillis) {
      return {
        opened: true,
        failureCount,
        retryAfterSeconds: Math.max(1, Math.ceil((openUntilMillis - nowMillis) / 1000)),
      };
    }
    throw new PortalRedisError();
  });
}

export async function recordPortalHybridCircuitSuccess(
  input: { route: string },
  adapter?: PortalRedisAdapter,
): Promise<void> {
  await usePortalRedisAdapter(adapter, async (resolved) => {
    const keys = portalHybridCircuitKeys(resolved, input.route);
    const result = finiteInteger(
      await resolved.eval(PORTAL_HYBRID_CIRCUIT_SUCCESS_LUA, [keys.failures], []),
    );
    if (result === null || result < 0) throw new PortalRedisError();
  });
}

function portalCacheKey(adapter: PortalRedisAdapter, route: string, bodyHash: string): string {
  if (!ROUTE_PATTERN.test(route) || !BODY_HASH_PATTERN.test(bodyHash)) {
    throw new PortalRedisError();
  }
  return `${adapter.namespace}:cache:${route}:${bodyHash}`;
}

export async function readPortalResponseCache(
  input: { route: string; bodyHash: string },
  adapter?: PortalRedisAdapter,
): Promise<string | null> {
  return await usePortalRedisAdapter(adapter, (resolved) =>
    resolved.get(portalCacheKey(resolved, input.route, input.bodyHash)),
  );
}

export async function writePortalResponseCache(
  input: { route: string; bodyHash: string; value: string; ttlSeconds: number },
  adapter?: PortalRedisAdapter,
): Promise<void> {
  await usePortalRedisAdapter(adapter, (resolved) =>
    resolved.setEx(
      portalCacheKey(resolved, input.route, input.bodyHash),
      input.value,
      input.ttlSeconds,
    ),
  );
}

export {
  DEFAULT_HYBRID_CIRCUIT_FAILURE_THRESHOLD,
  DEFAULT_HYBRID_LEASE_TTL_SECONDS,
  DEFAULT_HYBRID_CIRCUIT_OPEN_SECONDS,
  DEFAULT_HYBRID_CIRCUIT_WINDOW_SECONDS,
  DEFAULT_LEASE_TTL_SECONDS,
  MINIMUM_LEASE_TTL_SECONDS,
  PORTAL_HYBRID_CACHE_TTL_SECONDS,
  PORTAL_HYBRID_TOTAL_TIMEOUT_MS,
  PORTAL_LCIA_RESPONSE_CACHE_TTL_SECONDS,
  REPLAY_TTL_SECONDS,
};
