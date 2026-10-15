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
  return {
    cssVar: { key: ANTD_CSS_VAR_KEY },
    components: {
      ...profile.components,
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
