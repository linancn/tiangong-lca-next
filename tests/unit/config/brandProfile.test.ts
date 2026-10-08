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

  it('provides every registered locale with provisional shared slogans', () => {
    const original = resolveBrandProfile('tiangong');
    const atlas = resolveBrandProfile('atlas');
    for (const { canonicalLocale } of LOCALE_REGISTRY) {
      expect(original.title[canonicalLocale]).toBeTruthy();
      expect(atlas.title[canonicalLocale]).toContain('ATLAS');
      expect(atlas.slogan[canonicalLocale]).toBe(original.slogan[canonicalLocale]);
      expect(atlas.localizedName[canonicalLocale]).toBe('ATLAS');
    }
    expect(atlas.theme.light.colorPrimary).toBe('#06162A');
    expect(atlas.theme.dark.colorPrimary).not.toBe(atlas.theme.light.colorPrimary);
    expect(atlas.desktop.appId).not.toBe(original.desktop.appId);
    expect(atlas.links.terms).toBe(original.links.terms);
    expect(atlas.links.source).toBe(original.links.source);
  });
});
