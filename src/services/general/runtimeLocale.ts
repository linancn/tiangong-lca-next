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
export const MANUAL_LOCALE_STORAGE_KEY = 'tiangong_manual_locale';
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

export type RuntimeLocaleSession = {
  manualLocale?: SupportedAppLocale;
};

const browserLocaleSession: RuntimeLocaleSession = {};

type RuntimeIntlEventTarget = Pick<
  Window,
  'addEventListener' | 'dispatchEvent' | 'removeEventListener'
>;

export type BrowserRuntimeLocaleOptions = {
  fallbackLocale?: SupportedAppLocale;
  navigator?: RuntimeLocaleNavigator | null;
  storage?: RuntimeLocaleStorage | null;
  session?: RuntimeLocaleSession | null;
};

function getDefaultRuntimeEnv(): RuntimeLocaleEnv {
  if (typeof process === 'object' && process?.env) {
    return process.env as RuntimeLocaleEnv;
  }

  return {};
}

function getDefaultBrowserStorage(): RuntimeLocaleStorage | undefined {
  try {
    return (globalThis as typeof globalThis & { window?: Window }).window?.localStorage;
  } catch {
    return undefined;
  }
}

function getDefaultBrowserNavigator(): RuntimeLocaleNavigator | undefined {
  return (globalThis as typeof globalThis & { navigator?: RuntimeLocaleNavigator }).navigator;
}

function getDefaultRuntimeIntlTarget(): RuntimeIntlEventTarget | undefined {
  return (globalThis as typeof globalThis & { window?: RuntimeIntlEventTarget }).window;
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
export function publishRuntimeIntlChange(
  intl: RuntimeIntlShapeLike,
  target: RuntimeIntlEventTarget | null | undefined = getDefaultRuntimeIntlTarget(),
): void {
  if (!target || !normalizeRuntimeLocale(intl.locale)) {
    return;
  }
  target.dispatchEvent(
    new CustomEvent<{ intl: RuntimeIntlShapeLike }>(RUNTIME_INTL_CHANGE_EVENT, {
      detail: { intl },
    }),
  );
}

export function subscribeRuntimeIntlChange(
  listener: (intl: RuntimeIntlShapeLike) => void,
  target: RuntimeIntlEventTarget | null | undefined = getDefaultRuntimeIntlTarget(),
): () => void {
  if (!target) {
    return () => undefined;
  }
  const handleChange = (event: Event) => {
    const intl = (event as CustomEvent<{ intl?: RuntimeIntlShapeLike }>).detail?.intl;
    if (intl && typeof intl.formatMessage === 'function' && normalizeRuntimeLocale(intl.locale)) {
      listener(intl);
    }
  };
  target.addEventListener(RUNTIME_INTL_CHANGE_EVENT, handleChange);
  return () => target.removeEventListener(RUNTIME_INTL_CHANGE_EVENT, handleChange);
}

function safeReadStoredLocale(
  storage: RuntimeLocaleStorage | null | undefined,
  key: string,
): string | null | undefined {
  try {
    return storage?.getItem(key);
  } catch {
    return undefined;
  }
}

function safeRemoveStoredLocale(
  storage: RuntimeLocaleStorage | null | undefined,
  key: string,
): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Storage can be disabled by browser policy. Locale detection still works.
  }
}

function safePersistLocale(
  storage: RuntimeLocaleStorage | null | undefined,
  key: string,
  locale: SupportedAppLocale,
) {
  try {
    storage?.setItem(key, locale);
  } catch {
    // Storage can be disabled by browser policy. Keep the in-memory locale.
  }
}

/** Only a deliberate language-menu selection creates a new persisted preference. */
export function rememberManualRuntimeLocale(
  value: string,
  options: Pick<BrowserRuntimeLocaleOptions, 'storage' | 'session'> = {},
): void {
  const locale = normalizeRuntimeLocale(value);
  if (!locale) return;
  const session = options.session === undefined ? browserLocaleSession : options.session;
  if (session) session.manualLocale = locale;
  const storage = options.storage === undefined ? getDefaultBrowserStorage() : options.storage;
  safePersistLocale(storage, MANUAL_LOCALE_STORAGE_KEY, locale);
}

/**
 * Manual preference wins, followed by the legacy Umi cache, ordered browser
 * preferences and English. Legacy values have unknown provenance: preserve
 * existing choices without promoting them to manual. Automatic detection
 * never persists a new preference. Invalid stored values are discarded.
 */
export function resolveBrowserRuntimeLocale(
  options: BrowserRuntimeLocaleOptions = {},
): SupportedAppLocale {
  const storage = options.storage === undefined ? getDefaultBrowserStorage() : options.storage;
  const browserNavigator =
    options.navigator === undefined ? getDefaultBrowserNavigator() : options.navigator;
  const fallbackLocale = options.fallbackLocale ?? DEFAULT_BROWSER_APP_LOCALE;
  const session = options.session === undefined ? browserLocaleSession : options.session;
  if (session?.manualLocale) return session.manualLocale;

  for (const key of [MANUAL_LOCALE_STORAGE_KEY, UMI_LOCALE_STORAGE_KEY]) {
    const storedValue = safeReadStoredLocale(storage, key);
    if (storedValue !== null && storedValue !== undefined) {
      const storedLocale = normalizeRuntimeLocale(storedValue);
      if (storedLocale) {
        if (storedValue !== storedLocale) {
          safePersistLocale(storage, key, storedLocale);
        }
        return storedLocale;
      }

      safeRemoveStoredLocale(storage, key);
    }
  }

  const navigatorCandidates = [...(browserNavigator?.languages ?? []), browserNavigator?.language];

  for (const candidate of navigatorCandidates) {
    const locale = normalizeRuntimeLocale(candidate);
    if (locale) {
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
