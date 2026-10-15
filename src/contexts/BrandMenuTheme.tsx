import { brandProfile, type BrandProfile } from '../../config/brandProfile';
import { ConfigProvider } from 'antd';
import type { ReactNode } from 'react';

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
