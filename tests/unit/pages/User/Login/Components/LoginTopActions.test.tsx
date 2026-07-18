// @ts-nocheck
import LoginTopActions from '@/pages/User/Login/Components/LoginTopActions';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../../../helpers/testUtils';

let mockLocale = 'zh-CN';
const mockSelectLangTrigger = jest.fn();
let mockColorTextTertiary = '#777';
let mockColorTextSecondary = '#666';

jest.mock('umi', () => ({
  __esModule: true,
  useIntl: () => ({
    locale: mockLocale,
    formatMessage: ({ defaultMessage, id }: any) => {
      if (mockLocale === 'de-DE' && id === 'component.globalHeader.help.englishFallback') {
        return 'Englische Hilfedokumentation öffnen';
      }
      if (mockLocale === 'fr-FR' && id === 'component.globalHeader.help.englishFallback') {
        return 'Ouvrir la documentation d’aide (en anglais)';
      }
      if (mockLocale === 'fr-FR' && id === 'pages.theme.toggleDarkMode') {
        return 'Activer ou désactiver le mode sombre';
      }
      return defaultMessage ?? id;
    },
  }),
}));

jest.mock('@/components/RightContent', () => ({
  __esModule: true,
  DarkMode: ({ handleClick, isDarkMode }: any) => (
    <button
      type='button'
      aria-label={
        mockLocale === 'fr-FR' ? 'Activer ou désactiver le mode sombre' : 'Toggle dark mode'
      }
      onClick={handleClick}
    >
      {isDarkMode ? 'dark-on' : 'dark-off'}
    </button>
  ),
  SelectLang: ({ style }: any) => (
    <span data-testid='select-lang-trigger' style={style} onClick={mockSelectLangTrigger}>
      select-lang-trigger
    </span>
  ),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  QuestionCircleOutlined: () => <span>help-icon</span>,
}));

jest.mock('antd', () => ({
  __esModule: true,
  ConfigProvider: ({ children }: any) => <>{children}</>,
  theme: {
    useToken: () => ({
      token: {
        borderRadius: 8,
        colorTextSecondary: mockColorTextSecondary,
        colorTextTertiary: mockColorTextTertiary,
        colorBgTextHover: '#eee',
      },
    }),
  },
}));

describe('LoginTopActions', () => {
  const originalWindowOpen = window.open;

  beforeEach(() => {
    jest.clearAllMocks();
    window.open = jest.fn();
    mockLocale = 'zh-CN';
    mockColorTextTertiary = '#777';
    mockColorTextSecondary = '#666';
  });

  afterAll(() => {
    window.open = originalWindowOpen;
  });

  it('calls the dark mode toggle callback', async () => {
    const onDarkModeToggle = jest.fn();

    renderWithProviders(<LoginTopActions isDarkMode={false} onDarkModeToggle={onDarkModeToggle} />);

    await userEvent.hover(screen.getByTestId('login-dark-mode'));
    await userEvent.unhover(screen.getByTestId('login-dark-mode'));
    await userEvent.click(screen.getByRole('button', { name: 'Toggle dark mode' }));

    expect(onDarkModeToggle).toHaveBeenCalledTimes(1);
    expect(screen.getByText('dark-off')).toBeInTheDocument();
  });

  it('forwards clicks from the language frame to the inner language trigger', async () => {
    renderWithProviders(<LoginTopActions isDarkMode={true} onDarkModeToggle={jest.fn()} />);

    await userEvent.hover(screen.getByTestId('login-language'));
    await userEvent.unhover(screen.getByTestId('login-language'));
    await userEvent.click(screen.getByRole('button', { name: 'Select a language' }));

    expect(mockSelectLangTrigger).toHaveBeenCalledTimes(1);
    expect(screen.getByText('dark-on')).toBeInTheDocument();
  });

  it('keeps the login-only language action aligned to the 28px action frame', () => {
    renderWithProviders(<LoginTopActions isDarkMode={false} onDarkModeToggle={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Select a language' })).toHaveStyle({
      padding: '6px',
      minWidth: '28px',
      minHeight: '28px',
    });
    expect(screen.getByTestId('select-lang-trigger')).toHaveStyle({
      padding: '0',
      fontSize: '16px',
      lineHeight: '1',
    });
  });

  it('supports keyboard access for dark mode, language, and help actions', async () => {
    const onDarkModeToggle = jest.fn();
    renderWithProviders(<LoginTopActions isDarkMode={false} onDarkModeToggle={onDarkModeToggle} />);

    screen.getByRole('button', { name: 'Toggle dark mode' }).focus();
    await userEvent.keyboard('{Enter}');
    screen.getByRole('button', { name: 'Select a language' }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    screen.getByRole('button', { name: 'Open help documentation' }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onDarkModeToggle).toHaveBeenCalledTimes(1);
    expect(mockSelectLangTrigger).toHaveBeenCalledTimes(2);
    expect(window.open).toHaveBeenCalledWith('https://docs.tiangong.earth');
    expect(window.open).toHaveBeenCalledTimes(2);
  });

  it('keeps native language-trigger behavior when clicking the inner trigger directly', async () => {
    renderWithProviders(<LoginTopActions isDarkMode={false} onDarkModeToggle={jest.fn()} />);

    await userEvent.click(screen.getByTestId('select-lang-trigger'));

    expect(mockSelectLangTrigger).toHaveBeenCalledTimes(1);
  });

  it('opens the localized docs url from the help action', async () => {
    mockLocale = 'en-US';

    renderWithProviders(<LoginTopActions isDarkMode={false} onDarkModeToggle={jest.fn()} />);

    await userEvent.hover(screen.getByTestId('login-help'));
    await userEvent.unhover(screen.getByTestId('login-help'));
    await userEvent.click(screen.getByRole('button', { name: 'Open help documentation' }));

    expect(window.open).toHaveBeenCalledWith('https://docs.tiangong.earth/en');
  });

  it('opens the default zh docs url when locale is not English', async () => {
    renderWithProviders(<LoginTopActions isDarkMode={false} onDarkModeToggle={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Open help documentation' }));

    expect(window.open).toHaveBeenCalledWith('https://docs.tiangong.earth');
  });

  it('opens explicitly labelled English docs for German without inventing a /de route', async () => {
    mockLocale = 'de-DE';

    renderWithProviders(<LoginTopActions isDarkMode={false} onDarkModeToggle={jest.fn()} />);

    const helpAction = screen.getByRole('button', {
      name: 'Englische Hilfedokumentation öffnen',
    });
    expect(helpAction).toHaveAttribute('title', 'Englische Hilfedokumentation öffnen');
    await userEvent.click(helpAction);

    expect(window.open).toHaveBeenCalledWith('https://docs.tiangong.earth/en');
  });

  it('opens explicitly labelled English docs for French without inventing a /fr route', async () => {
    mockLocale = 'fr-FR';

    renderWithProviders(<LoginTopActions isDarkMode={false} onDarkModeToggle={jest.fn()} />);

    const helpAction = screen.getByRole('button', {
      name: 'Ouvrir la documentation d’aide (en anglais)',
    });
    expect(
      screen.getByRole('button', { name: 'Activer ou désactiver le mode sombre' }),
    ).toBeInTheDocument();
    expect(helpAction).toHaveAttribute('title', 'Ouvrir la documentation d’aide (en anglais)');
    await userEvent.click(helpAction);

    expect(window.open).toHaveBeenCalledWith('https://docs.tiangong.earth/en');
  });

  it('falls back to secondary text color and zh locale when optional token or locale values are missing', async () => {
    mockLocale = undefined as any;
    mockColorTextTertiary = undefined as any;

    renderWithProviders(<LoginTopActions isDarkMode={false} onDarkModeToggle={jest.fn()} />);

    expect(screen.getByTestId('login-dark-mode')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open help documentation' }));
    expect(window.open).toHaveBeenCalledWith('https://docs.tiangong.earth');
  });
});
