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
  'aria-hidden'?: boolean;
};

const configProviderThemes: string[] = [];
let mockLocale: string | undefined = 'zh-CN';
let renderedLocales: Array<Record<string, unknown>> = [];
let selectLangReload: boolean | undefined;
let selectLangTrigger: readonly string[] | undefined;
const defaultAvailableLocales = () => [
  { lang: 'de-DE', label: 'Deutsch (Deutschland)', icon: '🇩🇪' },
  { lang: 'en-US', label: 'English', icon: '🇺🇸' },
  { lang: 'zh-CN', label: '简体中文', icon: '🇨🇳' },
  { lang: 'fr-FR', label: 'Français (France)', icon: '🇫🇷' },
];
let mockAvailableLocales: Array<Record<string, unknown>> = defaultAvailableLocales();

jest.mock('@ant-design/icons', () => ({
  MoonOutlined: (props: IconProps) => <span data-testid='moon-icon' {...props} />,
  SunFilled: (props: IconProps) => <span data-testid='sun-icon' {...props} />,
  QuestionCircleOutlined: () => <span>?</span>,
}));

jest.mock('@umijs/max', () => ({
  SelectLang: ({
    globalIconClassName,
    postLocalesData,
    reload,
    style,
    trigger,
  }: {
    globalIconClassName?: string;
    postLocalesData?: (locales: Array<Record<string, unknown>>) => Array<Record<string, unknown>>;
    reload?: boolean;
    style?: Record<string, unknown>;
    trigger?: readonly string[];
  }) => {
    selectLangReload = reload;
    selectLangTrigger = trigger;
    renderedLocales = postLocalesData?.(mockAvailableLocales) ?? [];
    return (
      <button
        className={globalIconClassName}
        data-testid='select-lang'
        type='button'
        style={style ?? {}}
      >
        language selector
      </button>
    );
  },
  useIntl: () => ({
    locale: mockLocale,
    formatMessage: (
      { defaultMessage, id }: { defaultMessage?: string; id: string },
      values?: Record<string, string>,
    ) => {
      if (mockLocale === 'de-DE' && id === 'component.globalHeader.help.fallback') {
        return `Hilfedokumentation (${values?.language})`;
      }
      if (mockLocale === 'fr-FR' && id === 'component.globalHeader.help.fallback') {
        return `Documentation d’aide (${values?.language})`;
      }
      if (mockLocale === 'fr-FR' && id === 'pages.theme.toggleDarkMode') {
        return 'Activer ou désactiver le mode sombre';
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
  selectLangReload = undefined;
  selectLangTrigger = undefined;
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
    Tooltip: ({ children, title }: { children: ReactNode; title: ReactNode }) => (
      <>
        {children}
        <span role='tooltip'>{title}</span>
      </>
    ),
    theme,
  };
});

describe('RightContent Components', () => {
  it('renders dark mode toggle with moon icon by default and handles click', () => {
    render(<DarkMode handleClick={mockHandleClick} />);

    const toggle = screen.getByRole('button', { name: 'Toggle dark mode' });

    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveClass('tg-global-header-help-action');
    expect(screen.getByTestId('moon-icon')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Toggle dark mode');
    expect(configProviderThemes.pop()).toBe('default-algorithm');

    fireEvent.click(toggle);

    expect(mockHandleClick).toHaveBeenCalledTimes(1);
  });

  it('uses sun icon when dark mode is active', () => {
    render(<DarkMode handleClick={mockHandleClick} isDarkMode />);

    const toggle = screen.getByRole('button', { name: 'Toggle dark mode' });

    expect(toggle).toBeInTheDocument();
    expect(screen.getByTestId('sun-icon')).toHaveAttribute('aria-hidden', 'true');
    expect(configProviderThemes.pop()).toBe('dark-algorithm');

    fireEvent.click(toggle);

    expect(mockHandleClick).toHaveBeenCalledTimes(1);
  });

  it('localizes the shared-header dark mode action for French', () => {
    mockLocale = 'fr-FR';

    render(<DarkMode handleClick={mockHandleClick} />);

    const toggle = screen.getByRole('button', {
      name: 'Activer ou désactiver le mode sombre',
    });
    fireEvent.click(toggle);

    expect(screen.getByRole('tooltip')).toHaveTextContent('Activer ou désactiver le mode sombre');
    expect(mockHandleClick).toHaveBeenCalledTimes(1);
  });

  it('opens documentation link when question icon is clicked', () => {
    render(<Question />);

    const button = screen.getByRole('button', { name: 'Help' });

    expect(button).toHaveClass('tg-global-header-help-action');
    expect(button).not.toHaveAttribute('style');
    expect(button).not.toHaveAttribute('title');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Help');
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
      name: 'Hilfedokumentation (English)',
    });
    expect(helpButton).not.toHaveAttribute('title');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Hilfedokumentation (English)');
    fireEvent.click(helpButton);

    expect(mockWindowOpen).toHaveBeenCalledWith('https://docs.tiangong.earth/en');
  });

  it('opens explicitly labelled English documentation for the French app locale', () => {
    mockLocale = 'fr-FR';

    render(<Question />);

    const helpButton = screen.getByRole('button', {
      name: 'Documentation d’aide (English)',
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Documentation d’aide (English)');
    fireEvent.click(helpButton);

    expect(mockWindowOpen).toHaveBeenCalledWith('https://docs.tiangong.earth/en');
  });

  it('renders the language selector with padding style', () => {
    render(<SelectLang />);

    const selector = screen.getByTestId('select-lang');

    expect(selector).toBeInTheDocument();
    expect(selector).toHaveStyle({ padding: '4px' });
    expect(selector).toHaveClass('tg-global-language-selector');
    expect(selectLangReload).toBe(false);
    expect(selectLangTrigger).toEqual(['click']);
  });

  it('merges custom styles into the language selector', () => {
    render(<SelectLang style={{ marginLeft: 12 }} />);

    expect(screen.getByTestId('select-lang')).toHaveStyle({
      padding: '4px',
      marginLeft: '12px',
    });
  });

  it('preserves the Umi flag icons for all product locales', () => {
    render(<SelectLang />);

    expect(renderedLocales).toEqual([
      { lang: 'zh-CN', label: '简体中文', icon: '🇨🇳', title: '简体中文' },
      { lang: 'en-US', label: 'English', icon: '🇺🇸', title: 'English' },
      { lang: 'de-DE', label: 'Deutsch', icon: '🇩🇪', title: 'Deutsch' },
      { lang: 'fr-FR', label: 'Français', icon: '🇫🇷', title: 'Français' },
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

    expect(renderedLocales[0]).toEqual({
      lang: 'zh-CN',
      label: '简体中文',
      title: '简体中文',
    });
  });
});
afterAll(() => {
  global.open = originalWindowOpen;
});
