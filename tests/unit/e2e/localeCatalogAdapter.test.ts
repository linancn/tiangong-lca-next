import { LOCALE_REGISTRY } from '@/services/general/localeRegistry';
import {
  createRegistryLocaleCatalogAdapter,
  E2E_LOCALE_CATALOG_ADAPTER,
  loadLocaleCatalogModule,
} from '../../e2e/i18n/locale-catalog-adapter';

describe('E2E locale catalog adapter', () => {
  it('derives catalog order and content from the product locale registry', () => {
    expect(E2E_LOCALE_CATALOG_ADAPTER.locales).toEqual(
      LOCALE_REGISTRY.map(({ canonicalLocale }) => canonicalLocale),
    );
    for (const locale of E2E_LOCALE_CATALOG_ADAPTER.locales) {
      expect(Object.keys(E2E_LOCALE_CATALOG_ADAPTER.catalogs[locale]).length).toBeGreaterThan(0);
    }
  });

  it('fails at adapter startup when a new registry row has no catalog file', () => {
    const futureRegistry = [
      ...LOCALE_REGISTRY,
      { canonicalLocale: 'x-codex-missing-catalog' },
    ] as const;

    expect(() =>
      createRegistryLocaleCatalogAdapter(futureRegistry, loadLocaleCatalogModule),
    ).toThrow(
      'Missing E2E locale catalog for x-codex-missing-catalog; expected src/locales/x-codex-missing-catalog.ts.',
    );
  });

  it('fails closed for duplicate registry locales and malformed catalog exports', () => {
    expect(() =>
      createRegistryLocaleCatalogAdapter(
        [{ canonicalLocale: 'en-US' }, { canonicalLocale: 'en-US' }],
        () => ({ default: { message: 'value' } }),
      ),
    ).toThrow('E2E locale catalog registry contains duplicate canonical locales.');
    expect(() =>
      createRegistryLocaleCatalogAdapter([{ canonicalLocale: 'future-FUTURE' }], () => ({
        default: { message: 1 },
      })),
    ).toThrow('E2E locale catalog future-FUTURE must contain only string messages.');
  });
});
