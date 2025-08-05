import { SupabaseClient } from '@supabase/supabase-js@2';
import { Redis } from '@upstash/redis';
import { authenticateCognitoToken } from './cognito_auth.ts';
import { corsHeaders } from './cors.ts';
import decodeApiKey from './decode_api_key.ts';

export interface AuthResult {
  isAuthenticated: boolean;
  userId?: string;
  response?: Response;
  email?: string;
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
 * Main authentication function that handles different authentication methods
 * @param req - The incoming request
 * @param supabase - Supabase client instance
 * @param redis - Redis client instance
 * @returns Authentication result with user information
 */
export async function authenticateRequest(
  req: Request,
  supabase: SupabaseClient,
  redis: Redis,
): Promise<AuthResult> {
  const apiKey = req.headers.get('x-api-key') ?? '';

  // Check if x-api-key is provided
  if (!apiKey) {
    // No x-api-key: only validate Supabase token
    return await authenticateSupabaseOnly(req, supabase);
  } else {
    // Has x-api-key: check if it's Cognito token or API key
    return await authenticateWithApiKey(apiKey, supabase, redis);
  }
}

/**
 * Authenticate using only Supabase token when no x-api-key is provided
 * @param req - The incoming request
 * @param supabase - Supabase client instance
 * @returns Authentication result with user information
 */
async function authenticateSupabaseOnly(
  req: Request,
  supabase: SupabaseClient,
): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');

  // If no Authorization header, return error immediately
  if (!authHeader) {
    return {
      isAuthenticated: false,
      response: new Response('Unauthorized Request', {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  const token = authHeader.replace('Bearer ', '');
  return await authenticateSupabaseRequest(token, supabase);
}

/**
 * Authenticate using x-api-key (either Cognito token or API key)
 * @param apiKey - The API key to authenticate (could be Cognito token or API key)
 * @param supabase - Supabase client instance
 * @param redis - Redis client instance
 * @returns Authentication result with user information
 */
async function authenticateWithApiKey(
  apiKey: string,
  supabase: SupabaseClient,
  redis: Redis,
): Promise<AuthResult> {
  const tokenType = getTokenType(apiKey);

  if (tokenType === 'cognito') {
    return await authenticateCognitoToken(apiKey);
  } else {
    // Treat as API key
    return await authenticateApiKeyRequest(apiKey, supabase, redis);
  }
}

/**
 * Authenticate using API Key
 * @param bearerKey - The API key to authenticate
 * @param supabase - Supabase client instance
 * @param redis - Redis client instance
 * @returns Authentication result with user information
 */
async function authenticateApiKeyRequest(
  bearerKey: string,
  supabase: SupabaseClient,
  redis: Redis,
): Promise<AuthResult> {
  const credentials = decodeApiKey(bearerKey);
  if (!credentials) {
    return {
      isAuthenticated: false,
      response: new Response(JSON.stringify({ error: 'Invalid API Key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  const { email = '', password = '' } = credentials;
  const userIdFromRedis = await redis.get('lca_' + email);

  if (!userIdFromRedis) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
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
    } else {
      await redis.setex('lca_' + email, 3600, data.user.id);
      return {
        isAuthenticated: true,
        userId: data.user.id,
        email: data.user.email,
      };
    }
  }

  return {
    isAuthenticated: true,
    userId: String(userIdFromRedis),
    email: email,
  };
}

/**
 * Authenticate using Supabase token
 * @param bearerKey - The Supabase JWT token
 * @param supabase - Supabase client instance
 * @returns Authentication result with user information
 */
async function authenticateSupabaseRequest(
  bearerKey: string,
  supabase: SupabaseClient,
): Promise<AuthResult> {
  const { data: authData } = await supabase.auth.getUser(bearerKey);

  if (authData.user?.role === 'authenticated') {
    return {
      isAuthenticated: true,
      userId: authData.user?.id,
      email: authData.user?.email,
    };
  }

  if (!authData || !authData.user) {
    return {
      isAuthenticated: false,
      response: new Response('User Not Found', {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  } else {
    if (authData.user.role !== 'authenticated') {
      return {
        isAuthenticated: false,
        response: new Response('Forbidden', {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }),
      };
    }
  }

  return {
    isAuthenticated: true,
    userId: authData.user.id,
    email: authData.user.email,
  };
}
