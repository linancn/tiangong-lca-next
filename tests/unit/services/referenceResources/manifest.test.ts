import { SUPPORTED_CONTENT_LANGUAGES } from '@/services/general/contentLanguageRegistry';
import {
  getReferenceResourceCacheFiles,
  getReferenceResourceCacheVersion,
  REFERENCE_RESOURCE_MANIFEST,
  REQUIRED_REFERENCE_RESOURCE_IDS,
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
      expect(resource.provenance.status).toBe('pending-verification');
      expect(resource.provenance.ownerIssue).toBe('#634');
    }
  });

  it('derives cache files and versions from the manifest', () => {
    expect(getReferenceResourceCacheFiles('location')).toEqual([
      'ILCDLocations.min.json.gz',
      'ILCDLocations_zh.min.json.gz',
    ]);
    expect(getReferenceResourceCacheFiles('classification')).toHaveLength(8);
    expect(getReferenceResourceCacheVersion('classification')).toContain('cpc@legacy-1');
    expect(getReferenceResourceCacheVersion('location')).toBe('1:ilcd-locations@legacy-1');
  });

  it('resolves bundled Chinese assets and their localized ILCD data type', () => {
    const resolution = resolveReferenceResource('ilcd-classification', 'zh-CN');
    expect(resolution.status).toBe('native');
    expect(resolution.resolvedLanguage).toBe('zh');
    expect(resolution.localizedAsset?.fileName).toBe('ILCDClassification_zh.min.json.gz');
    expect(getResolvedReferenceDataTypeName(resolution, 'Process')).toBe('过程');

    const locationResolution = resolveReferenceResource('ilcd-locations', 'zh-CN');
    expect(getResolvedReferenceDataTypeName(locationResolution, 'Process')).toBe('Process');
  });

  it('does not report a native reference-resource resolution as fallback', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    reportReferenceResourceResolution(resolveReferenceResource('cpc', 'en'));

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it('makes German and French development fallbacks observable and owned by #634', () => {
    const german = resolveReferenceResource('ilcd-locations', 'de-DE');
    expect(german).toEqual(
      expect.objectContaining({
        status: 'development-base',
        requestedLanguage: 'de',
        resolvedLanguage: 'en',
        usedFallback: true,
        ownerIssue: '#634',
      }),
    );
    expect(getReferenceAssetStem(german)).toBe('ILCDLocations');
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
    const localizations = resource.localizations as Record<
      string,
      (typeof resource.localizations)['de']
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
      expect(getReferenceAssetStem(resolution)).toBe('CPCClassification');

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
});
