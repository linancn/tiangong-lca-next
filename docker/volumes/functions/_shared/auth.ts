import type {
  SupabaseClient,
  User,
  UserAppMetadata,
  UserMetadata,
} from 'jsr:@supabase/supabase-js@2.112.4';
import { corsHeaders } from './cors.ts';
import { getSupabaseUrl } from './supabase_client.ts';

const _defaultAppMetadata: UserAppMetadata = {
  provider: '',
};

const _defaultUserMetadata: UserMetadata = {
  provider: '',
};

const _defaultAud = '';
const _defaultCreatedAt = '';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUTHENTICATED_AUDIENCE = 'authenticated';
const SUPABASE_AUTH_PATH = '/auth/v1';
const CLOCK_SKEW_SECONDS = 60;

function readOptionalEnv(name: string): string | undefined {
  const value = Deno.env.get(name);
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function readPublishableApiKey(): string | undefined {
  return (
    readOptionalEnv('REMOTE_SUPABASE_PUBLISHABLE_KEY') ??
    readOptionalEnv('REMOTE_SUPABASE_ANON_KEY') ??
    readOptionalEnv('SUPABASE_PUBLISHABLE_KEY') ??
    readOptionalEnv('SUPABASE_ANON_KEY')
  );
}

export function isSupabasePublishableApiKey(
  apiKey: string,
  publishableApiKey: string | undefined = readPublishableApiKey(),
): boolean {
  if (!apiKey) {
    return false;
  }

  if (publishableApiKey && apiKey === publishableApiKey) {
    return true;
  }

  return apiKey.startsWith('sb_publishable_');
}

function extractBearerToken(authHeader: string | null): string | undefined {
  if (!authHeader) {
    return undefined;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return token.length > 0 ? token : undefined;
}

function createAuthResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const message = Reflect.get(error, 'message');
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}

function getErrorStatus(error: unknown, fallback: number): number {
  if (typeof error === 'object' && error !== null) {
    const status = Reflect.get(error, 'status');
    if (typeof status === 'number' && Number.isFinite(status)) {
      return status;
    }
  }

  return fallback;
}

function getClaimsFailureStatus(error: unknown): number {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Reflect.get(error, 'status');
    if (status === 400 || status === 401 || status === 403) return 401;
    if (status === 429) return 429;
    if (typeof status === 'number' && Number.isInteger(status) && status >= 500 && status <= 599) {
      return status;
    }
  }
  return 503;
}

export interface AuthedUser extends User {
  role?: string;
}

/**
 * Authentication result interface
 */
export interface AuthResult {
  isAuthenticated: boolean;
  principal?: AuthPrincipal;
  /** @deprecated Use the minimal principal for authorization. Retained for compatibility callers. */
  user?: User | AuthedUser;
  response?: Response;
}

export type JwtAssurance = 'claims' | 'fresh_user';

export type AuthPrincipalMethod = 'supabase_jwt' | 'service_api_key';

export interface AuthPrincipal {
  userId: string;
  email?: string;
  authMethod: AuthPrincipalMethod;
  assurance: JwtAssurance | 'service_api_key';
  clientId?: string;
  sessionId?: string;
  claims?: Readonly<Record<string, unknown>>;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** Supabase auth client instance used for JWT validation */
  authClient?: SupabaseClient;
  /** Whether to require authentication (default: true) */
  requireAuth?: boolean;
  /** Allowed authentication methods */
  allowedMethods?: AuthMethod[];
  /** Optional override for Service API key (defaults to env vars) */
  serviceApiKey?: string;
  /** JWT assurance. Claims/JWKS is the default; online user lookup must be explicit. */
  jwtAssurance?: JwtAssurance;
}

/**
 * Supported authentication methods
 */
export enum AuthMethod {
  /** Supabase JWT token via Authorization header, used in TianGong LCA Web App. */
  JWT = 'jwt',
  /** Service API key via apiKey header, used in database webhooks, backend services, etc. */
  SERVICE_API_KEY = 'service_api_key',
}

/**
 * Unified authentication middleware for Supabase Edge Functions
 *
 * This middleware provides a centralized authentication solution supporting reviewed auth methods:
 *
 * 1. **Supabase JWT**: Standard Supabase authentication via Authorization header
 * 2. **Service API Key**: Special API key for backend services via apiKey header
 *
 * @example
 * ```typescript
 * // Basic usage with Supabase JWT
 * const authResult = await authenticateRequest(req, {
 *   authClient: supabaseAuthClient,
 *   allowedMethods: [AuthMethod.JWT]
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
    authClient,
    requireAuth = true,
    allowedMethods = [AuthMethod.JWT, AuthMethod.SERVICE_API_KEY],
    serviceApiKey,
    jwtAssurance = 'claims',
  } = config;

  const resolvedServiceApiKey =
    serviceApiKey ??
    readOptionalEnv('REMOTE_SERVICE_API_KEY') ??
    readOptionalEnv('SERVICE_API_KEY');
  const resolvedPublishableApiKey = readPublishableApiKey();

  // If authentication is not required, return success
  if (!requireAuth) {
    console.log('Authentication is not required');
    return { isAuthenticated: true };
  }

  const authHeader = req.headers.get('Authorization');
  const bearerToken = extractBearerToken(authHeader);
  const apiKey = req.headers.get('apikey');

  // Collect all possible authentication results
  const authResults: Array<{ method: AuthMethod; result: AuthResult | Promise<AuthResult> }> = [];

  // Check Service API key
  if (
    allowedMethods.includes(AuthMethod.SERVICE_API_KEY) &&
    apiKey &&
    !isSupabasePublishableApiKey(apiKey, resolvedPublishableApiKey)
  ) {
    console.log('Checking Service API key authentication');
    const result = authenticateServiceApiKey(apiKey, resolvedServiceApiKey);
    authResults.push({ method: AuthMethod.SERVICE_API_KEY, result });
  }

  // Check Supabase JWT
  if (allowedMethods.includes(AuthMethod.JWT) && bearerToken) {
    if (!authClient) {
      authResults.push({
        method: AuthMethod.JWT,
        result: authClientNotConfiguredResult(),
      });
    } else {
      console.log('Checking Supabase JWT authentication');
      const result = authenticateSupabaseJWT(bearerToken, authClient, jwtAssurance);
      authResults.push({ method: AuthMethod.JWT, result });
    }
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
  return await finalizeAuthResults(authResults);
}

async function finalizeAuthResults(
  authResults: Array<{ method: AuthMethod; result: AuthResult | Promise<AuthResult> }>,
): Promise<AuthResult> {
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
    if (result.principal) {
      console.log(
        JSON.stringify({
          event: 'edge.auth.success',
          authMethod: result.principal.authMethod,
          assurance: result.principal.assurance,
          clientIdPresent: Boolean(result.principal.clientId),
        }),
      );
    }
    return result;
  }

  // If all methods fail, return the first failed result
  console.log('All authentication methods failed');
  return failedAuths[0].result;
}

function authClientNotConfiguredResult(): AuthResult {
  return {
    isAuthenticated: false,
    response: createAuthResponse('Auth client not configured', 500),
  };
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
  assurance: JwtAssurance,
): Promise<AuthResult> {
  try {
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError) {
      console.error('Supabase JWT claims verification failed:', claimsError);
      return {
        isAuthenticated: false,
        response: createAuthResponse(
          getErrorMessage(claimsError, 'JWT authentication failed'),
          getClaimsFailureStatus(claimsError),
        ),
      };
    }

    const claims = claimsData?.claims as Record<string, unknown> | undefined;
    const claimsResult = validateSupabaseClaims(claims);
    if (!claimsResult.ok) {
      return {
        isAuthenticated: false,
        response: createAuthResponse(claimsResult.message, claimsResult.status),
      };
    }

    if (assurance === 'claims') {
      return {
        isAuthenticated: true,
        principal: claimsResult.principal,
        user: claimsResult.user,
      };
    }

    const { data: authData, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('Supabase JWT authentication failed:', error);
      return {
        isAuthenticated: false,
        response: createAuthResponse(
          getErrorMessage(error, 'JWT authentication failed'),
          getErrorStatus(error, 401),
        ),
      };
    }

    if (!authData?.user) {
      return {
        isAuthenticated: false,
        response: createAuthResponse('User Not Found', 401),
      };
    }

    if (authData.user.role !== 'authenticated') {
      return {
        isAuthenticated: false,
        response: createAuthResponse('Forbidden', 403),
      };
    }

    if (authData.user.id !== claimsResult.principal.userId) {
      return {
        isAuthenticated: false,
        response: createAuthResponse('JWT subject mismatch', 401),
      };
    }

    return {
      isAuthenticated: true,
      principal: {
        ...claimsResult.principal,
        email: authData.user.email ?? claimsResult.principal.email,
        assurance: 'fresh_user',
      },
      user: authData.user,
    };
  } catch (error) {
    console.error('Supabase JWT authentication threw:', error);
    return {
      isAuthenticated: false,
      response: createAuthResponse(getErrorMessage(error, 'JWT authentication failed'), 500),
    };
  }
}

type ClaimsValidationResult =
  | { ok: true; principal: AuthPrincipal; user: AuthedUser }
  | { ok: false; message: string; status: number };

function validateSupabaseClaims(
  claims: Record<string, unknown> | undefined,
): ClaimsValidationResult {
  if (!claims) {
    return { ok: false, message: 'JWT claims missing', status: 401 };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const issuer = claims.iss;
  const audience = claims.aud;
  const expiresAt = claims.exp;
  const issuedAt = claims.iat;
  const userId = claims.sub;
  const role = claims.role;
  const sessionId = claims.session_id;
  const clientId = claims.client_id;
  const email = claims.email;

  if (typeof issuer !== 'string' || !isExpectedSupabaseIssuer(issuer)) {
    return { ok: false, message: 'Invalid JWT issuer', status: 401 };
  }

  const audienceValues = typeof audience === 'string' ? [audience] : audience;
  if (
    !Array.isArray(audienceValues) ||
    !audienceValues.every((value) => typeof value === 'string') ||
    !audienceValues.includes(AUTHENTICATED_AUDIENCE)
  ) {
    return { ok: false, message: 'Invalid JWT audience', status: 401 };
  }

  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt) || expiresAt <= nowSeconds) {
    return { ok: false, message: 'JWT expired', status: 401 };
  }

  if (
    typeof issuedAt !== 'number' ||
    !Number.isFinite(issuedAt) ||
    issuedAt > nowSeconds + CLOCK_SKEW_SECONDS
  ) {
    return { ok: false, message: 'Invalid JWT issued-at time', status: 401 };
  }

  if (typeof userId !== 'string' || !UUID_PATTERN.test(userId)) {
    return { ok: false, message: 'Invalid JWT subject', status: 401 };
  }

  if (role !== AUTHENTICATED_AUDIENCE) {
    return { ok: false, message: 'Forbidden', status: 403 };
  }

  if (typeof sessionId !== 'string' || !UUID_PATTERN.test(sessionId)) {
    return { ok: false, message: 'Invalid JWT session', status: 401 };
  }

  if (
    clientId !== undefined &&
    (typeof clientId !== 'string' || clientId.length === 0 || clientId.length > 255)
  ) {
    return { ok: false, message: 'Invalid OAuth client identity', status: 401 };
  }

  if (email !== undefined && typeof email !== 'string') {
    return { ok: false, message: 'Invalid JWT email', status: 401 };
  }

  const principal: AuthPrincipal = {
    userId,
    email: typeof email === 'string' && email.length > 0 ? email : undefined,
    authMethod: 'supabase_jwt',
    assurance: 'claims',
    clientId: typeof clientId === 'string' ? clientId : undefined,
    sessionId,
    claims,
  };

  return {
    ok: true,
    principal,
    user: {
      id: userId,
      email: principal.email,
      role: AUTHENTICATED_AUDIENCE,
      app_metadata: _defaultAppMetadata,
      user_metadata: _defaultUserMetadata,
      aud: AUTHENTICATED_AUDIENCE,
      created_at: _defaultCreatedAt,
    },
  };
}

function isExpectedSupabaseIssuer(issuer: string): boolean {
  const configuredUrl = readOptionalEnv('REMOTE_SUPABASE_URL') ?? readOptionalEnv('SUPABASE_URL');
  if (!configuredUrl) {
    return false;
  }

  try {
    const configured = new URL(configuredUrl);
    const actual = new URL(issuer);
    if (actual.pathname.replace(/\/+$/u, '') !== SUPABASE_AUTH_PATH) {
      return false;
    }

    const configuredIssuer = `${configured.origin}${SUPABASE_AUTH_PATH}`;
    if (actual.toString().replace(/\/+$/u, '') === configuredIssuer) {
      return true;
    }

    const localHosts = new Set(['127.0.0.1', 'localhost', 'kong']);
    return localHosts.has(configured.hostname) && localHosts.has(actual.hostname);
  } catch (_error) {
    return false;
  }
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
    principal: {
      userId: 'service',
      authMethod: 'service_api_key',
      assurance: 'service_api_key',
    },
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
  const { createClient } = await import('jsr:@supabase/supabase-js@2.112.4');
  const supabaseUrl = getSupabaseUrl();
  return createClient(supabaseUrl, apiKey, { db: { schema: 'api' } }) as unknown as SupabaseClient;
}
