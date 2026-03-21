// @ts-nocheck
import Welcome from '@/pages/Welcome';
import { getLang, getLangText } from '@/services/general/util';
import { getThumbFileUrls } from '@/services/supabase/storage';
import { getTeams } from '@/services/teams/api';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../helpers/testUtils';

let mockLocale = 'en-US';
const mockHistoryPush = jest.fn();

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
  PageContainer: ({ children }: any) => <div data-testid='page-container'>{children}</div>,
}));

jest.mock('react-countup', () => ({
  __esModule: true,
  default: ({ end }: any) => <span>{String(end)}</span>,
}));

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  history: {
    push: (...args: any[]) => mockHistoryPush(...args),
  },
  useIntl: () => ({
    locale: mockLocale,
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLang: jest.fn((locale: string) => (locale?.startsWith('zh') ? 'zh' : 'en')),
  getLangText: jest.fn((value: any) => {
    if (Array.isArray(value)) {
      return (
        value.find((item) => item['@xml:lang'] === 'en')?.['#text'] ?? value[0]?.['#text'] ?? ''
      );
    }
    return value ?? '';
  }),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeams: jest.fn(),
}));

jest.mock('@/services/supabase/storage', () => ({
  __esModule: true,
  getThumbFileUrls: jest.fn(),
}));

const mockGetLang = getLang as jest.MockedFunction<any>;
const mockGetLangText = getLangText as jest.MockedFunction<any>;
const mockGetTeams = getTeams as jest.MockedFunction<any>;
const mockGetThumbFileUrls = getThumbFileUrls as jest.MockedFunction<any>;
const originalLocation = window.location;

const teamsPayload = [
  {
    id: 'team-1',
    json: {
      title: [{ '@xml:lang': 'en', '#text': 'Team Alpha' }],
      description: [{ '@xml:lang': 'en', '#text': 'Alpha description' }],
      lightLogo: '../sys-files/light-alpha.svg',
      darkLogo: '../sys-files/dark-alpha.svg',
    },
  },
  {
    id: 'team-2',
    json: {
      title: [{ '@xml:lang': 'en', '#text': 'Team Beta' }],
      description: [{ '@xml:lang': 'en', '#text': 'Beta description' }],
    },
  },
];

describe('Welcome page', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        href: 'http://localhost:8000/',
        assign: jest.fn(),
        replace: jest.fn(),
      } as unknown as Location,
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockHistoryPush.mockReset();
    localStorage.clear();
    localStorage.setItem('isDarkMode', 'false');
    window.location.href = 'http://localhost:8000/';
    mockLocale = 'en-US';
    mockGetLang.mockReturnValue('en');
    mockGetLangText.mockImplementation((value: any) => {
      if (Array.isArray(value)) {
        return (
          value.find((item) => item['@xml:lang'] === 'en')?.['#text'] ?? value[0]?.['#text'] ?? ''
        );
      }
      return value ?? '';
    });
    mockGetTeams.mockResolvedValue({
      success: true,
      data: teamsPayload,
    });
    mockGetThumbFileUrls.mockResolvedValue([{ status: 'done', thumbUrl: 'thumb-url' }]);
  });

  it('loads the team count on mount and opens the TIDAS architecture modal', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('page-container')).toBeInTheDocument();
    expect(screen.getByText('Data Teams')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'TIDAS Architecture' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /tianGong lca data platform/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Learn more' })).toHaveAttribute(
      'href',
      'https://tidas.tiangong.earth/en/docs/intro',
    );
  });

  it('loads ecosystem teams with thumbnails and reuses cached teams across reopen', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'TianGong Data Ecosystem' }));

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockGetThumbFileUrls).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.getByText('Alpha description')).toBeInTheDocument();
    expect(screen.getByText('Team Beta')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'TianGong Data Ecosystem' }));

    await waitFor(() => expect(screen.getByText('Team Alpha')).toBeInTheDocument());
    expect(mockGetTeams).toHaveBeenCalledTimes(3);
  });

  it('navigates to the team models page when an ecosystem card is clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'TianGong Data Ecosystem' }));

    await waitFor(() => expect(screen.getByText('Team Alpha')).toBeInTheDocument());

    const teamCard = screen.getByText('Team Alpha').closest('.ant-card');
    expect(teamCard).not.toBeNull();
    await user.click(teamCard as Element);

    expect(mockHistoryPush).toHaveBeenCalledWith('/tgdata/models?tid=team-1');
  });

  it('renders an empty ecosystem list without thumbnail lookups when no teams are returned', async () => {
    const user = userEvent.setup();
    mockGetTeams.mockResolvedValue({
      success: true,
      data: [],
    });

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'TianGong Data Ecosystem' }));

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(2));
    expect(mockGetThumbFileUrls).not.toHaveBeenCalled();
    expect(screen.queryByText('Team Alpha')).not.toBeInTheDocument();
  });

  it('switches to localized dark-mode TIDAS assets for zh locales', async () => {
    const user = userEvent.setup();
    mockLocale = 'zh-CN';
    mockGetLang.mockReturnValue('zh');
    localStorage.setItem('isDarkMode', 'true');

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'TIDAS 数据体系架构' }));

    const tidasImage = await screen.findByAltText(/天工LCA数据平台/);
    expect(tidasImage).toHaveAttribute('src', '/images/tidas/TIDAS-zh-CN-dark.svg');
    expect(screen.getByRole('link', { name: '了解更多' })).toHaveAttribute(
      'href',
      'https://tidas.tiangong.earth/docs/intro',
    );
  });

  it('uses the zh light-mode TIDAS asset when dark mode is off', async () => {
    const user = userEvent.setup();
    mockLocale = 'zh-CN';
    mockGetLang.mockReturnValue('zh');
    localStorage.setItem('isDarkMode', 'false');

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'TIDAS 数据体系架构' }));

    const tidasImage = await screen.findByAltText(/天工LCA数据平台/);
    expect(tidasImage).toHaveAttribute('src', '/images/tidas/TIDAS-zh-CN.svg');
  });

  it('falls back to english TIDAS content and a zero team count when locale and team data are missing', async () => {
    const user = userEvent.setup();
    mockLocale = 'fr-FR';
    mockGetLang.mockReturnValue('fr');
    localStorage.setItem('isDarkMode', 'true');
    mockGetTeams.mockResolvedValue({ success: true });

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
    expect(screen.getByText('0')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'TIDAS Architecture' }));

    const tidasImage = await screen.findByAltText(/TianGong LCA Data Platform/i);
    expect(tidasImage).toHaveAttribute('src', '/images/tidas/TIDAS-en-dark.svg');
    expect(screen.getByRole('link', { name: 'Learn more' })).toHaveAttribute(
      'href',
      'https://tidas.tiangong.earth/en/docs/intro',
    );
  });

  it('prefers inline dark preview logos and renders ecosystem cards without team ids', async () => {
    const user = userEvent.setup();
    localStorage.setItem('isDarkMode', 'true');
    mockGetTeams.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'team-dark',
          json: {
            title: [{ '@xml:lang': 'en', '#text': 'Team Dark' }],
            description: [{ '@xml:lang': 'en', '#text': 'Dark description' }],
            previewLightUrl: 'https://cdn.example/light-preview.png',
            previewDarkUrl: 'https://cdn.example/dark-preview.png',
          },
        },
        {
          json: {
            title: [{ '@xml:lang': 'en', '#text': 'Team Without Id' }],
            description: [{ '@xml:lang': 'en', '#text': 'No id description' }],
          },
        },
      ],
    });

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'TianGong Data Ecosystem' }));

    await waitFor(() => expect(screen.getByText('Team Dark')).toBeInTheDocument());
    expect(screen.getByText('Team Without Id')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Team Dark' })).toHaveAttribute(
      'src',
      'https://cdn.example/dark-preview.png',
    );
    expect(mockGetThumbFileUrls).not.toHaveBeenCalled();
  });

  it('falls back to the viewport width when the computed modal width would be non-positive', async () => {
    const user = userEvent.setup();
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 0,
      writable: true,
    });

    try {
      renderWithProviders(<Welcome />);

      await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
      await user.click(screen.getByRole('button', { name: 'TIDAS Architecture' }));

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
        writable: true,
      });
    }
  });

  it('closes the TIDAS modal from the modal close control', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'TIDAS Architecture' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
