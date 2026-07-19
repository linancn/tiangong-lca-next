import fs from 'node:fs';
import path from 'node:path';

import {
  LOCALE_REGISTRY,
  type SupportedAppLocale,
} from '../../../src/services/general/localeRegistry';

export type LocaleMessageCatalog = Readonly<Record<string, string>>;

type LocaleRegistryRow<Locale extends string> = {
  canonicalLocale: Locale;
};

type LocaleCatalogAdapter<Locale extends string> = {
  catalogs: Readonly<Record<Locale, LocaleMessageCatalog>>;
  locales: readonly Locale[];
};

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unwrapLocaleCatalog(moduleValue: unknown): unknown {
  return isRecord(moduleValue) && Object.prototype.hasOwnProperty.call(moduleValue, 'default')
    ? moduleValue.default
    : moduleValue;
}

function assertLocaleCatalog(
  value: unknown,
  locale: string,
): asserts value is LocaleMessageCatalog {
  if (!isRecord(value)) {
    throw new Error(`E2E locale catalog ${locale} must export a message object.`);
  }
  const entries = Object.entries(value);
  if (entries.length === 0 || entries.some(([, message]) => typeof message !== 'string')) {
    throw new Error(`E2E locale catalog ${locale} must contain only string messages.`);
  }
}

/**
 * Builds the Node-only E2E catalog set from the product registry. The loader is
 * injectable so the missing-catalog boundary can be proved without adding a
 * test object to the production locale bundle.
 */
export function createRegistryLocaleCatalogAdapter<Locale extends string>(
  registry: readonly LocaleRegistryRow<Locale>[],
  loadCatalogModule: (locale: Locale) => unknown,
): LocaleCatalogAdapter<Locale> {
  const locales = registry.map(({ canonicalLocale }) => canonicalLocale);
  if (new Set(locales).size !== locales.length) {
    throw new Error('E2E locale catalog registry contains duplicate canonical locales.');
  }

  const catalogs = Object.fromEntries(
    locales.map((locale) => {
      const catalog = unwrapLocaleCatalog(loadCatalogModule(locale));
      assertLocaleCatalog(catalog, locale);
      return [locale, Object.freeze({ ...catalog })];
    }),
  ) as Record<Locale, LocaleMessageCatalog>;

  return Object.freeze({
    catalogs: Object.freeze(catalogs),
    locales: Object.freeze([...locales]),
  });
}

export function loadLocaleCatalogModule(
  locale: string,
  repositoryRoot: string = REPOSITORY_ROOT,
): unknown {
  const modulePath = path.join(repositoryRoot, 'src', 'locales', `${locale}.ts`);
  if (!fs.existsSync(modulePath)) {
    throw new Error(`Missing E2E locale catalog for ${locale}; expected src/locales/${locale}.ts.`);
  }

  // Playwright and Jest both install TypeScript-aware Node require hooks for
  // test files. Keeping this dynamic lookup here makes the registry the only
  // locale sequence while retaining a synchronous message assertion API.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(modulePath) as unknown;
}

export const E2E_LOCALE_CATALOG_ADAPTER = createRegistryLocaleCatalogAdapter(
  LOCALE_REGISTRY,
  loadLocaleCatalogModule,
) satisfies LocaleCatalogAdapter<SupportedAppLocale>;
