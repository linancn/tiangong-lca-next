import { resolveBrandProfile } from '../../../config/brandProfile';
import { LOCALE_REGISTRY } from '../../../src/services/general/localeRegistry';

describe('brand profiles', () => {
  it('defaults to TianGong and fails closed on an unknown brand', () => {
    expect(resolveBrandProfile().id).toBe('tiangong');
    expect(resolveBrandProfile('  ').id).toBe('tiangong');
    expect(resolveBrandProfile(' ATLAS ').id).toBe('atlas');
    expect(() => resolveBrandProfile('atals')).toThrow('Unsupported APP_BRAND');
    expect(() => resolveBrandProfile('../atlas')).toThrow('Unsupported APP_BRAND');
  });

  it('provides every registered locale with independent Atlas copy', () => {
    const original = resolveBrandProfile('tiangong');
    const atlas = resolveBrandProfile('atlas');
    for (const { canonicalLocale } of LOCALE_REGISTRY) {
      expect(original.title[canonicalLocale]).toBeTruthy();
      expect(atlas.title[canonicalLocale]).toContain('ATLAS');
      expect(atlas.slogan[canonicalLocale]).not.toBe(original.slogan[canonicalLocale]);
      expect(atlas.presentation?.copy[canonicalLocale].headline).toBeTruthy();
      expect(atlas.localizedName[canonicalLocale]).toBe('ATLAS');
    }
    expect(atlas.theme.light.colorPrimary).toBe('#2F6B9A');
    expect(atlas.theme.dark.colorPrimary).not.toBe(atlas.theme.light.colorPrimary);
    expect(atlas.desktop.appId).not.toBe(original.desktop.appId);
    expect(atlas.links.terms).toBe(original.links.terms);
    expect(atlas.links.source).toBe(original.links.source);
  });
});
