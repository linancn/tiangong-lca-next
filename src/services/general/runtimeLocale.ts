import * as umiRuntime from 'umi';

export const SUPPORTED_APP_LOCALES = ['zh-CN', 'en-US', 'de-DE'] as const;
export type SupportedAppLocale = (typeof SUPPORTED_APP_LOCALES)[number];

export const DEFAULT_BROWSER_APP_LOCALE: SupportedAppLocale = 'zh-CN';
export const DEFAULT_SERVICE_APP_LOCALE: SupportedAppLocale = 'en-US';
export const UMI_LOCALE_STORAGE_KEY = 'umi_locale';

const RUNTIME_LOCALE_ENV_KEYS = ['LC_ALL', 'LC_MESSAGES', 'LANGUAGE', 'LANG'] as const;
const DOCUMENTATION_BASE_URL = 'https://docs.tiangong.earth';

type RuntimeLocaleEnv = Record<string, string | undefined>;

type RuntimeLocaleStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

type RuntimeLocaleNavigator = {
  language?: string;
  languages?: readonly string[];
};

export type BrowserRuntimeLocaleOptions = {
  fallbackLocale?: SupportedAppLocale;
  navigator?: RuntimeLocaleNavigator | null;
  storage?: RuntimeLocaleStorage | null;
};

function getDefaultRuntimeEnv(): RuntimeLocaleEnv {
  if (typeof process === 'object' && process?.env) {
    return process.env as RuntimeLocaleEnv;
  }

  return {};
}

function getDefaultBrowserStorage(): RuntimeLocaleStorage | undefined {
  try {
    return typeof window === 'object' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

function getDefaultBrowserNavigator(): RuntimeLocaleNavigator | undefined {
  return typeof navigator === 'object' ? navigator : undefined;
}

function stripPosixLocaleSuffix(value: string): string {
  return value
    .replace(/\.[A-Za-z0-9-]+(?=@|$)/u, '')
    .replace(/@[A-Za-z0-9_-]+$/u, '')
    .replace(/_/gu, '-');
}

function getCanonicalLocale(value: string): string | undefined {
  if (typeof Intl.getCanonicalLocales !== 'function') {
    return undefined;
  }

  try {
    return Intl.getCanonicalLocales(value)[0];
  } catch {
    return undefined;
  }
}

/**
 * Normalizes only locales supported by the application. Unknown or malformed
 * values stay outside the app-locale boundary instead of leaking into Umi,
 * Intl or service-side formatting calls.
 */
export function normalizeRuntimeLocale(value?: string | null): SupportedAppLocale | undefined {
  const firstLocaleCandidate = value?.trim().split(':')[0]?.trim();
  if (!firstLocaleCandidate) {
    return undefined;
  }

  const canonicalLocale = getCanonicalLocale(stripPosixLocaleSuffix(firstLocaleCandidate));
  const language = canonicalLocale?.split('-')[0]?.toLowerCase();

  if (language === 'zh') {
    return 'zh-CN';
  }

  if (language === 'en') {
    return 'en-US';
  }

  if (language === 'de') {
    return 'de-DE';
  }

  return undefined;
}

function safeReadStoredLocale(storage?: RuntimeLocaleStorage | null): string | null | undefined {
  try {
    return storage?.getItem(UMI_LOCALE_STORAGE_KEY);
  } catch {
    return undefined;
  }
}

function safeRemoveStoredLocale(storage?: RuntimeLocaleStorage | null): void {
  try {
    storage?.removeItem(UMI_LOCALE_STORAGE_KEY);
  } catch {
    // Storage can be disabled by browser policy. Locale detection still works.
  }
}

function safePersistLocale(
  storage: RuntimeLocaleStorage | null | undefined,
  locale: SupportedAppLocale,
) {
  try {
    storage?.setItem(UMI_LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage can be disabled by browser policy. Keep the in-memory locale.
  }
}

/**
 * Resolves the first browser locale before Umi renders its locale provider.
 * A supported cached value wins; stale aliases are migrated to the canonical
 * product locale. Unsupported cache entries are discarded before navigator
 * preferences are considered.
 */
export function resolveBrowserRuntimeLocale(
  options: BrowserRuntimeLocaleOptions = {},
): SupportedAppLocale {
  const storage = options.storage === undefined ? getDefaultBrowserStorage() : options.storage;
  const browserNavigator =
    options.navigator === undefined ? getDefaultBrowserNavigator() : options.navigator;
  const fallbackLocale = options.fallbackLocale ?? DEFAULT_BROWSER_APP_LOCALE;
  const storedValue = safeReadStoredLocale(storage);

  if (storedValue !== null && storedValue !== undefined) {
    const storedLocale = normalizeRuntimeLocale(storedValue);
    if (storedLocale) {
      if (storedValue !== storedLocale) {
        safePersistLocale(storage, storedLocale);
      }
      return storedLocale;
    }

    safeRemoveStoredLocale(storage);
  }

  const navigatorCandidates = [...(browserNavigator?.languages ?? []), browserNavigator?.language];

  for (const candidate of navigatorCandidates) {
    const locale = normalizeRuntimeLocale(candidate);
    if (locale) {
      safePersistLocale(storage, locale);
      return locale;
    }
  }

  return fallbackLocale;
}

/**
 * Help is currently published in Chinese and English only. German app users
 * intentionally receive the English documentation instead of a fake /de URL.
 */
export function getDocumentationUrl(locale?: string | null): string {
  const normalizedLocale = normalizeRuntimeLocale(locale) ?? DEFAULT_BROWSER_APP_LOCALE;
  return normalizedLocale === 'zh-CN' ? DOCUMENTATION_BASE_URL : `${DOCUMENTATION_BASE_URL}/en`;
}

export function getRuntimeLocale(
  umiModule: { getLocale?: unknown } = umiRuntime,
  env: RuntimeLocaleEnv = getDefaultRuntimeEnv(),
): SupportedAppLocale {
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
    const values = env[envKey]?.split(':') ?? [];
    for (const value of values) {
      const locale = normalizeRuntimeLocale(value);
      if (locale) {
        return locale;
      }
    }
  }

  return DEFAULT_SERVICE_APP_LOCALE;
}
