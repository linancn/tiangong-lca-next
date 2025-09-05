import { Redis as UpstashRedis } from '@upstash/redis';
import { createClient, RedisClientType as StandardRedisClient } from 'redis';

/**
 * Support Upstash and Standard Redis Client
 * Upstash is used in TianGong LCA Web App(Cloud)
 * Standard Redis Client is used in TianGong LCA Web App(Local)
 * Set the REDIS_CLIENT_TYPE environment variable to 'upstash' or 'standard' to use the corresponding client
 * If REDIS_CLIENT_TYPE is not set, the default is 'upstash'
 */
type RedisClientTypeOption = 'upstash' | 'standard';
type RedisClient = UpstashRedis | StandardRedisClient;

function getRedisClientType(): RedisClientTypeOption {
  const clientType = Deno.env.get('REDIS_CLIENT_TYPE');
  return clientType === 'standard' ? 'standard' : 'upstash';
}

function getUpstashClient(): UpstashRedis {
  console.log('Getting Upstash Client');
  return new UpstashRedis({
    url: Deno.env.get('UPSTASH_REDIS_URL') ?? '',
    token: Deno.env.get('UPSTASH_REDIS_TOKEN') ?? '',
  });
}

async function getStandardClient(): Promise<StandardRedisClient> {
  console.log('Getting Standard Redis Client');
  const client = createClient({
    url: Deno.env.get('REDIS_URL') ?? '',
    password: Deno.env.get('REDIS_PASSWORD'),
  });
  
  await client.connect();
  return client;
}

async function getRedisClient(): Promise<RedisClient> {
  const clientType = getRedisClientType();
  
  if (clientType === 'upstash') {
    return getUpstashClient();
  } else {
    return await getStandardClient();
  }
}

// Type guard to check if client is Upstash
function isUpstashClient(client: RedisClient): client is UpstashRedis {
  return 'get' in client && typeof client.get === 'function' && !('v4' in client);
}

// Helper function for type-safe get operation
async function redisGet<T = unknown>(client: RedisClient, key: string): Promise<T | null> {
  if (isUpstashClient(client)) {
    const value = await client.get<T>(key);
    console.log('Upstash Redis Client get value:', value);
    return value as T | null;
  } else {
    const value = await client.get(key);
    console.log('Standard Redis Client get value:', value);
    return value as T | null;
  }
}

// Helper function for type-safe set operation
async function redisSet(client: RedisClient, key: string, value: unknown, options?: { ex?: number }): Promise<void> {
  if (isUpstashClient(client)) {
    if (options?.ex) {
      await client.set(key, value, { ex: options.ex });
      console.log('Upstash Redis Client set value:', value);
    } else {
      await client.set(key, value);
    }
  } else {
    if (options?.ex) {
      await client.set(key, value, { EX: options.ex });
      console.log('Standard Redis Client set value:', value);
    } else {
      await client.set(key, value);
    }
  }
}

export { 
    getRedisClient,
    getUpstashClient, 
    getStandardClient, 
    getRedisClientType,
    redisGet,
    redisSet,
    isUpstashClient,
    type RedisClient,
    type UpstashRedis,
    type StandardRedisClient
};