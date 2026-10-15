import { BrandMenuTheme } from '@/contexts/BrandMenuTheme';
import { act, render, screen } from '@testing-library/react';
import { ConfigProvider, Menu, theme } from 'antd';
import { useContext } from 'react';
import { brandProfile, resolveBrandProfile } from '../../../config/brandProfile';

const ThemeProbe = ({ id }: { id: string }) => {
  const configuration = useContext(ConfigProvider.ConfigContext);
  const { token } = theme.useToken();
  return (
    <output data-testid={id}>
      {JSON.stringify({
        menu: configuration.theme?.components?.Menu,
        primary: token.colorPrimary,
        container: token.colorBgContainer,
      })}
    </output>
  );
};

const readTheme = (id: string) => JSON.parse(screen.getByTestId(id).textContent!);

it.each([false, true])(
  'restores the native dark menu popup below ProLayout while retaining the global theme in mode %s',
  async (isDarkMode) => {
    const atlas = resolveBrandProfile('atlas');
    const profile = atlas.theme[isDarkMode ? 'dark' : 'light'];
    const algorithm = isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm;
    const globalTheme = {
      algorithm,
      token: { ...profile.tokens, colorPrimary: '#123456' },
    };
    await act(async () => {
      render(
        <ConfigProvider theme={globalTheme}>
          <ConfigProvider
            theme={{
              components: {
                Menu: {
                  darkPopupBg: profile.tokens!.colorBgElevated,
                  darkSubMenuItemBg: 'transparent',
                  itemBorderRadius: 13,
                },
              },
            }}
          >
            <ThemeProbe id='outside-menu' />
            <BrandMenuTheme isDarkMode={isDarkMode} selectedProfile={atlas}>
              <ThemeProbe id='inside-menu' />
              <Menu
                theme={atlas.layout?.menuProps?.theme}
                mode='inline'
                selectedKeys={['catalog']}
                items={[{ key: 'catalog', label: 'Catalog' }]}
              />
            </BrandMenuTheme>
          </ConfigProvider>
        </ConfigProvider>,
      );
    });
    const outside = readTheme('outside-menu');
    const inside = readTheme('inside-menu');
    expect(outside.menu).toMatchObject({
      darkPopupBg: profile.tokens!.colorBgElevated,
      darkSubMenuItemBg: 'transparent',
    });
    expect(inside.menu).toEqual({
      darkPopupBg: '#001529',
      darkSubMenuItemBg: '#000c17',
      itemBorderRadius: 13,
    });
    expect(inside.primary).toBe(theme.getDesignToken(globalTheme).colorPrimary);
    expect(inside.primary).toBe(outside.primary);
    expect(inside.container).toBe(profile.tokens!.colorBgContainer);
    expect(screen.getByRole('menu')).toHaveClass('ant-menu-dark');
    expect(screen.getByRole('menuitem', { name: 'Catalog' })).toHaveClass('ant-menu-item-selected');
  },
);

it('updates the selected mode configuration while preserving the same child control', () => {
  const atlas = resolveBrandProfile('atlas');
  const customized = {
    ...atlas,
    theme: {
      light: {
        ...atlas.theme.light,
        components: { Menu: { darkPopupBg: '#001529', itemBorderRadius: 4 } },
      },
      dark: {
        ...atlas.theme.dark,
        components: { Menu: { darkPopupBg: '#001529', itemBorderRadius: 8 } },
      },
    },
  };
  const content = (isDarkMode: boolean) => (
    <BrandMenuTheme isDarkMode={isDarkMode} selectedProfile={customized}>
      <ThemeProbe id='mode-menu' />
      <button type='button'>Retained tool</button>
    </BrandMenuTheme>
  );
  const view = render(content(false));
  const control = screen.getByRole('button', { name: 'Retained tool' });
  expect(readTheme('mode-menu').menu.itemBorderRadius).toBe(4);
  view.rerender(content(true));
  expect(readTheme('mode-menu').menu.itemBorderRadius).toBe(8);
  expect(screen.getByRole('button', { name: 'Retained tool' })).toBe(control);
});

it('preserves inherited menu settings for a profile without Menu component overrides', () => {
  const tiangong = resolveBrandProfile('tiangong');
  render(
    <ConfigProvider theme={{ components: { Menu: { darkPopupBg: '#123456' } } }}>
      <BrandMenuTheme isDarkMode selectedProfile={tiangong}>
        <ThemeProbe id='tiangong-menu' />
      </BrandMenuTheme>
    </ConfigProvider>,
  );
  expect(readTheme('tiangong-menu').menu).toEqual({ darkPopupBg: '#123456' });
});

it('uses the build-selected profile when none is passed explicitly', () => {
  render(
    <BrandMenuTheme isDarkMode={false}>
      <ThemeProbe id='default-menu' />
    </BrandMenuTheme>,
  );
  expect(readTheme('default-menu').menu).toEqual(brandProfile.theme.light.components?.Menu ?? {});
});
