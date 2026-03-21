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
  }),
}));

jest.mock('@/components/RightContent', () => ({
  __esModule: true,
  DarkMode: ({ isDarkMode }: any) => <span>{isDarkMode ? 'dark-on' : 'dark-off'}</span>,
  SelectLang: () => (
    <button type='button' onClick={mockSelectLangTrigger}>
      select-lang-trigger
    </button>
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
    await userEvent.click(screen.getByRole('button', { name: 'toggle-dark-mode' }));

    expect(onDarkModeToggle).toHaveBeenCalledTimes(1);
    expect(screen.getByText('dark-off')).toBeInTheDocument();
  });

  it('forwards clicks from the language frame to the inner language trigger', async () => {
    renderWithProviders(<LoginTopActions isDarkMode={true} onDarkModeToggle={jest.fn()} />);

    await userEvent.hover(screen.getByTestId('login-language'));
    await userEvent.unhover(screen.getByTestId('login-language'));
    await userEvent.click(screen.getByRole('button', { name: 'open-language-menu' }));

    expect(mockSelectLangTrigger).toHaveBeenCalledTimes(1);
    expect(screen.getByText('dark-on')).toBeInTheDocument();
  });

  it('keeps native language-trigger behavior when clicking the inner trigger directly', async () => {
    renderWithProviders(<LoginTopActions isDarkMode={false} onDarkModeToggle={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'select-lang-trigger' }));

    expect(mockSelectLangTrigger).toHaveBeenCalledTimes(1);
  });

  it('opens the localized docs url from the help action', async () => {
    mockLocale = 'en-US';

    renderWithProviders(<LoginTopActions isDarkMode={false} onDarkModeToggle={jest.fn()} />);

    await userEvent.hover(screen.getByTestId('login-help'));
    await userEvent.unhover(screen.getByTestId('login-help'));
    await userEvent.click(screen.getByRole('button', { name: 'open-help-docs' }));

    expect(window.open).toHaveBeenCalledWith('https://docs.tiangong.earth/en');
  });

  it('opens the default zh docs url when locale is not English', async () => {
    renderWithProviders(<LoginTopActions isDarkMode={false} onDarkModeToggle={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'open-help-docs' }));

    expect(window.open).toHaveBeenCalledWith('https://docs.tiangong.earth');
  });

  it('falls back to secondary text color and zh locale when optional token or locale values are missing', async () => {
    mockLocale = undefined as any;
    mockColorTextTertiary = undefined as any;

    renderWithProviders(<LoginTopActions isDarkMode={false} onDarkModeToggle={jest.fn()} />);

    expect(screen.getByTestId('login-dark-mode')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'open-help-docs' }));
    expect(window.open).toHaveBeenCalledWith('https://docs.tiangong.earth');
  });
});
