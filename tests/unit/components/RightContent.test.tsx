/**
 * Tests for RightContent components
 * Path: src/components/RightContent/index.tsx
 */

import { DarkMode, Question, SelectLang, SelectLangAction } from '@/components/RightContent';
import { MANUAL_LOCALE_STORAGE_KEY } from '@/services/general/runtimeLocale';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { brandProfile } from '../../../config/brandProfile';

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
let selectLangOnItemClick: ((event: { key: string }) => void) | undefined;
const mockSetIntl = jest.fn();
const mockEmit = jest.fn();
jest.mock('@@/plugin-locale/localeExports', () => ({
  event: { emit: (...args: unknown[]) => mockEmit(...args) },
  LANG_CHANGE_EVENT: 'language-change',
  setIntl: (...args: unknown[]) => mockSetIntl(...args),
}));
const defaultAvailableLocales = () => [
  { lang: 'de-DE', label: 'Deutsch (Deutschland)', icon: '🇩🇪' },
  { lang: 'en-US', label: 'English', icon: '🇺🇸' },
  { lang: 'zh-CN', label: '简体中文', icon: '🇨🇳' },
  { lang: 'fr-FR', label: 'Français (France)', icon: '🇫🇷' },
];
let mockAvailableLocales: Array<Record<string, unknown>> = defaultAvailableLocales();

jest.mock('@ant-design/icons', () => ({
  ...jest.requireActual('@ant-design/icons'),
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
    onItemClick,
  }: {
    globalIconClassName?: string;
    postLocalesData?: (locales: Array<Record<string, unknown>>) => Array<Record<string, unknown>>;
    reload?: boolean;
    style?: Record<string, unknown>;
    trigger?: readonly string[];
    onItemClick?: (event: { key: string }) => void;
  }) => {
    selectLangOnItemClick = onItemClick;
    selectLangReload = reload;
    selectLangTrigger = trigger;
    renderedLocales = postLocalesData?.(mockAvailableLocales) ?? [];
    return (
      <span className={globalIconClassName} data-testid='select-lang' style={style ?? {}}>
        language selector
      </span>
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
  selectLangOnItemClick = undefined;
  mockSetIntl.mockClear();
  mockEmit.mockClear();
  window.localStorage.clear();
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
    Dropdown: jest.requireActual('antd').Dropdown,
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

  it.each([
    ['zh-CN', 'Help', 'https://docs.tiangong.earth'],
    ['en-US', 'Help', 'https://docs.tiangong.earth/en'],
    [undefined, 'Help', 'https://docs.tiangong.earth/en'],
    ['de-DE', 'Hilfedokumentation (English)', 'https://docs.tiangong.earth/en'],
    ['fr-FR', 'Documentation d’aide (English)', 'https://docs.tiangong.earth/en'],
  ])(
    'keeps documentation routing and fallback labels in the %s help menu',
    async (locale, label, url) => {
      mockLocale = locale;
      const user = userEvent.setup();
      render(<Question />);

      const button = screen.getByRole('button', { name: 'Help and about' });
      expect(button).toHaveClass('tg-global-header-help-action');
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
      expect(button).not.toHaveAttribute('style');
      expect(screen.getByRole('tooltip')).toHaveTextContent('Help and about');
      await user.click(button);

      const documentation = await screen.findByRole('link', { name: label });
      expect(documentation).toHaveAttribute('href', url);
      expect(documentation).toHaveAttribute('target', '_blank');
      expect(documentation).toHaveAttribute('rel', 'noopener noreferrer');
      expect(mockWindowOpen).not.toHaveBeenCalled();
      await user.click(button);
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    },
  );

  it('relocates brand links and copyright into the keyboard-accessible global menu', async () => {
    const user = userEvent.setup();
    render(<Question />);
    const button = screen.getByRole('button', { name: 'Help and about' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    button.focus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'true');

    const source = await screen.findByRole('link', { name: 'GitHub' });
    expect(source).toHaveAttribute('href', brandProfile.links.source);
    expect(source).toHaveAttribute('rel', 'noopener noreferrer');
    const homepage = screen.getByRole('link', { name: brandProfile.displayName });
    expect(homepage).toHaveAttribute('href', brandProfile.links.homepage);
    expect(homepage).toHaveAttribute('target', '_blank');
    await waitFor(() => expect(screen.getByText(`© ${brandProfile.displayName}`)).toBeVisible());
    homepage.addEventListener('click', (event) => event.preventDefault());
    await user.click(homepage);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders the language selector with padding style', () => {
    render(<SelectLang />);

    const selector = screen.getByTestId('select-lang');

    expect(selector).toBeInTheDocument();
    expect(selector).toHaveStyle({ padding: '4px' });
    expect(selector).toHaveClass('tg-global-language-selector');
    expect(selectLangReload).toBe(false);
    expect(selectLangTrigger).toEqual(['click']);
    expect(window.localStorage.getItem(MANUAL_LOCALE_STORAGE_KEY)).toBeNull();
  });

  it('records a manual selection before emitting the native Umi change', () => {
    window.localStorage.setItem(MANUAL_LOCALE_STORAGE_KEY, 'zh-CN');
    mockEmit.mockImplementationOnce(() => {
      expect(window.localStorage.getItem(MANUAL_LOCALE_STORAGE_KEY)).toBe('fr-FR');
    });
    render(<SelectLang />);
    selectLangOnItemClick?.({ key: 'fr-FR' });
    expect(mockSetIntl).toHaveBeenCalledWith('fr-FR');
    expect(mockEmit).toHaveBeenCalledWith('language-change', 'fr-FR');
    expect(window.localStorage.getItem(MANUAL_LOCALE_STORAGE_KEY)).toBe('fr-FR');
  });

  it('records an explicit choice even when the selected locale already matches', () => {
    render(<SelectLang />);
    selectLangOnItemClick?.({ key: 'zh-CN' });
    expect(window.localStorage.getItem(MANUAL_LOCALE_STORAGE_KEY)).toBe('zh-CN');
  });

  it('rejects an unsupported menu key and tolerates denied preference storage', () => {
    render(<SelectLang />);
    selectLangOnItemClick?.({ key: 'es-ES' });
    expect(mockSetIntl).not.toHaveBeenCalled();
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage denied');
    });
    try {
      expect(() => selectLangOnItemClick?.({ key: 'de-DE' })).not.toThrow();
      expect(mockSetIntl).toHaveBeenCalledWith('de-DE');
    } finally {
      setItem.mockRestore();
    }
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

  it('wraps the global language selector in one named keyboard button', () => {
    render(<SelectLangAction />);

    const action = screen.getByRole('button', { name: 'Select a language' });
    const selector = screen.getByTestId('select-lang');
    const innerClick = jest.fn();
    selector.addEventListener('click', innerClick);
    expect(action).toHaveClass('tg-global-language-action');
    expect(action).toHaveAttribute('aria-haspopup', 'menu');
    expect(selector).toBeInTheDocument();

    fireEvent.click(action);
    expect(innerClick).toHaveBeenCalledTimes(1);
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
