import { useAntdConfigSetter } from '@umijs/max';
import { theme as antdTheme, type ThemeConfig } from 'antd';
import { useEffect, useRef } from 'react';

export const ANTD_CSS_VAR_KEY = 'tiangong-lca';

export function createAntdThemeConfig(isDarkMode: boolean, colorPrimary?: string): ThemeConfig {
  return {
    cssVar: { key: ANTD_CSS_VAR_KEY },
    components: {
      Divider: { orientationMargin: 0 },
    },
    token: { colorPrimary },
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
