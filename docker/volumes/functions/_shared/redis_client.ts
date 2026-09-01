import { Redis as UpstashRedis } from 'https://esm.sh/@upstash/redis@1.38.3';
import { connect, type Redis as DenoRedis } from 'jsr:@db/redis@0.41.2';

type RedisClient = UpstashRedis | DenoRedis;

export type PortalRedisProvider = 'upstash' | 'standard';

export type PortalRedisRuntimeConfig = {
  provider: PortalRedisProvider;
  namespace: string;
  timeoutMs: number;
  upstashUrl?: string;
  upstashToken?: string;
  redisUrl?: string;
  redisPassword?: string;
};

export type PortalRedisEnvironment = Pick<typeof Deno.env, 'get'>;

export interface PortalRedisAdapter {
  readonly namespace: string;
  setNxEx(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
  get(key: string): Promise<string | null>;
  setEx(key: string, value: string, ttlSeconds: number): Promise<void>;
  close(): Promise<void>;
}

export class PortalRedisError extends Error {
  readonly code = 'guard_unavailable';

  constructor() {
    super('guard_unavailable');
    this.name = 'PortalRedisError';
  }
}

const PORTAL_REDIS_NAMESPACE_PATTERN = /^portal:[a-z0-9][a-z0-9-]{0,31}:v1$/;

function portalRedisEnvironmentValue(
  env: PortalRedisEnvironment,
  name: string,
): string | undefined {
  const value = env.get(name)?.trim();
  return value ? value : undefined;
}

function portalRedisRequiredEnvironmentValue(env: PortalRedisEnvironment, name: string): string {
  const value = portalRedisEnvironmentValue(env, name);
  if (!value) throw new PortalRedisError();
  return value;
}

function portalRedisTimeout(value: string | undefined): number {
  if (value === undefined) return 500;
  if (!/^\d+$/u.test(value)) throw new PortalRedisError();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 50 || parsed > 5_000) {
    throw new PortalRedisError();
  }
  return parsed;
}

export function readPortalRedisTimeoutMs(env: PortalRedisEnvironment = Deno.env): number {
  return portalRedisTimeout(portalRedisEnvironmentValue(env, 'PORTAL_REDIS_TIMEOUT_MS'));
}

export function readPortalRedisRuntimeConfig(
  env: PortalRedisEnvironment = Deno.env,
): PortalRedisRuntimeConfig {
  const provider = portalRedisRequiredEnvironmentValue(env, 'PORTAL_REDIS_CLIENT_TYPE');
  if (provider !== 'upstash' && provider !== 'standard') {
    throw new PortalRedisError();
  }
  const namespace = portalRedisRequiredEnvironmentValue(env, 'PORTAL_REDIS_NAMESPACE');
  if (!PORTAL_REDIS_NAMESPACE_PATTERN.test(namespace)) {
    throw new PortalRedisError();
  }
  const timeoutMs = readPortalRedisTimeoutMs(env);

  if (provider === 'upstash') {
    const upstashUrl = portalRedisRequiredEnvironmentValue(env, 'PORTAL_UPSTASH_REDIS_URL');
    const upstashToken = portalRedisRequiredEnvironmentValue(env, 'PORTAL_UPSTASH_REDIS_TOKEN');
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(upstashUrl);
    } catch (_error) {
      throw new PortalRedisError();
    }
    if (parsedUrl.protocol !== 'https:') throw new PortalRedisError();
    return { provider, namespace, timeoutMs, upstashUrl, upstashToken };
  }

  const redisUrl = portalRedisRequiredEnvironmentValue(env, 'PORTAL_REDIS_URL');
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(redisUrl);
  } catch (_error) {
    throw new PortalRedisError();
  }
  if (parsedUrl.protocol !== 'redis:' && parsedUrl.protocol !== 'rediss:') {
    throw new PortalRedisError();
  }
  return {
    provider,
    namespace,
    timeoutMs,
    redisUrl,
    redisPassword: portalRedisEnvironmentValue(env, 'PORTAL_REDIS_PASSWORD'),
  };
}

async function withPortalRedisTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(new PortalRedisError()), timeoutMs);
      }),
    ]);
  } catch (_error) {
    throw new PortalRedisError();
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

class PortalRedisSdkAdapter implements PortalRedisAdapter {
  constructor(
    private readonly client: RedisClient,
    readonly namespace: string,
    private readonly timeoutMs: number,
  ) {}

  async setNxEx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1) {
      throw new PortalRedisError();
    }
    const operation = isUpstashClient(this.client)
      ? this.client.set(key, value, { nx: true, ex: ttlSeconds })
      : this.client.set(key, value, { nx: true, ex: ttlSeconds });
    const result = await withPortalRedisTimeout(operation, this.timeoutMs);
    if (result === null) return false;
    if (result !== 'OK') throw new PortalRedisError();
    return true;
  }

  async eval(script: string, keys: string[], args: string[]): Promise<unknown> {
    const operation = isUpstashClient(this.client)
      ? this.client.eval(script, keys, args)
      : this.client.eval(script, keys, args);
    return await withPortalRedisTimeout(operation, this.timeoutMs);
  }

  async get(key: string): Promise<string | null> {
    const operation = isUpstashClient(this.client)
      ? this.client.get<string>(key)
      : this.client.get(key);
    const result = await withPortalRedisTimeout(operation, this.timeoutMs);
    if (result === null || typeof result === 'string') return result;
    throw new PortalRedisError();
  }

  async setEx(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1) {
      throw new PortalRedisError();
    }
    const operation = isUpstashClient(this.client)
      ? this.client.set(key, value, { ex: ttlSeconds })
      : this.client.set(key, value, { ex: ttlSeconds });
    const result = await withPortalRedisTimeout(operation, this.timeoutMs);
    if (result !== 'OK') throw new PortalRedisError();
  }

  async close(): Promise<void> {
    if (!isUpstashClient(this.client)) this.client.close();
  }
}

export async function createPortalRedisAdapter(
  config: PortalRedisRuntimeConfig = readPortalRedisRuntimeConfig(),
): Promise<PortalRedisAdapter> {
  try {
    if (config.provider === 'upstash') {
      if (!config.upstashUrl || !config.upstashToken) {
        throw new PortalRedisError();
      }
      return new PortalRedisSdkAdapter(
        new UpstashRedis({
          url: config.upstashUrl,
          token: config.upstashToken,
          automaticDeserialization: false,
        }),
        config.namespace,
        config.timeoutMs,
      );
    }
    if (!config.redisUrl) throw new PortalRedisError();
    const url = new URL(config.redisUrl);
    const client = await withPortalRedisTimeout(
      connect({
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 6379,
        password: config.redisPassword ?? (url.password || undefined),
        tls: url.protocol === 'rediss:',
      }),
      config.timeoutMs,
    );
    return new PortalRedisSdkAdapter(client, config.namespace, config.timeoutMs);
  } catch (_error) {
    throw new PortalRedisError();
  }
}

// Type guard to check if client is Upstash
function isUpstashClient(client: RedisClient): client is UpstashRedis {
  return 'get' in client && typeof client.get === 'function' && !('sendCommand' in client);
}
