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
