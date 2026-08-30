import { LOGIN_PATH, OAUTH_CONSENT_PATH } from '@/services/general/publicRoutePolicy';
import { supabase } from '@/services/supabase';
import type {
  AuthError,
  OAuthAuthorizationDetails,
  OAuthGrant,
  OAuthRedirect,
} from '@supabase/supabase-js';

export { OAUTH_CONSENT_PATH };

const AUTHORIZATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export type OAuthAuthorizationResult = OAuthAuthorizationDetails | OAuthRedirect;

export type OAuthServiceResponse<T> = {
  data: T | null;
  error: AuthError | null;
};

export function parseOAuthAuthorizationId(search: string): string | null {
  const params = new URLSearchParams(search);
  const values = params.getAll('authorization_id');
  if (values.length !== 1 || !AUTHORIZATION_ID_PATTERN.test(values[0])) {
    return null;
  }
  return values[0].toLowerCase();
}

export function buildOAuthLoginPath(authorizationId: string): string {
  if (!AUTHORIZATION_ID_PATTERN.test(authorizationId)) {
    throw new Error('Invalid OAuth authorization request');
  }
  const returnPath = `${OAUTH_CONSENT_PATH}?authorization_id=${encodeURIComponent(
    authorizationId.toLowerCase(),
  )}`;
  return `${LOGIN_PATH}?redirect=${encodeURIComponent(returnPath)}`;
}

export function isSafeOAuthCallbackUrl(value: string): boolean {
  if (!value || value.length > 4096) {
    return false;
  }
  try {
    const callback = new URL(value);
    if (callback.username || callback.password) {
      return false;
    }
    if (callback.protocol === 'https:') {
      return true;
    }
    return callback.protocol === 'http:' && LOOPBACK_HOSTS.has(callback.hostname);
  } catch {
    return false;
  }
}

export function redirectToOAuthCallback(value: string): boolean {
  if (!isSafeOAuthCallbackUrl(value)) {
    return false;
  }
  window.location.assign(value);
  return true;
}

export async function getVerifiedOAuthSubject(): Promise<string | null> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || typeof data?.claims?.sub !== 'string' || !data.claims.sub) {
    return null;
  }
  return data.claims.sub;
}

export async function getOAuthAuthorizationDetails(
  authorizationId: string,
): Promise<OAuthServiceResponse<OAuthAuthorizationResult>> {
  return supabase.auth.oauth.getAuthorizationDetails(authorizationId);
}

export async function decideOAuthAuthorization(
  authorizationId: string,
  decision: 'approve' | 'deny',
): Promise<OAuthServiceResponse<OAuthRedirect>> {
  const options = { skipBrowserRedirect: true };
  return decision === 'approve'
    ? supabase.auth.oauth.approveAuthorization(authorizationId, options)
    : supabase.auth.oauth.denyAuthorization(authorizationId, options);
}

export async function listOAuthGrants(): Promise<OAuthServiceResponse<OAuthGrant[]>> {
  return supabase.auth.oauth.listGrants();
}

export async function revokeOAuthGrant(
  clientId: string,
): Promise<OAuthServiceResponse<Record<string, never>>> {
  return supabase.auth.oauth.revokeGrant({ clientId });
}
