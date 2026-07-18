import {
  getContentReadingCapabilityStatus,
  getLocaleCapability,
  LOCALE_CAPABILITY_MATRIX,
} from '@/services/general/localeCapabilities';
import { SUPPORTED_APP_LOCALES } from '@/services/general/localeRegistry';
import {
  REFERENCE_RESOURCE_MANIFEST,
  REQUIRED_REFERENCE_RESOURCE_IDS,
} from '@/services/referenceResources/manifest';

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

  it('exposes each reference status from the resource manifest', () => {
    const german = getLocaleCapability('de-DE');
    expect(german.contentLanguage).toBe('de');
    expect(german.serviceQuery).toEqual({
      status: 'declared-fallback',
      resolvedLanguage: 'en',
      disclosure: 'diagnostic',
    });
    expect(german.referenceResources).toHaveLength(REQUIRED_REFERENCE_RESOURCE_IDS.length);
    for (const capability of german.referenceResources) {
      const resource = REFERENCE_RESOURCE_MANIFEST.find(
        ({ resourceId }) => resourceId === capability.resourceId,
      )!;
      expect(capability.status).toBe(resource.localizations.de.status);
    }
    expect(
      german.referenceResources
        .filter(({ status }) => status !== 'native')
        .every(({ ownerIssue }) => ownerIssue === '#634'),
    ).toBe(true);
  });

  it('derives native delivery evidence from the localization manifest', () => {
    const english = getLocaleCapability('en-US');

    for (const capability of english.referenceResources) {
      const resource = REFERENCE_RESOURCE_MANIFEST.find(
        ({ resourceId }) => resourceId === capability.resourceId,
      )!;
      expect(capability.status).toBe('native');
      expect(capability.deliveryStatus).toBe(resource.localizations.en.deliveryStatus);
    }
  });

  it('derives unsupported authoring and completed native resources from owner registries', () => {
    let isolatedCapabilities: typeof import('@/services/general/localeCapabilities') | undefined;

    jest.doMock('@/services/general/contentLanguageRegistry', () => {
      const actual = jest.requireActual<
        typeof import('@/services/general/contentLanguageRegistry')
      >('@/services/general/contentLanguageRegistry');
      return {
        ...actual,
        getContentLanguageDefinition: (languageCode?: string | null) => {
          const definition = actual.getContentLanguageDefinition(languageCode);
          return definition?.languageCode === 'en'
            ? {
                ...definition,
                authoring: { ...definition.authoring, enabled: false },
              }
            : definition;
        },
      };
    });
    jest.doMock('@/services/referenceResources/resolver', () => ({
      resolveReferenceResource: (resourceId: string, requestedLanguage: string) => ({
        status: 'native',
        resourceId,
        requestedLanguage,
        resolvedLanguage: requestedLanguage,
        usedFallback: false,
        deliveryStatus: 'official',
      }),
    }));

    try {
      jest.isolateModules(() => {
        isolatedCapabilities = require('@/services/general/localeCapabilities');
      });
    } finally {
      jest.dontMock('@/services/general/contentLanguageRegistry');
      jest.dontMock('@/services/referenceResources/resolver');
      jest.resetModules();
    }

    const english = isolatedCapabilities?.getLocaleCapability('en-US');
    expect(english?.contentAuthoring).toBe('unsupported');
    expect(
      english?.referenceResources.every(
        ({ deliveryStatus, ownerIssue }) =>
          deliveryStatus === 'official' && ownerIssue === undefined,
      ),
    ).toBe(true);
  });

  it('fails closed when an app locale has no matching content capability', () => {
    jest.doMock('@/services/general/contentLanguageRegistry', () => {
      const actual = jest.requireActual<
        typeof import('@/services/general/contentLanguageRegistry')
      >('@/services/general/contentLanguageRegistry');
      return {
        ...actual,
        getContentLanguageDefinition: () => undefined,
      };
    });

    try {
      jest.isolateModules(() => {
        expect(() => require('@/services/general/localeCapabilities')).toThrow(
          'has no matching content-language capability.',
        );
      });
    } finally {
      jest.dontMock('@/services/general/contentLanguageRegistry');
      jest.resetModules();
    }
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
