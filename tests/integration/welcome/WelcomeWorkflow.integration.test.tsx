/**
 * Welcome workflow integration tests
 * User paths covered:
 * - Visitor scans homepage hero metrics, then opens the Data Ecosystem modal via the Data Teams link and sees team thumbnails hydrated from getTeams + getThumbFileUrls
 * - Visitor launches a team entry from the modal and is redirected to the team models listing
 * - Visitor in dark mode sees dark-themed thumbnails; empty team responses keep the modal responsive without spinner lockups
 * Services touched under test: getTeams, getThumbFileUrls
 */

jest.mock('umi', () => require('@/tests/mocks/umi').createUmiMock());

jest.mock('react-countup', () => ({
  __esModule: true,
  default: ({ end }: { end: number }) => <span data-testid='countup-value'>{end}</span>,
}));

jest.mock('@ant-design/pro-components', () =>
  require('@/tests/mocks/proComponents').createProComponentsMock(),
);

jest.mock('antd', () => require('@/tests/mocks/antd').createAntdMock());

jest.mock('@/services/teams/api', () => ({
  getTeams: jest.fn(),
}));

jest.mock('@/services/supabase/storage', () => ({
  getThumbFileUrls: jest.fn(),
}));

import Welcome from '@/pages/Welcome';
import { getThumbFileUrls } from '@/services/supabase/storage';
import { getTeams } from '@/services/teams/api';
import userEvent from '@testing-library/user-event';
import { mockTeam } from '../../helpers/testData';
import { renderWithProviders, screen, waitFor, within } from '../../helpers/testUtils';
import { resetAntdToken, setAntdToken } from '../../mocks/antd';

type TeamLangText = { '@xml:lang': string; '#text': string };
type TeamJson = {
  title: TeamLangText[];
  description?: string | TeamLangText[];
  lightLogo?: string;
  darkLogo?: string;
  previewLightUrl?: string;
  previewDarkUrl?: string;
  [key: string]: unknown;
};

type TeamRecord = {
  id: string;
  json: TeamJson;
  rank?: number;
  is_public?: boolean;
  created_at?: string;
  user_id?: string;
  ownerEmail?: string;
  [key: string]: unknown;
};

type GetTeamsResult = { data: TeamRecord[]; success: boolean };
type GetTeamsMock = jest.Mock<Promise<GetTeamsResult>, []>;

type ThumbFileUrl = {
  status: string;
  thumbUrl?: string;
  uid?: string;
  name?: string;
  url?: string;
};
type GetThumbFileUrlsMock = jest.Mock<Promise<ThumbFileUrl[]>, [fileList: unknown]>;

const mockGetTeams = getTeams as unknown as GetTeamsMock;
const mockGetThumbFileUrls = getThumbFileUrls as unknown as GetThumbFileUrlsMock;

const baseTeamJson: Partial<TeamJson> = {
  lightLogo: '../sys-files/light.svg',
  darkLogo: '../sys-files/dark.svg',
  description: [
    { '@xml:lang': 'en', '#text': 'Test team description' },
    { '@xml:lang': 'zh', '#text': '测试团队描述' },
  ],
};

const buildTeam = (overrides: Partial<TeamRecord> = {}): TeamRecord => {
  const base = mockTeam as unknown as TeamRecord;
  return {
    ...base,
    ...overrides,
    json: {
      ...base.json,
      ...baseTeamJson,
      ...(overrides.json ?? {}),
    },
  };
};

const flushTeamsLoading = () => waitFor(() => expect(mockGetTeams).toHaveBeenCalled());

describe('WelcomeWorkflow integration', () => {
  const originalLocation = window.location;

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost/',
        assign: jest.fn(),
        replace: jest.fn(),
      } as unknown as Location,
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetAntdToken();
    localStorage.clear();
    window.location.href = 'http://localhost/';
  });

  it('opens Data Ecosystem modal, resolves teams, and navigates to team models', async () => {
    localStorage.setItem('isDarkMode', 'false');

    mockGetTeams.mockResolvedValue({
      data: [buildTeam()],
      success: true,
    });
    mockGetThumbFileUrls
      .mockResolvedValueOnce([{ status: 'done', thumbUrl: 'https://cdn.example/light.png' }])
      .mockResolvedValueOnce([{ status: 'done', thumbUrl: 'https://cdn.example/dark.png' }]);

    renderWithProviders(<Welcome />);

    const user = userEvent.setup();
    const dataTeamsLink = screen.getByRole('link', { name: /Data Teams/i });
    await user.click(dataTeamsLink);

    const modal = await screen.findByTestId('modal');

    await flushTeamsLoading();

    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Test Team EN')).toBeInTheDocument());

    expect(mockGetThumbFileUrls).toHaveBeenCalledTimes(2);

    const [teamCard] = within(modal).getAllByTestId('card-clickable');
    const teamLogo = within(teamCard).getByRole('img', { hidden: true });
    expect(teamLogo).toHaveAttribute('src', 'https://cdn.example/light.png');

    const clickableCard = screen
      .getByText('Test Team EN')
      .closest('[data-testid="card-clickable"]');
    expect(clickableCard).not.toBeNull();
    await user.click(clickableCard as Element);

    expect(window.location.href).toContain('/tgdata/models?tid=team-123');

    const cancelButton = within(modal).getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);
    await waitFor(() => expect(screen.queryByTestId('modal')).not.toBeInTheDocument());
  });

  it('prefers dark thumbnails when dark mode is active', async () => {
    localStorage.setItem('isDarkMode', 'true');

    mockGetTeams.mockResolvedValue({
      data: [buildTeam()],
      success: true,
    });
    mockGetThumbFileUrls
      .mockResolvedValueOnce([{ status: 'done', thumbUrl: 'https://cdn.example/light.png' }])
      .mockResolvedValueOnce([{ status: 'done', thumbUrl: 'https://cdn.example/dark.png' }]);

    renderWithProviders(<Welcome />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: /Data Teams/i }));

    const modal = await screen.findByTestId('modal');

    await flushTeamsLoading();
    await waitFor(() => expect(screen.getByText('Test Team EN')).toBeInTheDocument());

    const [teamCard] = within(modal).getAllByTestId('card-clickable');
    const teamLogo = within(teamCard).getByRole('img', { hidden: true });
    expect(teamLogo).toHaveAttribute('src', 'https://cdn.example/dark.png');
  });

  it('keeps modal responsive when no teams are returned', async () => {
    localStorage.setItem('isDarkMode', 'false');

    mockGetTeams.mockResolvedValue({
      data: [],
      success: false,
    });

    renderWithProviders(<Welcome />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: /Data Teams/i }));

    await flushTeamsLoading();

    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument());
    expect(screen.queryByText('Test Team EN')).not.toBeInTheDocument();
    expect(mockGetThumbFileUrls).not.toHaveBeenCalled();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('binds metric label color to the active primary color variable', () => {
    setAntdToken({ colorPrimary: '#0C246A' });

    renderWithProviders(<Welcome />);

    const metricLabel = screen.getByText('Unit Processes & Inventories', {
      selector: '[data-testid="typography-text"]',
    });

    expect(metricLabel).toHaveAttribute('data-style-color', 'var(--ant-color-primary, #0C246A)');
  });
});
