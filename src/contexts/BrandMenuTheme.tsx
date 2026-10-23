import { brandProfile, type BrandProfile } from '../../config/brandProfile';
import { ConfigProvider } from 'antd';
import { cloneElement, isValidElement, type ReactNode } from 'react';

/** Keep a dark navigation menu independent of the page's light/dark algorithm. */
export function BrandMenuTheme({
  children,
  isDarkMode,
  selectedProfile = brandProfile,
}: {
  children: ReactNode;
  isDarkMode: boolean;
  selectedProfile?: BrandProfile;
}) {
  const profile = selectedProfile.theme[isDarkMode ? 'dark' : 'light'];
  // ProLayout replaces Menu popup/submenu backgrounds with its page tokens.
  // Reapply the brand's native Menu tokens below that provider so the light
  // page keeps light overlays while its collapsed dark menu stays dark.
  return (
    <ConfigProvider theme={{ components: { Menu: profile.components?.Menu } }}>
      {children}
    </ConfigProvider>
  );
}

/** ProLayout's header render slot contains its Menu ConfigProvider, unlike its sider slot. */
export function renderBrandHeaderMenu(defaultDom: ReactNode, isDarkMode: boolean) {
  if (!isValidElement<{ children?: ReactNode }>(defaultDom) || defaultDom.type !== ConfigProvider) {
    return defaultDom;
  }
  // Retain the native provider and menu, inserting only the brand token boundary
  // below ProLayout's popup overrides. Browser proof covers the installed adapter.
  return cloneElement(
    defaultDom,
    undefined,
    <BrandMenuTheme isDarkMode={isDarkMode}>{defaultDom.props.children}</BrandMenuTheme>,
  );
}
