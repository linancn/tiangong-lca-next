import { brandProfile, type BrandProfile } from '../../config/brandProfile';
import { useAntdConfigSetter } from '@umijs/max';
import { theme as antdTheme, type ThemeConfig } from 'antd';
import { useEffect, useRef } from 'react';

export const ANTD_CSS_VAR_KEY = 'tiangong-lca';

export function createAntdThemeConfig(
  isDarkMode: boolean,
  colorPrimary?: string,
  selectedProfile: BrandProfile = brandProfile,
): ThemeConfig {
  const profile = selectedProfile.theme[isDarkMode ? 'dark' : 'light'];
  const sider =
    selectedProfile.id === 'atlas' && isDarkMode ? profile.layoutTokens?.sider : undefined;
  // ProLayout maps its sider tokens to Menu's light fields only. Its realDark
  // navigation selects the separate native dark fields, so bridge those here.
  const menu = sider
    ? {
        Menu: {
          darkItemBg: sider.colorMenuBackground,
          darkItemColor: sider.colorTextMenu,
          darkItemHoverBg: sider.colorBgMenuItemHover,
          darkItemHoverColor: sider.colorTextMenuItemHover,
          darkItemSelectedBg: sider.colorBgMenuItemSelected,
          darkItemSelectedColor: sider.colorTextMenuSelected,
          darkGroupTitleColor: sider.colorTextMenuSecondary,
          ...profile.components?.Menu,
        },
      }
    : {};
  return {
    cssVar: { key: ANTD_CSS_VAR_KEY },
    components: {
      ...profile.components,
      ...menu,
      Divider: { orientationMargin: 0, ...profile.components?.Divider },
    },
    token: { ...profile.tokens, colorPrimary: colorPrimary ?? profile.colorPrimary },
    algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
  };
}

export function AntdThemeSync({
  colorPrimary,
  isDarkMode,
}: {
  colorPrimary?: string;
  isDarkMode: boolean;
}) {
  const setAntdConfig = useAntdConfigSetter();
  const setAntdConfigRef = useRef(setAntdConfig);

  useEffect(() => {
    setAntdConfigRef.current = setAntdConfig;
  }, [setAntdConfig]);

  useEffect(() => {
    setAntdConfigRef.current({
      theme: createAntdThemeConfig(isDarkMode, colorPrimary),
    });
  }, [colorPrimary, isDarkMode]);

  return null;
}
