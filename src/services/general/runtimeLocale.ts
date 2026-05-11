import * as umiRuntime from 'umi';

const RUNTIME_LOCALE_ENV_KEYS = ['LC_ALL', 'LC_MESSAGES', 'LANGUAGE', 'LANG'] as const;

type RuntimeLocaleEnv = Record<string, string | undefined>;

function getDefaultRuntimeEnv(): RuntimeLocaleEnv {
  if (typeof process === 'object' && process?.env) {
    return process.env as RuntimeLocaleEnv;
  }

  return {};
}

export function normalizeRuntimeLocale(value?: string | null) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  const normalizedValue = trimmedValue.replace(/\.UTF-?8/iu, '').replace(/_/gu, '-');
  const lowerCasedValue = normalizedValue.toLowerCase();

  if (lowerCasedValue === 'zh' || lowerCasedValue.startsWith('zh-')) {
    return 'zh-CN';
  }

  if (lowerCasedValue === 'en' || lowerCasedValue.startsWith('en-')) {
    return 'en-US';
  }

  return normalizedValue;
}

export function getRuntimeLocale(
  umiModule: { getLocale?: unknown } = umiRuntime,
  env: RuntimeLocaleEnv = getDefaultRuntimeEnv(),
) {
  const localeGetter = umiModule.getLocale;

  if (typeof localeGetter === 'function') {
    try {
      const locale = normalizeRuntimeLocale(localeGetter());
      if (locale) {
        return locale;
      }
    } catch {
      // Smoke scripts can load shared services without an initialized Umi runtime.
      // Fall back to environment-based detection instead of crashing in Node.
    }
  }

  for (const envKey of RUNTIME_LOCALE_ENV_KEYS) {
    const locale = normalizeRuntimeLocale(env[envKey]);
    if (locale) {
      return locale;
    }
  }

  return 'en-US';
}
