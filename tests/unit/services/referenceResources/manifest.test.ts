import { SUPPORTED_CONTENT_LANGUAGES } from '@/services/general/contentLanguageRegistry';
import {
  getReferenceResourceCacheFiles,
  getReferenceResourceCacheVersion,
  getReferenceResourceDefinition,
  REFERENCE_RESOURCE_MANIFEST,
  REQUIRED_REFERENCE_RESOURCE_IDS,
  type ReferenceLocaleAvailability,
} from '@/services/referenceResources/manifest';
import {
  getReferenceAssetStem,
  getResolvedReferenceDataTypeName,
  reportReferenceResourceResolution,
  resolveReferenceResource,
} from '@/services/referenceResources/resolver';

describe('reference resource manifest and resolver', () => {
  it('declares every required resource for every supported content language', () => {
    expect(REFERENCE_RESOURCE_MANIFEST.map(({ resourceId }) => resourceId)).toEqual(
      REQUIRED_REFERENCE_RESOURCE_IDS,
    );
    for (const resource of REFERENCE_RESOURCE_MANIFEST) {
      expect(Object.keys(resource.localizations).sort()).toEqual(
        [...SUPPORTED_CONTENT_LANGUAGES].sort(),
      );
      expect(['pending-verification', 'verified']).toContain(resource.provenance.status);
      expect(resource.provenance.ownerIssue).toBe('#634');
      expect(resource.structureDigest.identityCount).toBeGreaterThan(0);
      expect(resource.structureSource.sourceDigest.value).toMatch(/^[a-f0-9]{64}$/u);
      for (const overlay of Object.values(resource.overlays)) {
        expect(overlay.coverage.expected).toBe(resource.structureDigest.identityCount);
        expect(overlay.coverage.blank).toBe(0);
        expect(overlay.coverage.extra).toBe(0);
        expect(overlay.coverage.duplicate).toBe(0);
      }
    }
  });

  it('derives cache files and versions from the manifest', () => {
    expect(getReferenceResourceCacheFiles('location')).toEqual(
      REFERENCE_RESOURCE_MANIFEST.filter(({ scope }) => scope === 'location').flatMap(
        ({ runtimeAssets }) => Object.values(runtimeAssets).map(({ fileName }) => fileName),
      ),
    );
    expect(getReferenceResourceCacheFiles('classification')).toEqual(
      REFERENCE_RESOURCE_MANIFEST.filter(({ scope }) => scope === 'classification').flatMap(
        ({ runtimeAssets }) => Object.values(runtimeAssets).map(({ fileName }) => fileName),
      ),
    );
    expect(getReferenceResourceCacheVersion('classification')).toContain(
      `cpc@${REFERENCE_RESOURCE_MANIFEST.find(({ resourceId }) => resourceId === 'cpc')?.cacheRevision}`,
    );
    expect(getReferenceResourceCacheVersion('location')).toMatch(
      /^2:ilcd-locations@[a-f0-9]{16}$/u,
    );
  });

  it('resolves bundled Chinese assets and their localized ILCD data type', () => {
    const resolution = resolveReferenceResource('ilcd-classification', 'zh-CN');
    expect(resolution.status).toBe('native');
    expect(resolution.resolvedLanguage).toBe('zh');
    expect(resolution.localizedAsset?.fileName).toBe(
      getReferenceResourceDefinition('ilcd-classification').runtimeAssets.zh?.fileName,
    );
    expect(getResolvedReferenceDataTypeName(resolution, 'Process')).toBe('过程');

    const locationResolution = resolveReferenceResource('ilcd-locations', 'zh-CN');
    expect(getResolvedReferenceDataTypeName(locationResolution, 'Process')).toBe('过程');
  });

  it('does not report a native reference-resource resolution as fallback', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    reportReferenceResourceResolution(resolveReferenceResource('cpc', 'en'));

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it('resolves every registry locale from its manifest-declared status', () => {
    for (const resource of REFERENCE_RESOURCE_MANIFEST) {
      for (const language of SUPPORTED_CONTENT_LANGUAGES) {
        const resolution = resolveReferenceResource(resource.resourceId, language);
        expect(resolution.status).toBe(resource.localizations[language].status);
        expect(resolution.requestedLanguage).toBe(language);
        expect(getReferenceAssetStem(resolution)).toBe(
          (resolution.localizedAsset ?? resolution.baseAsset).fileName.replace(
            /\.min\.json\.gz$/u,
            '',
          ),
        );
      }
    }
  });

  it('fails closed when a declared runtime asset is absent', () => {
    const resource = REFERENCE_RESOURCE_MANIFEST.find(({ resourceId }) => resourceId === 'cpc')!;
    const runtimeAssets = resource.runtimeAssets as {
      en?: (typeof resource.runtimeAssets)['en'];
    };
    const englishAsset = runtimeAssets.en;

    try {
      delete runtimeAssets.en;
      expect(() => resolveReferenceResource('cpc', 'en')).toThrow(
        'Reference resource cpc has no runtime asset for en.',
      );
    } finally {
      runtimeAssets.en = englishAsset;
    }
  });

  it('resolves a declared missing localization without inventing an asset', () => {
    const resource = REFERENCE_RESOURCE_MANIFEST.find(({ resourceId }) => resourceId === 'cpc')!;
    const localizations = resource.localizations as unknown as Record<
      string,
      ReferenceLocaleAvailability
    >;
    const germanAvailability = localizations.de;

    try {
      localizations.de = {
        status: 'missing',
        ownerIssue: '#634',
        diagnostic: 'German CPC labels are unavailable.',
      };
      const resolution = resolveReferenceResource('cpc', 'de');

      expect(resolution).toEqual(
        expect.objectContaining({
          status: 'missing',
          requestedLanguage: 'de',
          usedFallback: false,
          ownerIssue: '#634',
        }),
      );
      expect('resolvedLanguage' in resolution).toBe(false);
      expect(getReferenceAssetStem(resolution)).toBe(
        resource.runtimeAssets.en!.fileName.replace(/\.min\.json\.gz$/u, ''),
      );

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      reportReferenceResourceResolution(resolution);
      reportReferenceResourceResolution(resolution);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[i18n-reference-resource] German CPC labels are unavailable.',
      );
      consoleWarnSpy.mockRestore();
    } finally {
      localizations.de = germanAvailability;
    }
  });

  it('resolves an explicitly declared development-base asset without hiding the fallback', () => {
    const resource = REFERENCE_RESOURCE_MANIFEST.find(({ resourceId }) => resourceId === 'cpc')!;
    const localizations = resource.localizations as unknown as Record<
      string,
      ReferenceLocaleAvailability
    >;
    const germanAvailability = localizations.de;

    try {
      localizations.de = {
        status: 'development-base',
        resolvedLanguage: 'en',
        ownerIssue: '#634',
        diagnostic: 'German CPC labels temporarily use the development base.',
      };

      expect(resolveReferenceResource('cpc', 'de')).toEqual(
        expect.objectContaining({
          status: 'development-base',
          requestedLanguage: 'de',
          resolvedLanguage: 'en',
          usedFallback: true,
          localizedAsset: resource.runtimeAssets.en,
        }),
      );
    } finally {
      localizations.de = germanAvailability;
    }
  });
});
