import { constantTimeEqual, decodeCanonicalBase64Url } from './portal_hmac.ts';

const DEFAULT_MAX_REQUEST_BYTES = 32 * 1024;
const PORTAL_PUBLISHABLE_KEY_ENV = 'PORTAL_SUPABASE_PUBLISHABLE_KEY';
const SUPABASE_PROJECT_PUBLISHABLE_KEYS_ENV = 'SUPABASE_PUBLISHABLE_KEYS';

export class PortalPublishedLciaUpstreamError extends Error {
  constructor() {
    super('published_lcia_upstream_unavailable');
    this.name = 'PortalPublishedLciaUpstreamError';
  }
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function validatePortalSupabaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch (_error) {
    throw new PortalPublishedLciaUpstreamError();
  }
  const secureRemote = url.protocol === 'https:';
  const loopback =
    isLoopbackHostname(url.hostname) && (url.protocol === 'http:' || url.protocol === 'https:');
  const pinnedCliInternal =
    url.protocol === 'http:' && url.hostname === 'kong' && url.port === '8000';
  if (
    (!secureRemote && !loopback && !pinnedCliInternal) ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== '' ||
    (url.pathname !== '' && url.pathname !== '/')
  ) {
    throw new PortalPublishedLciaUpstreamError();
  }
  return url.origin;
}

function decodeJwtPayload(value: string): Record<string, unknown> | null {
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const decodedParts = parts.map(decodeCanonicalBase64Url);
  if (decodedParts.some((part) => part === null)) return null;
  try {
    const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decodedParts[1]!));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch (_error) {
    return null;
  }
}

export function validatePortalPublishableCredential(value: string): string {
  const credential = value.trim();
  if (
    credential.length < 1 ||
    credential.length > 4096 ||
    /[\r\n]/u.test(value) ||
    /^sb_secret_/iu.test(credential)
  ) {
    throw new PortalPublishedLciaUpstreamError();
  }
  if (credential.startsWith('sb_publishable_')) return credential;
  if (credential.split('.').length === 3) {
    const payload = decodeJwtPayload(credential);
    if (!payload || payload.role !== 'anon') {
      throw new PortalPublishedLciaUpstreamError();
    }
    return credential;
  }
  throw new PortalPublishedLciaUpstreamError();
}

export type PortalTransportErrorCode =
  | 'portal_transport_config_invalid'
  | 'portal_apikey_missing'
  | 'portal_apikey_invalid'
  | 'portal_apikey_mismatch'
  | 'portal_cookie_invalid'
  | 'portal_authorization_invalid';

export class PortalTransportError extends Error {
  constructor(readonly code: PortalTransportErrorCode) {
    super(code);
    this.name = 'PortalTransportError';
  }
}

function validatePortalLegacyAnonCredential(value: string): string {
  const credential = value.trim();
  if (credential.startsWith('sb_publishable_')) {
    throw new PortalPublishedLciaUpstreamError();
  }
  return validatePortalPublishableCredential(value);
}

function constantTimeStringEqual(left: string, right: string): boolean {
  return constantTimeEqual(new TextEncoder().encode(left), new TextEncoder().encode(right));
}

type PortalTransportEnvironment = Pick<typeof Deno.env, 'get'>;

function readExactEnvironmentValue(env: PortalTransportEnvironment, name: string): string {
  let value: string | undefined;
  try {
    value = env.get(name);
  } catch (_error) {
    throw new PortalTransportError('portal_transport_config_invalid');
  }
  if (
    value === undefined ||
    value.length === 0 ||
    value !== value.trim() ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(value)
  ) {
    throw new PortalTransportError('portal_transport_config_invalid');
  }
  return value;
}

function readCurrentProjectPublishableKeys(env: PortalTransportEnvironment): string[] {
  const raw = readExactEnvironmentValue(env, SUPABASE_PROJECT_PUBLISHABLE_KEYS_ENV);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (_error) {
    throw new PortalTransportError('portal_transport_config_invalid');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new PortalTransportError('portal_transport_config_invalid');
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (
    entries.length === 0 ||
    entries.some(
      ([name, value]) =>
        name.length === 0 ||
        typeof value !== 'string' ||
        value.length === 0 ||
        value !== value.trim(),
    )
  ) {
    throw new PortalTransportError('portal_transport_config_invalid');
  }
  return entries.map(([, value]) => value as string);
}

/**
 * Resolve the dedicated Portal key and prove it belongs to the current Supabase project.
 * `SUPABASE_PUBLISHABLE_KEYS` is the platform-owned project key registry, never a fallback key.
 */
export function readPortalPublishableCredential(
  env: PortalTransportEnvironment = Deno.env,
): string {
  const configured = readExactEnvironmentValue(env, PORTAL_PUBLISHABLE_KEY_ENV);
  let publishableKey: string;
  try {
    publishableKey = validatePortalPublishableCredential(configured);
  } catch (_error) {
    throw new PortalTransportError('portal_transport_config_invalid');
  }
  if (!publishableKey.startsWith('sb_publishable_') || publishableKey.length < 20) {
    throw new PortalTransportError('portal_transport_config_invalid');
  }

  const belongsToCurrentProject = readCurrentProjectPublishableKeys(env).reduce(
    (matched, candidate) => constantTimeStringEqual(publishableKey, candidate) || matched,
    false,
  );
  if (!belongsToCurrentProject) {
    throw new PortalTransportError('portal_transport_config_invalid');
  }
  return publishableKey;
}

export function readPortalSupabaseUrl(env: PortalTransportEnvironment = Deno.env): string {
  try {
    return validatePortalSupabaseUrl(readExactEnvironmentValue(env, 'SUPABASE_URL'));
  } catch (_error) {
    throw new PortalTransportError('portal_transport_config_invalid');
  }
}

export function readPortalLegacyAnonCredential(
  env: Pick<typeof Deno.env, 'get'> = Deno.env,
): string | null {
  if (readPortalSupabaseUrl(env) !== 'http://kong:8000') return null;
  const configured = env.get('SUPABASE_ANON_KEY')?.trim();
  if (!configured) return null;
  try {
    return validatePortalLegacyAnonCredential(configured);
  } catch (_error) {
    throw new PortalTransportError('portal_transport_config_invalid');
  }
}

export function validatePortalInboundTransport(input: {
  request: Request;
  trustedPublishableKey: string;
  trustedLegacyAnonKey?: string | null;
}): void {
  let trustedPublishableKey: string;
  try {
    trustedPublishableKey = validatePortalPublishableCredential(input.trustedPublishableKey);
  } catch (_error) {
    throw new PortalTransportError('portal_transport_config_invalid');
  }

  const inboundApiKey = input.request.headers.get('apikey');
  if (inboundApiKey === null || inboundApiKey.length === 0) {
    throw new PortalTransportError('portal_apikey_missing');
  }
  let validatedInboundApiKey: string;
  try {
    validatedInboundApiKey = validatePortalPublishableCredential(inboundApiKey);
  } catch (_error) {
    throw new PortalTransportError('portal_apikey_invalid');
  }
  if (!constantTimeStringEqual(validatedInboundApiKey, trustedPublishableKey)) {
    throw new PortalTransportError('portal_apikey_mismatch');
  }

  if (input.request.headers.has('cookie')) {
    throw new PortalTransportError('portal_cookie_invalid');
  }

  const authorization = input.request.headers.get('authorization');
  if (authorization === null) return;
  if (!input.trustedLegacyAnonKey) {
    throw new PortalTransportError('portal_authorization_invalid');
  }
  let trustedLegacyAnonKey: string;
  try {
    trustedLegacyAnonKey = validatePortalLegacyAnonCredential(input.trustedLegacyAnonKey);
  } catch (_error) {
    throw new PortalTransportError('portal_transport_config_invalid');
  }
  if (!constantTimeStringEqual(authorization, `Bearer ${trustedLegacyAnonKey}`)) {
    throw new PortalTransportError('portal_authorization_invalid');
  }
}

export async function readPortalBoundedStream(
  stream: ReadableStream<Uint8Array> | null,
  maximumBytes: number,
): Promise<Uint8Array> {
  if (!stream) return new Uint8Array();
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw new RangeError('body_too_large');
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

export async function readPortalRawBody(
  request: Request,
  maximumBytes = DEFAULT_MAX_REQUEST_BYTES,
): Promise<Uint8Array> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && /^\d+$/u.test(contentLength) && Number(contentLength) > maximumBytes) {
    throw new RangeError('body_too_large');
  }
  return await readPortalBoundedStream(request.body, maximumBytes);
}
