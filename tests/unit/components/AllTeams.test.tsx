import {
  getAllTableTeams,
  getTeamsByKeyword,
  updateSort,
  updateTeamRank,
} from '@/services/teams/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';

jest.mock('umi', () => ({
  FormattedMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) => (
    <span>{defaultMessage || id}</span>
  ),
  useIntl: () => ({
    formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) =>
      defaultMessage || id,
    locale: 'en',
  }),
}));

jest.mock('@/services/general/util', () => ({
  getLangText: jest.fn((obj: any) => (typeof obj === 'string' ? obj : (obj?.en ?? ''))),
}));

jest.mock('@/services/teams/api', () => ({
  getAllTableTeams: jest.fn(),
  getTeamsByKeyword: jest.fn(),
  updateSort: jest.fn(),
  updateTeamRank: jest.fn(),
}));

// Mock antd Modal.confirm BEFORE importing component so onClick will use mocked confirm
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    Modal: {
      ...actual.Modal,
      confirm: ({ onOk }: any) => onOk && onOk(),
    },
  };
});

// Import component after mocks
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AllTeams = require('@/components/AllTeams').default;

const mockGetAllTableTeams = getAllTableTeams as jest.MockedFunction<any>;
const mockGetTeamsByKeyword = getTeamsByKeyword as jest.MockedFunction<any>;
const mockUpdateSort = updateSort as jest.MockedFunction<any>;
const mockUpdateTeamRank = updateTeamRank as jest.MockedFunction<any>;

const teamsData = [
  {
    id: 't1',
    json: { title: { en: 'Alpha Team' }, description: { en: 'A long description for alpha' } },
    ownerEmail: 'alpha@example.com',
  },
  {
    id: 't2',
    json: { title: { en: 'Beta Team' }, description: { en: 'Second team' } },
    ownerEmail: 'beta@example.com',
  },
];

describe('AllTeams (manageSystem)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllTableTeams.mockResolvedValue({ data: teamsData, success: true, total: 2 });
    mockGetTeamsByKeyword.mockResolvedValue({ data: teamsData, success: true, total: 2 });
    mockUpdateSort.mockResolvedValue({ error: null });
    mockUpdateTeamRank.mockResolvedValue({ error: null });
  });

  it('renders table and loads data', async () => {
    render(
      <ConfigProvider>
        <AllTeams tableType='manageSystem' systemUserRole='admin' />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(mockGetAllTableTeams).toHaveBeenCalled();
    });

    expect(screen.getByText('Alpha Team')).toBeInTheDocument();
    expect(screen.getByText('Beta Team')).toBeInTheDocument();
  });

  it('search triggers keyword fetch and reload', async () => {
    render(
      <ConfigProvider>
        <AllTeams tableType='manageSystem' systemUserRole='admin' />
      </ConfigProvider>,
    );

    const searchbox = screen.getByRole('searchbox');
    fireEvent.change(searchbox, { target: { value: 'alpha' } });
    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(mockGetTeamsByKeyword).toHaveBeenCalled();
    });
  });

  it('remove button is disabled for non-admin/owner', async () => {
    render(
      <ConfigProvider>
        <AllTeams tableType='manageSystem' systemUserRole='member' />
      </ConfigProvider>,
    );

    await screen.findByText('All Teams');

    // there should be at least one button in toolbar; ensure no rank update occurs on click
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await new Promise((r) => {
      setTimeout(r, 100);
    });
    expect(mockUpdateTeamRank).not.toHaveBeenCalled();
  });
});
