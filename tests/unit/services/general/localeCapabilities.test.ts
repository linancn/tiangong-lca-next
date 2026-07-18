import {
  getContentReadingCapabilityStatus,
  getLocaleCapability,
  LOCALE_CAPABILITY_MATRIX,
} from '@/services/general/localeCapabilities';
import { SUPPORTED_APP_LOCALES } from '@/services/general/localeRegistry';
import { REQUIRED_REFERENCE_RESOURCE_IDS } from '@/services/referenceResources/manifest';

describe('localeCapabilities', () => {
  it('derives one complete capability row for every registered app locale', () => {
    expect(LOCALE_CAPABILITY_MATRIX.map(({ appLocale }) => appLocale)).toEqual(
      SUPPORTED_APP_LOCALES,
    );
    for (const row of LOCALE_CAPABILITY_MATRIX) {
      expect(row.referenceResources.map(({ resourceId }) => resourceId)).toEqual(
        REQUIRED_REFERENCE_RESOURCE_IDS,
      );
      expect(row.contentAuthoring).toBe('native');
      expect(row.contentReading).toBe('native');
    }
  });

  it('exposes development reference fallbacks without claiming delivery completion', () => {
    const german = getLocaleCapability('de-DE');
    expect(german.contentLanguage).toBe('de');
    expect(german.serviceQuery).toEqual({
      status: 'declared-fallback',
      resolvedLanguage: 'en',
      disclosure: 'diagnostic',
    });
    expect(german.referenceResources).toHaveLength(REQUIRED_REFERENCE_RESOURCE_IDS.length);
    expect(german.referenceResources.every(({ status }) => status === 'development-base')).toBe(
      true,
    );
    expect(german.referenceResources.every(({ ownerIssue }) => ownerIssue === '#634')).toBe(true);
  });

  it('keeps legacy native-resource verification debt owned by the localization issue', () => {
    const english = getLocaleCapability('en-US');

    expect(
      english.referenceResources.every(
        ({ deliveryStatus, ownerIssue }) =>
          deliveryStatus === 'legacy-unverified' && ownerIssue === '#634',
      ),
    ).toBe(true);
  });

  it('does not invent a row for an unregistered locale', () => {
    expect(getLocaleCapability('es-ES')).toBeUndefined();
  });

  it.each([
    {
      expected: 'native',
      fixture: { languageCode: 'de', reading: { enabled: true, priority: ['de', 'en'] } },
    },
    {
      expected: 'declared-fallback',
      fixture: { languageCode: 'de', reading: { enabled: true, priority: ['en'] } },
    },
    {
      expected: 'unsupported',
      fixture: { languageCode: 'de', reading: { enabled: false, priority: [] } },
    },
  ] as const)(
    'derives $expected content-reading capability from a registry fixture',
    ({ expected, fixture }) => {
      expect(getContentReadingCapabilityStatus(fixture)).toBe(expected);
    },
  );
});
