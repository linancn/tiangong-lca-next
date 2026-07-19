// @ts-nocheck
import Welcome from '@/pages/Welcome';
import { getLang, getLangText } from '@/services/general/util';
import { getSignedStorageFileUrl, getThumbFileUrls } from '@/services/supabase/storage';
import { getTeams } from '@/services/teams/api';
import { act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../helpers/testUtils';

let mockLocale = 'en-US';
const mockHistoryPush = jest.fn();
let mockLocation = { pathname: '/welcome', search: '' };
const mockFormatMessage = ({ defaultMessage, id, values: inlineValues }: any, values?: any) => {
  const localeMessages = mockLocale.startsWith('zh')
    ? jest.requireActual('@/locales/zh-CN/pages_home').default
    : mockLocale.startsWith('de')
      ? jest.requireActual('@/locales/de-DE/pages_home').default
      : mockLocale.startsWith('fr')
        ? jest.requireActual('@/locales/fr-FR/pages_home').default
        : jest.requireActual('@/locales/en-US/pages_home').default;

  const template = localeMessages[id] ?? defaultMessage ?? id;
  const replacements = values ?? inlineValues;
  return replacements
    ? template.replace(/\{([^}]+)\}/gu, (placeholder: string, key: string) =>
        key in replacements ? String(replacements[key]) : placeholder,
      )
    : template;
};

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
  FormattedMessage: (props: any) => mockFormatMessage(props),
  history: {
    push: (...args: any[]) => mockHistoryPush(...args),
  },
  useIntl: () => ({
    locale: mockLocale,
    formatMessage: (props: any, values?: any) => mockFormatMessage(props, values),
  }),
  useLocation: () => mockLocation,
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
  getSignedStorageFileUrl: jest.fn(),
  getThumbFileUrls: jest.fn(),
}));

const mockGetLang = getLang as jest.MockedFunction<any>;
const mockGetLangText = getLangText as jest.MockedFunction<any>;
const mockGetTeams = getTeams as jest.MockedFunction<any>;
const mockGetSignedStorageFileUrl = getSignedStorageFileUrl as jest.MockedFunction<any>;
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
    mockLocation = { pathname: '/welcome', search: '' };
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
    mockGetSignedStorageFileUrl.mockResolvedValue(
      'https://cdn.example/sign/sys-files/video/platform_usage_process_first_matched.mp4?token=signed',
    );
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
    expect(dialog).toHaveStyle({ margin: '0 auto', paddingBottom: '0', top: '16px' });
    expect(dialog.querySelector('.ant-modal-content')).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 'calc(100dvh - 32px)',
      overflow: 'hidden',
    });
    expect(dialog.querySelector('.ant-modal-body')).toHaveStyle({
      minHeight: '0',
      overflowY: 'auto',
    });
    expect(
      screen.getByRole('img', { name: 'TIDAS data system architecture diagram' }),
    ).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByTestId('welcome-tidas-image-language')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Learn more' })).toHaveAttribute(
      'href',
      'https://tidas.tiangong.earth/en/docs/intro',
    );
  });

  it('keeps the team metric at zero when the initial count request fails', async () => {
    mockGetTeams.mockRejectedValueOnce(new Error('team count unavailable'));

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('link', { name: 'Data Teams' })).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('switches the welcome center content to the carbon footprint database guide', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Data Development Guide' }));

    expect(mockHistoryPush).toHaveBeenCalledWith('/welcome?view=carbon-footprint');
    expect(screen.getByText('Operation Demo Video')).toBeInTheDocument();
    expect(screen.getByText('Process Data Development Workflow')).toBeInTheDocument();
    expect(screen.getByText('Data Objects')).toBeInTheDocument();
    expect(screen.getByText('Collect Raw Data')).toBeInTheDocument();
    expect(screen.getByText('Validate And Submit')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View Sample Data/ })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(mockGetSignedStorageFileUrl).toHaveBeenCalledWith(
        '../sys-files/video/platform_usage_process_first_matched.mp4',
      ),
    );
    await waitFor(() =>
      expect(document.querySelector('video source')).toHaveAttribute(
        'src',
        'https://cdn.example/sign/sys-files/video/platform_usage_process_first_matched.mp4?token=signed',
      ),
    );

    expect(mockGetSignedStorageFileUrl).toHaveBeenCalledWith(
      '../sys-files/video/platform_usage_process_first_matched.mp4',
    );

    await user.click(screen.getByRole('button', { name: 'Browse Open Data', exact: true }));
    expect(mockHistoryPush).toHaveBeenCalledWith('/tgdata/flows');

    await user.click(screen.getByRole('button', { name: 'My Data', exact: true }));
    expect(mockHistoryPush).toHaveBeenCalledWith('/mydata/processes');
  });

  it('preserves the carbon footprint query across locale switching and refresh', async () => {
    mockLocation = { pathname: '/welcome', search: '?view=carbon-footprint' };
    let resolveVideoUrl = (url: string): void => {
      void url;
    };
    mockGetSignedStorageFileUrl
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveVideoUrl = resolve;
          }),
      )
      .mockResolvedValueOnce(
        'https://cdn.example/sign/sys-files/video/platform_usage_process_first_matched.mp4?token=refresh',
      );

    const { rerender, unmount } = renderWithProviders(<Welcome />);

    expect(screen.getByText('TianGong Life Cycle Database')).toBeInTheDocument();
    expect(screen.getByText('Operation Demo Video')).toBeInTheDocument();
    expect(screen.queryByText('Unit Processes & Inventories')).not.toBeInTheDocument();

    mockLocale = 'fr-FR';
    mockGetLang.mockReturnValue('en');
    rerender(<Welcome />);

    expect(screen.getByText('TianGong Life Cycle Database')).toBeInTheDocument();
    expect(screen.getByText('Vidéo de démonstration')).toBeInTheDocument();
    expect(screen.getByText('Chargement de la vidéo…')).toBeInTheDocument();
    expect(screen.queryByText('Processus élémentaires et inventaires')).not.toBeInTheDocument();
    expect(mockHistoryPush).not.toHaveBeenCalled();

    await act(async () => {
      resolveVideoUrl(
        'https://cdn.example/sign/sys-files/video/platform_usage_process_first_matched.mp4?token=switched',
      );
    });
    await waitFor(() =>
      expect(document.querySelector('video source')).toHaveAttribute(
        'src',
        'https://cdn.example/sign/sys-files/video/platform_usage_process_first_matched.mp4?token=switched',
      ),
    );

    unmount();
    renderWithProviders(<Welcome />);

    expect(screen.getByText('Vidéo de démonstration')).toBeInTheDocument();
    expect(screen.queryByText('Processus élémentaires et inventaires')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(document.querySelector('video source')).toHaveAttribute(
        'src',
        'https://cdn.example/sign/sys-files/video/platform_usage_process_first_matched.mp4?token=refresh',
      ),
    );
  });

  it('shows the video fallback when the signed URL is unavailable', async () => {
    const user = userEvent.setup();
    mockGetSignedStorageFileUrl.mockResolvedValueOnce('');

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Data Development Guide' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Video failed to load');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(document.querySelector('video source')).not.toBeInTheDocument();
  });

  it('shows the video fallback when signed URL loading fails', async () => {
    const user = userEvent.setup();
    mockGetSignedStorageFileUrl.mockRejectedValueOnce(new Error('signed url failed'));

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Data Development Guide' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Video failed to load');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(document.querySelector('video source')).not.toBeInTheDocument();
  });

  it('allows reloading the video after playback fails', async () => {
    const user = userEvent.setup();
    mockLocale = 'fr-FR';
    mockGetLang.mockReturnValue('en');
    mockGetSignedStorageFileUrl
      .mockResolvedValueOnce(
        'https://cdn.example/sign/sys-files/video/platform_usage_process_first_matched.mp4?token=first',
      )
      .mockResolvedValueOnce(
        'https://cdn.example/sign/sys-files/video/platform_usage_process_first_matched.mp4?token=retry',
      );

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Guide de développement des données' }));

    await waitFor(() =>
      expect(document.querySelector('video source')).toHaveAttribute(
        'src',
        'https://cdn.example/sign/sys-files/video/platform_usage_process_first_matched.mp4?token=first',
      ),
    );

    fireEvent.error(document.querySelector('video source') as HTMLSourceElement);

    expect(await screen.findByRole('alert')).toHaveTextContent('Échec du chargement de la vidéo');

    await user.click(screen.getByRole('button', { name: 'Recharger' }));

    await waitFor(() => expect(mockGetSignedStorageFileUrl).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(document.querySelector('video source')).toHaveAttribute(
        'src',
        'https://cdn.example/sign/sys-files/video/platform_usage_process_first_matched.mp4?token=retry',
      ),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the overview active when the route location has no search string', async () => {
    mockLocation = { pathname: '/welcome' } as any;

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Unit Processes & Inventories')).toBeInTheDocument();
    expect(screen.queryByText('Operation Demo Video')).not.toBeInTheDocument();
  });

  it('uses the default locale definition when the runtime locale is unsupported', async () => {
    const user = userEvent.setup();
    mockLocale = 'es-ES';

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'TIDAS Architecture' }));

    expect(
      await screen.findByRole('img', { name: 'TIDAS data system architecture diagram' }),
    ).toHaveAttribute('src', '/images/tidas/TIDAS-zh-CN.svg');
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
    expect(screen.getByRole('status')).toHaveTextContent('No data teams are available yet.');
  });

  it('shows a localized team-load error and retries successfully', async () => {
    const user = userEvent.setup();
    mockGetTeams
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({ success: false, data: [] })
      .mockResolvedValueOnce({ success: true, data: teamsPayload });

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'TianGong Data Ecosystem' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Data teams could not be loaded.');
    await user.click(screen.getByRole('button', { name: /Try again/ }));

    expect(await screen.findByText('Team Alpha')).toBeInTheDocument();
    expect(mockGetTeams).toHaveBeenCalledTimes(3);
  });

  it('switches to localized dark-mode TIDAS assets for zh locales', async () => {
    const user = userEvent.setup();
    mockLocale = 'zh-CN';
    mockGetLang.mockReturnValue('zh');
    localStorage.setItem('isDarkMode', 'true');

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'TIDAS 数据体系架构' }));

    const tidasImage = await screen.findByAltText('TIDAS 数据体系架构图');
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

    const tidasImage = await screen.findByAltText('TIDAS 数据体系架构图');
    expect(tidasImage).toHaveAttribute('src', '/images/tidas/TIDAS-zh-CN.svg');
  });

  it('localizes the French overview and modal copy while preserving TIDAS fallbacks', async () => {
    const user = userEvent.setup();
    mockLocale = 'fr-FR';
    mockGetLang.mockReturnValue('en');
    localStorage.setItem('isDarkMode', 'true');
    mockGetTeams.mockResolvedValue({ success: true });

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Processus élémentaires et inventaires')).toBeInTheDocument();
    expect(screen.getByText('Normes et conformité')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Architecture TIDAS' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Écosystème de données TianGong' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Standards & Compliance')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Écosystème de données TianGong' }));
    expect(
      await screen.findByText(
        'Un réseau mondial de partenaires spécialisés dans les données de cycle de vie.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Architecture TIDAS' }));

    const tidasImage = await screen.findByAltText(
      'Schéma de l’architecture du système de données TIDAS',
    );
    expect(tidasImage).toHaveAttribute('src', '/images/tidas/TIDAS-en-dark.svg');
    expect(tidasImage).toHaveAttribute('aria-describedby', 'welcome-tidas-image-language');
    expect(screen.getByTestId('welcome-tidas-image-language')).toHaveTextContent(
      'Langue du schéma : English',
    );
    expect(
      screen.getByText(/Un écosystème ouvert fondé sur des paquets de données modulaires/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'En savoir plus (English)' })).toHaveAttribute(
      'href',
      'https://tidas.tiangong.earth/en/docs/intro',
    );
  });

  it('discloses both German TIDAS resource fallbacks without relabelling them as German', async () => {
    const user = userEvent.setup();
    mockLocale = 'de-DE';
    mockGetLang.mockReturnValue('de');

    renderWithProviders(<Welcome />);

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'TIDAS-Architektur' }));

    const tidasImage = await screen.findByAltText('Architektur des TIDAS-Datensystems');
    expect(tidasImage).toHaveAttribute('src', '/images/tidas/TIDAS-en.svg');
    expect(screen.getByTestId('welcome-tidas-image-language')).toHaveTextContent(
      'Sprache der Abbildung: English',
    );
    expect(screen.getByRole('link', { name: 'Mehr erfahren (English)' })).toHaveAttribute(
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
