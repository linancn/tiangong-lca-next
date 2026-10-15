import { resolveBrandProfile } from '../../../config/brandProfile';
import { AntdThemeSync, createAntdThemeConfig } from '@/contexts/AntdThemeSync';
import { render, waitFor } from '@testing-library/react';

const mockSetAntdConfig = jest.fn();

jest.mock('@umijs/max', () => ({
  __esModule: true,
  useAntdConfigSetter: () => mockSetAntdConfig,
}));

jest.mock('antd', () => ({
  __esModule: true,
  theme: {
    darkAlgorithm: 'dark-algorithm',
    defaultAlgorithm: 'default-algorithm',
  },
}));

describe('AntdThemeSync', () => {
  beforeEach(() => {
    mockSetAntdConfig.mockClear();
  });

  it('creates the native antd 6 css-variable theme contract', () => {
    expect(createAntdThemeConfig(true, '#123456')).toEqual({
      algorithm: 'dark-algorithm',
      components: {
        Divider: { orientationMargin: 0 },
      },
      cssVar: { key: 'tiangong-lca' },
      token: { colorPrimary: '#123456' },
    });
  });

  it('updates the global Umi ConfigProvider only when theme inputs change', async () => {
    const view = render(<AntdThemeSync colorPrimary='#1677ff' isDarkMode={false} />);

    await waitFor(() => expect(mockSetAntdConfig).toHaveBeenCalledTimes(1));
    expect(mockSetAntdConfig).toHaveBeenLastCalledWith({
      theme: {
        algorithm: 'default-algorithm',
        components: {
          Divider: { orientationMargin: 0 },
        },
        cssVar: { key: 'tiangong-lca' },
        token: { colorPrimary: '#1677ff' },
      },
    });

    view.rerender(<AntdThemeSync colorPrimary='#1677ff' isDarkMode={false} />);
    expect(mockSetAntdConfig).toHaveBeenCalledTimes(1);

    view.rerender(<AntdThemeSync colorPrimary='#9e3ffd' isDarkMode />);
    await waitFor(() => expect(mockSetAntdConfig).toHaveBeenCalledTimes(2));
    expect(mockSetAntdConfig).toHaveBeenLastCalledWith({
      theme: {
        algorithm: 'dark-algorithm',
        components: {
          Divider: { orientationMargin: 0 },
        },
        cssVar: { key: 'tiangong-lca' },
        token: { colorPrimary: '#9e3ffd' },
      },
    });
  });
});

it('preserves complete Atlas tokens and component settings across mode switches', () => {
  const atlas = resolveBrandProfile('atlas');
  const light = createAntdThemeConfig(false, '#123456', atlas);
  const dark = createAntdThemeConfig(true, undefined, atlas);
  expect(light.token).toMatchObject({
    colorPrimary: '#123456',
    borderRadius: 4,
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
  });
  expect(dark.token).toMatchObject({
    colorPrimary: '#618BBB',
    borderRadius: 4,
    colorBgContainer: '#102337',
    colorBgElevated: '#102B43',
  });
  expect(light.components?.Table).toMatchObject({ headerBg: '#EAF0F3' });
  expect(dark.components?.Table).toMatchObject({ headerBg: '#183047' });
  expect(dark.components?.Divider).toEqual({ orientationMargin: 0 });
});

it('bridges Atlas sider states to native dark Menu tokens without changing the light Menu', () => {
  const atlas = resolveBrandProfile('atlas');
  const sider = atlas.theme.dark.layoutTokens!.sider!;
  const light = createAntdThemeConfig(false, undefined, atlas);
  const dark = createAntdThemeConfig(true, undefined, atlas);
  expect(light.components?.Menu).toBeUndefined();
  expect(dark.components?.Menu).toMatchObject({
    darkItemBg: sider.colorMenuBackground,
    darkItemColor: sider.colorTextMenu,
    darkItemHoverBg: sider.colorBgMenuItemHover,
    darkItemHoverColor: sider.colorTextMenuItemHover,
    darkItemSelectedBg: sider.colorBgMenuItemSelected,
    darkItemSelectedColor: sider.colorTextMenuSelected,
    darkGroupTitleColor: sider.colorTextMenuSecondary,
  });
});

it('lets explicit Atlas Menu and Divider settings win over adapter defaults', () => {
  const atlas = resolveBrandProfile('atlas');
  const customized = {
    ...atlas,
    theme: {
      ...atlas.theme,
      dark: {
        ...atlas.theme.dark,
        components: {
          ...atlas.theme.dark.components,
          Menu: { darkItemSelectedColor: '#fefefe', itemBorderRadius: 12 },
          Divider: { orientationMargin: 8 },
        },
      },
    },
  };
  const result = createAntdThemeConfig(true, '#123456', customized);
  expect(result.components?.Menu).toMatchObject({
    darkItemColor: atlas.theme.dark.layoutTokens!.sider!.colorTextMenu,
    darkItemSelectedColor: '#fefefe',
    itemBorderRadius: 12,
  });
  expect(result.components?.Divider).toEqual({ orientationMargin: 8 });
  expect(result.token?.colorPrimary).toBe('#123456');
});

it('does not inject dark Menu settings for TianGong, a missing sider or a header-only layout', () => {
  const tiangong = resolveBrandProfile('tiangong');
  const atlas = resolveBrandProfile('atlas');
  const withDarkLayout = (
    profile: import('../../../config/brandProfile').BrandProfile,
    layoutTokens: import('../../../config/brandProfile').BrandProfile['theme']['dark']['layoutTokens'],
  ) => ({
    ...profile,
    theme: { ...profile.theme, dark: { ...profile.theme.dark, layoutTokens } },
  });
  const profiles = [
    withDarkLayout(tiangong, atlas.theme.dark.layoutTokens),
    withDarkLayout(atlas, undefined),
    withDarkLayout(atlas, { header: { heightLayoutHeader: 64 } }),
  ];
  for (const profile of profiles) {
    expect(createAntdThemeConfig(true, undefined, profile).components?.Menu).toBeUndefined();
  }
  expect(createAntdThemeConfig(false, undefined, tiangong)).toEqual({
    algorithm: 'default-algorithm',
    components: { Divider: { orientationMargin: 0 } },
    cssVar: { key: 'tiangong-lca' },
    token: { colorPrimary: '#5C246A' },
  });
});
