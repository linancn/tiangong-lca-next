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
});
