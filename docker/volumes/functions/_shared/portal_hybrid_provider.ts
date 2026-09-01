import type { PortalHybridKernelProviderConfig } from './portal_hybrid_kernel.ts';

type PortalHybridProviderEnvironment = Pick<typeof Deno.env, 'get'>;

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/u;
const ENDPOINT_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/u;
const ACCESS_KEY_PATTERN = /^[A-Za-z0-9]{16,128}$/u;
const SECRET_PATTERN = /^[!-~]{20,256}$/u;
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9+/=_-]{16,4096}$/u;

export class PortalHybridProviderError extends Error {
  constructor() {
    super('portal_hybrid_provider_config_invalid');
    this.name = 'PortalHybridProviderError';
  }
}

function readExactValue(
  env: PortalHybridProviderEnvironment,
  name: string,
  required: boolean,
): string | undefined {
  let value: string | undefined;
  try {
    value = env.get(name);
  } catch (_error) {
    throw new PortalHybridProviderError();
  }
  if (value === undefined || value.length === 0) {
    if (required) throw new PortalHybridProviderError();
    return undefined;
  }
  if (value !== value.trim() || CONTROL_CHARACTERS.test(value)) {
    throw new PortalHybridProviderError();
  }
  return value;
}

function validateOpenAiBaseUrl(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch (_error) {
    throw new PortalHybridProviderError();
  }
  const loopback =
    (parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '[::1]') &&
    (parsed.protocol === 'http:' || parsed.protocol === 'https:');
  if (
    (parsed.protocol !== 'https:' && !loopback) ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    throw new PortalHybridProviderError();
  }
  return value;
}

export function readPortalHybridProviderConfig(
  env: PortalHybridProviderEnvironment = Deno.env,
): Readonly<PortalHybridKernelProviderConfig> {
  const apiKey = readExactValue(env, 'PORTAL_OPENAI_API_KEY', true)!;
  const model = readExactValue(env, 'PORTAL_OPENAI_CHAT_MODEL', true)!;
  const baseUrl = validateOpenAiBaseUrl(readExactValue(env, 'PORTAL_OPENAI_BASE_URL', false));
  const endpointName = readExactValue(env, 'PORTAL_SAGEMAKER_ENDPOINT_NAME', true)!;
  const accessKeyId = readExactValue(env, 'PORTAL_AWS_ACCESS_KEY_ID', true)!;
  const secretAccessKey = readExactValue(env, 'PORTAL_AWS_SECRET_ACCESS_KEY', true)!;
  const sessionToken = readExactValue(env, 'PORTAL_AWS_SESSION_TOKEN', false);

  if (
    apiKey.length < 8 ||
    apiKey.length > 4096 ||
    !/^[!-~]+$/u.test(apiKey) ||
    apiKey.startsWith('sb_secret_') ||
    apiKey.split('.').length === 3 ||
    !MODEL_PATTERN.test(model) ||
    endpointName.length > 63 ||
    !ENDPOINT_PATTERN.test(endpointName) ||
    !ACCESS_KEY_PATTERN.test(accessKeyId) ||
    !SECRET_PATTERN.test(secretAccessKey) ||
    (sessionToken !== undefined && !SESSION_TOKEN_PATTERN.test(sessionToken))
  ) {
    throw new PortalHybridProviderError();
  }

  return Object.freeze({
    openAi: Object.freeze({ apiKey, model, baseUrl }),
    sageMaker: Object.freeze({
      endpointName,
      region: 'us-east-1',
      accessKeyId,
      secretAccessKey,
      sessionToken,
    }),
  });
}
