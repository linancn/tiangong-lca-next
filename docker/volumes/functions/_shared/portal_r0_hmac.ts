import {
  constantTimeEqual,
  decodeCanonicalBase64Url,
  type PortalHmacKey,
  type PortalHmacKeyring,
  PortalHmacError,
} from './portal_hmac.ts';

const KEY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const MINIMUM_SECRET_BYTES = 32;

export type PortalR0Environment = Pick<typeof Deno.env, 'get'>;

function readExactEnvironmentValue(env: PortalR0Environment, name: string): string {
  let value: string | undefined;
  try {
    value = env.get(name);
  } catch (_error) {
    throw new PortalHmacError('portal_hmac_config_invalid');
  }
  if (
    value === undefined ||
    value.length === 0 ||
    value !== value.trim() ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(value)
  ) {
    throw new PortalHmacError('portal_hmac_config_invalid');
  }
  return value;
}

function readConfiguredKey(
  env: PortalR0Environment,
  keyIdName: string,
  secretName: string,
): PortalHmacKey {
  const keyId = readExactEnvironmentValue(env, keyIdName);
  const secret = decodeCanonicalBase64Url(readExactEnvironmentValue(env, secretName));
  if (!KEY_ID_PATTERN.test(keyId) || !secret || secret.length < MINIMUM_SECRET_BYTES) {
    throw new PortalHmacError('portal_hmac_config_invalid');
  }
  return { keyId, secret };
}

export function loadPortalR0HmacKeyring(env: PortalR0Environment = Deno.env): PortalHmacKeyring {
  const current = readConfiguredKey(
    env,
    'PORTAL_R0_HMAC_KEY_ID_CURRENT',
    'PORTAL_R0_HMAC_SECRET_CURRENT',
  );
  const previousKeyId = env.get('PORTAL_R0_HMAC_KEY_ID_PREVIOUS');
  const previousSecret = env.get('PORTAL_R0_HMAC_SECRET_PREVIOUS');
  const previousKeyIdAbsent = previousKeyId === undefined || previousKeyId === '';
  const previousSecretAbsent = previousSecret === undefined || previousSecret === '';
  if (previousKeyIdAbsent !== previousSecretAbsent) {
    throw new PortalHmacError('portal_hmac_config_invalid');
  }
  if (previousKeyIdAbsent && previousSecretAbsent) return { current };

  const previous = readConfiguredKey(
    env,
    'PORTAL_R0_HMAC_KEY_ID_PREVIOUS',
    'PORTAL_R0_HMAC_SECRET_PREVIOUS',
  );
  if (previous.keyId === current.keyId || constantTimeEqual(previous.secret, current.secret)) {
    throw new PortalHmacError('portal_hmac_config_invalid');
  }
  return { current, previous };
}
