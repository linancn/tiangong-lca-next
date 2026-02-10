import type { User, UserAppMetadata, UserMetadata } from '@supabase/supabase-js@2';
import { SupabaseClient } from '@supabase/supabase-js@2';
// import { Redis } from '@upstash/redis';
import { authenticateCognitoToken } from './cognito_auth.ts';
import { corsHeaders } from './cors.ts';
import decodeApiKey from './decode_api_key.ts';
import { redisGet, redisSet, type RedisClient } from './redis_client.ts';

const _defaultAppMetadata: UserAppMetadata = {
  provider: '',
};

const _defaultUserMetadata: UserMetadata = {
  provider: '',
};

const _defaultAud = '';

const _defaultCreatedAt = '';

export interface AuthedUser extends User {
  role?: string;
}

/**
 * Authentication result interface
 */
export interface AuthResult {
  isAuthenticated: boolean;
  user?: User | AuthedUser;
  response?: Response;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** Supabase client instance */
  supabase?: SupabaseClient;
  /** Redis client instance for caching */
  redis?: RedisClient;
  /** Whether to require authentication (default: true) */
  requireAuth?: boolean;
  /** Allowed authentication methods */
  allowedMethods?: AuthMethod[];
  /** Optional override for Service API key (defaults to env vars) */
  serviceApiKey?: string;
}

/**
 * Supported authentication methods
 */
export enum AuthMethod {
  /** Supabase JWT token via Authorization header, used in TianGong LCA Web App. */
  JWT = 'jwt',
  /** User API key via Authorization header, used in openAPI Service and MCP Service. */
  USER_API_KEY = 'user_api_key',
  /** Service API key via apiKey header, used in database webhooks, backend services, etc. */
  SERVICE_API_KEY = 'service_api_key',
}

/**
 * Unified authentication middleware for Supabase Edge Functions
 *
 * This middleware provides a centralized authentication solution supporting multiple auth methods:
 *
 * 1. **Supabase JWT**: Standard Supabase authentication via Authorization header
 * 2. **User API Key**: Base64 encoded credentials via Authorization header
 * 3. **Service API Key**: Special API key for backend services via apiKey header
 *
 * @example
 * ```typescript
 * // Basic usage with Supabase JWT
 * const authResult = await authenticateRequest(req, {
 *   supabase: supabaseClient,
 *   allowedMethods: [AuthMethod.JWT]
 * });
 *
 * // With User API key support and Redis caching
 * const authResult = await authenticateRequest(req, {
 *   supabase: supabaseClient,
 *   redis: redisClient,
 *   allowedMethods: [AuthMethod.USER_API_KEY]
 * });
 *
 * // For service requests
 * const authResult = await authenticateRequest(req, {
 *   allowedMethods: [AuthMethod.SERVICE_API_KEY]
 * });
 * ```
 */
export async function authenticateRequest(
  req: Request,
  config: AuthConfig = {},
): Promise<AuthResult> {
  const {
    supabase,
    redis,
    requireAuth = true,
    allowedMethods = [AuthMethod.JWT, AuthMethod.USER_API_KEY, AuthMethod.SERVICE_API_KEY],
    serviceApiKey,
  } = config;

  const resolvedServiceApiKey =
    serviceApiKey ?? Deno.env.get('REMOTE_SERVICE_API_KEY') ?? Deno.env.get('SERVICE_API_KEY');

  // If authentication is not required, return success
  if (!requireAuth) {
    console.log('Authentication is not required');
    return { isAuthenticated: true };
  }

  const authHeader = req.headers.get('Authorization');
  const apiKey = req.headers.get('apikey');

  // Collect all possible authentication results
  const authResults: Array<{ method: AuthMethod; result: AuthResult | Promise<AuthResult> }> = [];

  // Check Service API key
  if (allowedMethods.includes(AuthMethod.SERVICE_API_KEY) && apiKey) {
    console.log('Checking Service API key authentication');
    const result = authenticateServiceApiKey(apiKey, resolvedServiceApiKey);
    authResults.push({ method: AuthMethod.SERVICE_API_KEY, result });
  }

  // Check User API key
  if (allowedMethods.includes(AuthMethod.USER_API_KEY) && supabase && redis && authHeader) {
    console.log('Checking User API key authentication');
    const apiKeyValue = authHeader.replace('Bearer ', '');
    const result = authenticateUserApiKey(apiKeyValue, supabase, redis);
    authResults.push({ method: AuthMethod.USER_API_KEY, result });
  }

  // Check Supabase JWT
  if (allowedMethods.includes(AuthMethod.JWT) && supabase && authHeader) {
    console.log('Checking Supabase JWT authentication');
    const token = authHeader.replace('Bearer ', '');
    const result = authenticateSupabaseJWT(token, supabase);
    authResults.push({ method: AuthMethod.JWT, result });
  }

  // If no authentication method is found, return unauthorized
  if (authResults.length === 0) {
    console.log('No valid authentication method found');
    return {
      isAuthenticated: false,
      response: new Response('Unauthorized Request', {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  // Await all asynchronous authentication results
  const resolvedResults = await Promise.all(
    authResults.map(async ({ method, result }) => ({
      method,
      result: await result,
    })),
  );

  // Count successful and failed authentication methods
  const successfulAuths = resolvedResults.filter((r) => r.result.isAuthenticated);
  const failedAuths = resolvedResults.filter((r) => !r.result.isAuthenticated);

  console.log(
    `Authentication results: ${successfulAuths.length} successful, ${failedAuths.length} failed`,
  );

  // If multiple methods succeed, return error (only one method is allowed)
  if (successfulAuths.length > 1) {
    console.log('Multiple authentication methods succeeded, which is not allowed');
    return {
      isAuthenticated: false,
      response: new Response('Multiple authentication methods provided', {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  // If only one method succeeds, return that result
  if (successfulAuths.length === 1) {
    const { method, result } = successfulAuths[0];
    console.log(`Authentication successful with method: ${method}`);
    return result;
  }

  // If all methods fail, return the first failed result
  console.log('All authentication methods failed');
  return failedAuths[0].result;
}

/**
 * Determine if a bearer token is from Cognito or Supabase
 * @param bearerKey - The bearer token to analyze
 * @returns Token type: 'cognito' or 'supabase'
 */
function getTokenType(bearerKey: string): 'cognito' | 'supabase' {
  const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

  if (jwtPattern.test(bearerKey)) {
    try {
      const payload = JSON.parse(atob(bearerKey.split('.')[1]));
      if (payload.iss && payload.iss.includes('cognito')) {
        return 'cognito';
      }
    } catch (_error) {
      // If parsing fails, we assume it's not a Cognito token
      return 'supabase';
    }
  }
  return 'supabase';
}

/**
 * Authenticate using Supabase JWT token, used in TianGong LCA Web App. JWT token in the Authorization header, after `Bearer ` prefix.
 * @param token - The JWT token
 * @param supabase - The Supabase client, created with `Publishable key`
 * @returns The authentication result
 */
async function authenticateSupabaseJWT(
  token: string,
  supabase: SupabaseClient,
): Promise<AuthResult> {
  if (getTokenType(token) === 'cognito') {
    console.log('Detected Cognito token, delegating to Cognito authentication');
    return await authenticateCognitoToken(token);
  }

  const { data: authData } = await supabase.auth.getUser(token);
  console.log('Supabase JWT authentication result:', authData);

  if (!authData?.user) {
    return {
      isAuthenticated: false,
      response: new Response('User Not Found', {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  if (authData.user.role !== 'authenticated') {
    return {
      isAuthenticated: false,
      response: new Response('Forbidden', {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  return {
    isAuthenticated: true,
    user: authData.user,
  };
}

/**
 * Authenticate using User API Key (email:password encoded), used in the openAPI Service and MCP Service. API key in the Authorization header, after `Bearer ` prefix.
 * @param apiKey - The API key
 * @param supabase - The Supabase client, created with `Publishable key`
 * @param redis - The Redis client
 * @returns The authentication result
 */
async function authenticateUserApiKey(
  apiKey: string,
  supabase: SupabaseClient,
  redis: RedisClient,
): Promise<AuthResult> {
  const credentials = decodeApiKey(apiKey);
  if (!credentials) {
    return {
      isAuthenticated: false,
      response: new Response(JSON.stringify({ error: 'The Credentials from user are invalid.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  const { email = '', password = '' } = credentials;
  const cacheKey = `lca_${email}`;
  const cachedUserId = await redisGet(redis, cacheKey);

  if (cachedUserId) {
    return {
      isAuthenticated: true,
      user: {
        id: String(cachedUserId),
        email: email,
        app_metadata: _defaultAppMetadata,
        user_metadata: _defaultUserMetadata,
        aud: _defaultAud,
        created_at: _defaultCreatedAt,
      },
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error || !data.user) {
    return {
      isAuthenticated: false,
      response: new Response('Unauthorized', {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  if (data.user.role !== 'authenticated') {
    return {
      isAuthenticated: false,
      response: new Response('You are not an authenticated user.', {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  // Cache the user ID for 1 hour
  // await redis.setex(cacheKey, 3600, data.user.id);
  await redisSet(redis, cacheKey, data.user.id, { ex: 3600 });

  return {
    isAuthenticated: true,
    user: {
      id: data.user.id,
      email: data.user.email,
      app_metadata: _defaultAppMetadata,
      user_metadata: _defaultUserMetadata,
      aud: _defaultAud,
      created_at: _defaultCreatedAt,
    },
  };
}

/**
 * Authenticate service requests using a special API key, used in database webhooks, backend services, etc.
 * @param providedKey - The API key provided in the request headers
 * @param expectedKey - The expected API key
 * @returns The authentication result
 */
function authenticateServiceApiKey(providedKey: string, expectedKey?: string): AuthResult {
  if (!expectedKey) {
    return {
      isAuthenticated: false,
      response: new Response('Service API key not configured', {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  if (providedKey !== expectedKey) {
    return {
      isAuthenticated: false,
      response: new Response('Invalid service API key', {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  return {
    isAuthenticated: true,
    // Service requests don't have a specific user
    user: {
      id: 'service',
      role: 'service',
      app_metadata: _defaultAppMetadata,
      user_metadata: _defaultUserMetadata,
      aud: _defaultAud,
      created_at: _defaultCreatedAt,
    },
  };
}

/**
 * Helper function to handle CORS preflight requests
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

/**
 * Create an authenticated Supabase client using webhook API key
 * Used for webhook endpoints that need to perform database operations
 */
export async function createAuthenticatedSupabaseClient(apiKey: string): Promise<SupabaseClient> {
  const { createClient } = await import('@supabase/supabase-js@2');
  const supabaseUrl = Deno.env.get('REMOTE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '';
  return createClient(supabaseUrl, apiKey);
}
