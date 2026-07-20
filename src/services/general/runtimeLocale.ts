import * as umiRuntime from 'umi';
import {
  DEFAULT_BROWSER_APP_LOCALE,
  DEFAULT_SERVICE_APP_LOCALE,
  getLocaleDefinition,
  normalizeSupportedAppLocale,
  type SupportedAppLocale,
} from './localeRegistry';

export {
  DEFAULT_BROWSER_APP_LOCALE,
  DEFAULT_SERVICE_APP_LOCALE,
  SUPPORTED_APP_LOCALES,
  type SupportedAppLocale,
} from './localeRegistry';
export const UMI_LOCALE_STORAGE_KEY = 'umi_locale';
export const RUNTIME_INTL_CHANGE_EVENT = 'tiangong:runtime-intl-change';

export type RuntimeIntlShapeLike = {
  locale?: string;
  formatMessage: (
    descriptor: { defaultMessage?: string; id: string },
    values?: Record<string, string | number | undefined>,
  ) => string;
};

const RUNTIME_LOCALE_ENV_KEYS = ['LC_ALL', 'LC_MESSAGES', 'LANGUAGE', 'LANG'] as const;
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

/**
 * Normalizes only locales supported by the application. Unknown or malformed
 * values stay outside the app-locale boundary instead of leaking into Umi,
 * Intl or service-side formatting calls.
 */
export function normalizeRuntimeLocale(value?: string | null): SupportedAppLocale | undefined {
  return normalizeSupportedAppLocale(value);
}

/**
 * React roots mounted outside Umi's provider tree cannot consume useIntl.
 * Publish the current registry-backed intl instance so those roots can remain
 * reactive without copying catalogs or hard-coding locale branches.
 */
export function publishRuntimeIntlChange(intl: RuntimeIntlShapeLike): void {
  if (typeof window !== 'object' || !normalizeRuntimeLocale(intl.locale)) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<{ intl: RuntimeIntlShapeLike }>(RUNTIME_INTL_CHANGE_EVENT, {
      detail: { intl },
    }),
  );
}

export function subscribeRuntimeIntlChange(
  listener: (intl: RuntimeIntlShapeLike) => void,
): () => void {
  if (typeof window !== 'object') {
    return () => undefined;
  }
  const handleChange = (event: Event) => {
    const intl = (event as CustomEvent<{ intl?: RuntimeIntlShapeLike }>).detail?.intl;
    if (intl && typeof intl.formatMessage === 'function' && normalizeRuntimeLocale(intl.locale)) {
      listener(intl);
    }
  };
  window.addEventListener(RUNTIME_INTL_CHANGE_EVENT, handleChange);
  return () => window.removeEventListener(RUNTIME_INTL_CHANGE_EVENT, handleChange);
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

/** Help URLs follow the explicit registry fallback instead of inventing routes. */
export function getDocumentationUrl(locale?: string | null): string {
  const normalizedLocale = normalizeRuntimeLocale(locale) ?? DEFAULT_BROWSER_APP_LOCALE;
  return getLocaleDefinition(normalizedLocale).fallbacks.documentationUrl;
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
