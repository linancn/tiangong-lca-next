import { resolveBrandProfile } from '../../../config/brandProfile';
import { LOCALE_REGISTRY } from '../../../src/services/general/localeRegistry';

const contrastRatio = (foreground: string, background: string) => {
  const luminance = (color: string) => {
    const channels = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
    if (!channels) throw new Error(`Expected an opaque hex palette color: ${color}`);
    return channels.slice(1).reduce((total, channel, index) => {
      const srgb = Number.parseInt(channel, 16) / 255;
      const linear = srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
      return total + linear * [0.2126, 0.7152, 0.0722][index];
    }, 0);
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

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
    'keeps Atlas %s sidebar text readable in ordinary, selected, hover and collapsed states',
    (mode) => {
      const profile = resolveBrandProfile('atlas').theme[mode];
      const sider = profile.layoutTokens!.sider!;
      const pairs = [
        [sider.colorTextMenuTitle, sider.colorMenuBackground],
        [sider.colorTextMenu, sider.colorMenuBackground],
        [sider.colorTextMenuSecondary, sider.colorMenuBackground],
        [sider.colorTextMenuSelected, sider.colorBgMenuItemSelected],
        [sider.colorTextSubMenuSelected, sider.colorBgMenuItemSelected],
        [sider.colorTextMenuItemHover, sider.colorBgMenuItemHover],
        [sider.colorTextMenuActive, sider.colorBgMenuItemActive],
        [sider.colorTextCollapsedButton, sider.colorBgCollapsedButton],
        [sider.colorTextCollapsedButtonHover, sider.colorBgCollapsedButton],
        [sider.colorTextMenu, profile.tokens!.colorBgElevated],
      ];
      for (const [foreground, background] of pairs) {
        expect(contrastRatio(foreground as string, background as string)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
      expect(sider.colorBgMenuItemSelected).not.toBe(sider.colorMenuBackground);
      expect(sider.colorBgMenuItemHover).not.toBe(sider.colorMenuBackground);
      expect(sider.colorBgMenuItemCollapsedElevated).toBe(profile.tokens!.colorBgElevated);
      expect(sider.colorMenuItemDivider).toBe(profile.tokens!.colorBorderSecondary);
    },
  );

  it('uses distinct light and dark Atlas navigation surfaces while preserving TianGong defaults', () => {
    const atlas = resolveBrandProfile('atlas');
    expect(atlas.theme.light.layoutTokens!.sider!.colorMenuBackground).toBe('#FFFFFF');
    expect(atlas.theme.dark.layoutTokens!.sider!.colorMenuBackground).toBe('#06162A');
    const tiangong = resolveBrandProfile('tiangong');
    expect(tiangong.theme.light).toEqual({ colorPrimary: '#5C246A', logo: '/logo.svg' });
    expect(tiangong.theme.dark).toEqual({ colorPrimary: '#9e3ffd', logo: '/logo_dark.svg' });
  });
});
