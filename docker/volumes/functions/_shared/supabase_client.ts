import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

function readEnv(name: string): string | undefined {
  try {
    const value = Deno.env.get(name);
    if (value === undefined) {
      return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  } catch (_error) {
    return undefined;
  }
}

const SHARED_CLIENT_OPTIONS = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};

const SUPABASE_URL_ENV_NAMES = ['REMOTE_SUPABASE_URL', 'SUPABASE_URL'];
const SUPABASE_SERVICE_KEY_ENV_NAMES = [
  'REMOTE_SUPABASE_SERVICE_ROLE_KEY',
  'REMOTE_SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
];
const SUPABASE_PUBLISHABLE_KEY_ENV_NAMES = [
  'REMOTE_SUPABASE_PUBLISHABLE_KEY',
  'REMOTE_SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_ANON_KEY',
];

function requireFirstDefinedEnv(candidates: string[], label: string): string {
  for (const name of candidates) {
    const value = readEnv(name);
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing ${label}. Set one of: ${candidates.join(', ')}`);
}

// Avoid silently targeting localhost or placeholder credentials when runtime env is missing.
// Some unit tests import handlers before injecting deps, so delay client construction until first use.
function createDeferredClient(factory: () => SupabaseClient): SupabaseClient {
  let client: SupabaseClient | undefined;

  return new Proxy({} as SupabaseClient, {
    get(_target, property) {
      client ??= factory();
      const value = Reflect.get(client as unknown as object, property);
      return typeof value === 'function' ? value.bind(client) : value;
    },
  });
}

export function getSupabaseUrl(): string {
  return requireFirstDefinedEnv(SUPABASE_URL_ENV_NAMES, 'Supabase URL');
}

export function getSupabaseServiceRoleKey(): string {
  return requireFirstDefinedEnv(
    SUPABASE_SERVICE_KEY_ENV_NAMES,
    'Supabase service-role or secret key',
  );
}

export function getSupabasePublishableKey(): string {
  return requireFirstDefinedEnv(
    SUPABASE_PUBLISHABLE_KEY_ENV_NAMES,
    'Supabase publishable or anon key',
  );
}

export function createSupabaseAuthClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabasePublishableKey(), SHARED_CLIENT_OPTIONS);
}

export function createSupabaseServiceClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), SHARED_CLIENT_OPTIONS);
}

export function createRequestSupabaseClient(accessToken?: string): SupabaseClient {
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    ...SHARED_CLIENT_OPTIONS,
    global: Object.keys(headers).length > 0 ? { headers } : undefined,
  });
}

export const supabaseAuthClient = createDeferredClient(createSupabaseAuthClient);
export const supabaseServiceClient = createDeferredClient(createSupabaseServiceClient);

// Backward-compatible aliases for existing service-role call sites.
export const getServiceRoleKey = getSupabaseServiceRoleKey;
export const getPublishableKey = getSupabasePublishableKey;
export const createServiceRoleClient = createSupabaseServiceClient;
export const supabaseClient = supabaseServiceClient;
