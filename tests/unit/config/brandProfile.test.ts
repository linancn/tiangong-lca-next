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

  it.each(['light', 'dark'] as const)(
    'uses native dark Atlas navigation independently of the global %s theme',
    (mode) => {
      const atlas = resolveBrandProfile('atlas');
      const profile = atlas.theme[mode];
      const sider = profile.layoutTokens!.sider!;
      expect(atlas.layout?.menuProps).toEqual({ theme: 'dark' });
      expect(sider).toMatchObject({
        colorMenuBackground: '#001529',
        colorBgMenuItemCollapsedElevated: '#001529',
        colorTextMenuTitle: '#FFFFFF',
        colorTextMenu: 'rgba(255, 255, 255, 0.65)',
        colorTextMenuSecondary: 'rgba(255, 255, 255, 0.65)',
        colorTextMenuSelected: '#FFFFFF',
        colorTextMenuItemHover: '#FFFFFF',
        colorTextMenuActive: '#FFFFFF',
        colorBgCollapsedButton: '#002140',
        colorTextCollapsedButton: '#FFFFFF',
        colorTextCollapsedButtonHover: '#FFFFFF',
      });
      for (const field of [
        'colorBgMenuItemSelected',
        'colorBgMenuItemHover',
        'colorBgMenuItemActive',
      ]) {
        expect(sider).not.toHaveProperty(field);
      }
      expect(profile.components?.Menu).toEqual({
        darkPopupBg: '#001529',
        darkSubMenuItemBg: '#000c17',
      });
      expect(profile.tokens!.colorBgContainer).toBe(mode === 'light' ? '#FFFFFF' : '#102337');
      expect(profile.tokens!.colorBgElevated).toBe(mode === 'light' ? '#FFFFFF' : '#102B43');
    },
  );

  it('preserves TianGong theme and menu defaults', () => {
    const tiangong = resolveBrandProfile('tiangong');
    expect(tiangong.layout?.menuProps).toBeUndefined();
    expect(tiangong.theme.light).toEqual({ colorPrimary: '#5C246A', logo: '/logo.svg' });
    expect(tiangong.theme.dark).toEqual({ colorPrimary: '#9e3ffd', logo: '/logo_dark.svg' });
  });
});
