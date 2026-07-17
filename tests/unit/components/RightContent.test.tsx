/**
 * Tests for RightContent components
 * Path: src/components/RightContent/index.tsx
 */

import { DarkMode, Question, SelectLang } from '@/components/RightContent';
import { fireEvent, render, screen } from '@testing-library/react';

type ReactNode = import('react').ReactNode;

type ConfigProviderProps = {
  children: ReactNode;
  theme: { algorithm: string };
};

type IconProps = {
  onClick?: () => void;
};

const configProviderThemes: string[] = [];
let mockLocale: string | undefined = 'zh-CN';
let renderedLocales: Array<Record<string, unknown>> = [];
const defaultAvailableLocales = () => [
  { lang: 'de-DE', label: 'Deutsch (Deutschland)', icon: '🇩🇪' },
  { lang: 'en-US', label: 'English', icon: '🇺🇸' },
  { lang: 'zh-CN', label: '简体中文', icon: '🇨🇳' },
  { lang: 'fr-FR', label: 'Français' },
];
let mockAvailableLocales = defaultAvailableLocales();

jest.mock('@ant-design/icons', () => ({
  MoonOutlined: ({ onClick }: IconProps) => (
    <button type='button' aria-label='moon-icon' onClick={onClick}>
      Moon
    </button>
  ),
  SunFilled: ({ onClick }: IconProps) => (
    <button type='button' aria-label='sun-icon' onClick={onClick}>
      Sun
    </button>
  ),
  QuestionCircleOutlined: () => <span>?</span>,
}));

jest.mock('@umijs/max', () => ({
  SelectLang: ({
    postLocalesData,
    style,
  }: {
    postLocalesData?: (locales: Array<Record<string, unknown>>) => Array<Record<string, unknown>>;
    style?: Record<string, unknown>;
  }) => {
    renderedLocales = postLocalesData?.(mockAvailableLocales) ?? [];
    return (
      <button data-testid='select-lang' type='button' style={style ?? {}}>
        language selector
      </button>
    );
  },
  useIntl: () => ({
    locale: mockLocale,
    formatMessage: ({ defaultMessage, id }: { defaultMessage?: string; id: string }) => {
      if (mockLocale === 'de-DE' && id === 'component.globalHeader.help.englishFallback') {
        return 'Englische Hilfedokumentation öffnen';
      }
      return defaultMessage ?? id;
    },
  }),
}));

const mockWindowOpen = jest.fn();
const mockHandleClick = jest.fn();

const originalWindowOpen = global.open;

global.open = mockWindowOpen;

afterEach(() => {
  mockWindowOpen.mockClear();
  mockHandleClick.mockClear();
  configProviderThemes.length = 0;
  mockLocale = 'zh-CN';
  renderedLocales = [];
  mockAvailableLocales = defaultAvailableLocales();
});

jest.mock('antd', () => {
  const ConfigProvider = ({ children, theme }: ConfigProviderProps) => {
    configProviderThemes.push(theme.algorithm);
    return <div data-testid='config-provider'>{children}</div>;
  };

  const theme = {
    defaultAlgorithm: 'default-algorithm',
    darkAlgorithm: 'dark-algorithm',
  };

  return {
    ConfigProvider,
    theme,
  };
});

describe('RightContent Components', () => {
  it('renders dark mode toggle with moon icon by default and handles click', () => {
    render(<DarkMode handleClick={mockHandleClick} />);

    const toggle = screen.getByRole('button', { name: 'moon-icon' });

    expect(toggle).toBeInTheDocument();
    expect(configProviderThemes.pop()).toBe('default-algorithm');

    fireEvent.click(toggle);

    expect(mockHandleClick).toHaveBeenCalledTimes(1);
  });

  it('uses sun icon when dark mode is active', () => {
    render(<DarkMode handleClick={mockHandleClick} isDarkMode />);

    const toggle = screen.getByRole('button', { name: 'sun-icon' });

    expect(toggle).toBeInTheDocument();
    expect(configProviderThemes.pop()).toBe('dark-algorithm');

    fireEvent.click(toggle);

    expect(mockHandleClick).toHaveBeenCalledTimes(1);
  });

  it('opens documentation link when question icon is clicked', () => {
    render(<Question />);

    const button = screen.getByRole('button', { name: 'Help' });

    fireEvent.click(button);

    expect(mockWindowOpen).toHaveBeenCalledWith('https://docs.tiangong.earth');
  });

  it('opens the English documentation link when locale starts with en', () => {
    mockLocale = 'en-US';

    render(<Question />);

    fireEvent.click(screen.getByRole('button', { name: 'Help' }));

    expect(mockWindowOpen).toHaveBeenCalledWith('https://docs.tiangong.earth/en');
  });

  it('falls back to the default docs URL when the locale is missing', () => {
    mockLocale = undefined;

    render(<Question />);

    fireEvent.click(screen.getByRole('button', { name: 'Help' }));

    expect(mockWindowOpen).toHaveBeenCalledWith('https://docs.tiangong.earth');
  });

  it('opens explicitly labelled English documentation for the German app locale', () => {
    mockLocale = 'de-DE';

    render(<Question />);

    const helpButton = screen.getByRole('button', {
      name: 'Englische Hilfedokumentation öffnen',
    });
    expect(helpButton).toHaveAttribute('title', 'Englische Hilfedokumentation öffnen');
    fireEvent.click(helpButton);

    expect(mockWindowOpen).toHaveBeenCalledWith('https://docs.tiangong.earth/en');
  });

  it('renders the language selector with padding style', () => {
    render(<SelectLang />);

    const selector = screen.getByTestId('select-lang');

    expect(selector).toBeInTheDocument();
    expect(selector).toHaveStyle({ padding: '4px' });
  });

  it('merges custom styles into the language selector', () => {
    render(<SelectLang style={{ marginLeft: 12 }} />);

    expect(screen.getByTestId('select-lang')).toHaveStyle({
      padding: '4px',
      marginLeft: '12px',
    });
  });

  it('preserves the Umi flag icons for the three product locales', () => {
    render(<SelectLang />);

    expect(renderedLocales).toEqual([
      { lang: 'zh-CN', label: '简体中文', icon: '🇨🇳' },
      { lang: 'en-US', label: 'English', icon: '🇺🇸' },
      { lang: 'de-DE', label: 'Deutsch', icon: '🇩🇪', title: 'Deutsch' },
    ]);
  });

  it('renders the Umi selector directly without an extra action wrapper', () => {
    const { container } = render(<SelectLang />);

    expect(container.firstElementChild).toBe(screen.getByTestId('select-lang'));
  });

  it('synthesizes a supported locale entry when Umi omits one', () => {
    mockAvailableLocales = [
      { lang: 'de-DE', label: 'Deutsch (Deutschland)', icon: '🇩🇪' },
      { lang: 'en-US', label: 'English' },
    ];

    render(<SelectLang />);

    expect(renderedLocales[0]).toEqual({ lang: 'zh-CN' });
  });
});
afterAll(() => {
  global.open = originalWindowOpen;
});
