const PORTAL_HMAC_VERSION = 'portal-hmac-v1';
const PORTAL_HMAC_CLOCK_WINDOW_SECONDS = 60;
const PORTAL_NONCE_BYTES = 16;
const SHA256_BYTES = 32;
const KEY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const DECIMAL_SECONDS_PATTERN = /^(?:0|[1-9]\d{0,10})$/;

export type PortalHmacKey = {
  keyId: string;
  secret: Uint8Array;
};

export type PortalHmacKeyring = {
  current: PortalHmacKey;
  previous?: PortalHmacKey;
};

export type PortalHmacVerification = {
  keyId: string;
  nonce: string;
  timestamp: number;
  bodyHash: string;
  matchedKey: 'current' | 'previous';
};

export type PortalHmacErrorCode =
  | 'portal_hmac_config_invalid'
  | 'portal_hmac_method_invalid'
  | 'portal_hmac_path_invalid'
  | 'portal_hmac_headers_missing'
  | 'portal_hmac_headers_invalid'
  | 'portal_hmac_timestamp_expired'
  | 'portal_hmac_body_hash_mismatch'
  | 'portal_hmac_key_unknown'
  | 'portal_hmac_signature_invalid';

export class PortalHmacError extends Error {
  constructor(readonly code: PortalHmacErrorCode) {
    super(code);
    this.name = 'PortalHmacError';
  }
}

export type PortalHmacEnvironment = Pick<typeof Deno.env, 'get'>;

function readRequiredEnvironmentValue(env: PortalHmacEnvironment, name: string): string {
  const value = env.get(name)?.trim();
  if (!value) throw new PortalHmacError('portal_hmac_config_invalid');
  return value;
}

export function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

export function decodeCanonicalBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value) || value.length % 4 === 1) return null;
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  try {
    const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + padding);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return encodeBase64Url(bytes) === value ? bytes : null;
  } catch (_error) {
    return null;
  }
}

function decodeSecret(value: string): Uint8Array {
  const secret = decodeCanonicalBase64Url(value);
  if (!secret || secret.length < SHA256_BYTES) {
    throw new PortalHmacError('portal_hmac_config_invalid');
  }
  return secret;
}

function readConfiguredKey(
  env: PortalHmacEnvironment,
  keyIdName: string,
  secretName: string,
): PortalHmacKey {
  const keyId = readRequiredEnvironmentValue(env, keyIdName);
  if (!KEY_ID_PATTERN.test(keyId)) {
    throw new PortalHmacError('portal_hmac_config_invalid');
  }
  return {
    keyId,
    secret: decodeSecret(readRequiredEnvironmentValue(env, secretName)),
  };
}

export function loadPortalHmacKeyring(env: PortalHmacEnvironment = Deno.env): PortalHmacKeyring {
  const current = readConfiguredKey(
    env,
    'PORTAL_HMAC_KEY_ID_CURRENT',
    'PORTAL_HMAC_SECRET_CURRENT',
  );
  const previousKeyId = env.get('PORTAL_HMAC_KEY_ID_PREVIOUS')?.trim();
  const previousSecret = env.get('PORTAL_HMAC_SECRET_PREVIOUS')?.trim();
  if (Boolean(previousKeyId) !== Boolean(previousSecret)) {
    throw new PortalHmacError('portal_hmac_config_invalid');
  }
  if (!previousKeyId || !previousSecret) return { current };

  const previous = readConfiguredKey(
    env,
    'PORTAL_HMAC_KEY_ID_PREVIOUS',
    'PORTAL_HMAC_SECRET_PREVIOUS',
  );
  if (previous.keyId === current.keyId) {
    throw new PortalHmacError('portal_hmac_config_invalid');
  }
  return { current, previous };
}

export function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

export async function computePortalBodyHash(rawBody: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(rawBody.byteLength);
  copy.set(rawBody);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', copy.buffer));
}

export function buildPortalHmacCanonical(input: {
  keyId: string;
  timestamp: string;
  nonce: string;
  method: string;
  functionPath: string;
  bodyHash: string;
}): string {
  return [
    PORTAL_HMAC_VERSION,
    input.keyId,
    input.timestamp,
    input.nonce,
    input.method,
    input.functionPath,
    input.bodyHash,
  ].join('\n');
}

async function computeHmac(secret: Uint8Array, canonical: string): Promise<Uint8Array> {
  const secretCopy = new Uint8Array(secret.byteLength);
  secretCopy.set(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    secretCopy.buffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(canonical)));
}

function requiredHeader(headers: Headers, name: string): string {
  const value = headers.get(name)?.trim();
  if (!value) throw new PortalHmacError('portal_hmac_headers_missing');
  return value;
}

export async function verifyPortalHmacRequest(input: {
  request: Request;
  rawBody: Uint8Array;
  expectedFunctionPath: string;
  allowedRequestPaths?: readonly string[];
  keyring: PortalHmacKeyring;
  nowSeconds?: number;
}): Promise<PortalHmacVerification> {
  if (input.request.method !== 'POST') {
    throw new PortalHmacError('portal_hmac_method_invalid');
  }
  const allowedRequestPaths = input.allowedRequestPaths ?? [input.expectedFunctionPath];
  if (!allowedRequestPaths.includes(new URL(input.request.url).pathname)) {
    throw new PortalHmacError('portal_hmac_path_invalid');
  }

  const keyId = requiredHeader(input.request.headers, 'x-portal-key-id');
  const timestampText = requiredHeader(input.request.headers, 'x-portal-timestamp');
  const nonce = requiredHeader(input.request.headers, 'x-portal-nonce');
  const bodyHashText = requiredHeader(input.request.headers, 'x-portal-body-sha256');
  const signatureText = requiredHeader(input.request.headers, 'x-portal-signature');

  if (!KEY_ID_PATTERN.test(keyId) || !DECIMAL_SECONDS_PATTERN.test(timestampText)) {
    throw new PortalHmacError('portal_hmac_headers_invalid');
  }
  const nonceBytes = decodeCanonicalBase64Url(nonce);
  const bodyHashHeader = decodeCanonicalBase64Url(bodyHashText);
  const signature = decodeCanonicalBase64Url(signatureText);
  if (
    !nonceBytes ||
    nonceBytes.length !== PORTAL_NONCE_BYTES ||
    !bodyHashHeader ||
    bodyHashHeader.length !== SHA256_BYTES ||
    !signature ||
    signature.length !== SHA256_BYTES
  ) {
    throw new PortalHmacError('portal_hmac_headers_invalid');
  }

  const timestamp = Number(timestampText);
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(timestamp) ||
    Math.abs(nowSeconds - timestamp) > PORTAL_HMAC_CLOCK_WINDOW_SECONDS
  ) {
    throw new PortalHmacError('portal_hmac_timestamp_expired');
  }

  const actualBodyHash = await computePortalBodyHash(input.rawBody);
  if (!constantTimeEqual(bodyHashHeader, actualBodyHash)) {
    throw new PortalHmacError('portal_hmac_body_hash_mismatch');
  }

  const matchedKey =
    keyId === input.keyring.current.keyId
      ? ('current' as const)
      : keyId === input.keyring.previous?.keyId
        ? ('previous' as const)
        : null;
  const secret =
    matchedKey === 'current'
      ? input.keyring.current.secret
      : matchedKey === 'previous'
        ? input.keyring.previous!.secret
        : new Uint8Array(SHA256_BYTES);
  const canonical = buildPortalHmacCanonical({
    keyId,
    timestamp: timestampText,
    nonce,
    method: 'POST',
    functionPath: input.expectedFunctionPath,
    bodyHash: bodyHashText,
  });
  const expectedSignature = await computeHmac(secret, canonical);
  if (!matchedKey) throw new PortalHmacError('portal_hmac_key_unknown');
  if (!constantTimeEqual(signature, expectedSignature)) {
    throw new PortalHmacError('portal_hmac_signature_invalid');
  }

  return {
    keyId,
    nonce,
    timestamp,
    bodyHash: bodyHashText,
    matchedKey,
  };
}

export { PORTAL_HMAC_CLOCK_WINDOW_SECONDS, PORTAL_HMAC_VERSION, PORTAL_NONCE_BYTES };
