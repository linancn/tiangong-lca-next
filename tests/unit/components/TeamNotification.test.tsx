import TeamNotification from '@/components/Notification/TeamNotification';
import {
  acceptTeamInvitationApi,
  getTeamInvitationStatusApi,
  rejectTeamInvitationApi,
} from '@/services/roles/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider, message } from 'antd';

jest.mock('@/services/roles/api', () => ({
  acceptTeamInvitationApi: jest.fn(),
  getTeamInvitationStatusApi: jest.fn(),
  rejectTeamInvitationApi: jest.fn(),
}));

let mockLocale = 'en';

jest.mock('umi', () => ({
  useIntl: () => ({
    formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) =>
      defaultMessage || id,
    locale: mockLocale,
  }),
}));

const mockAcceptTeamInvitationApi = acceptTeamInvitationApi as jest.MockedFunction<any>;
const mockGetTeamInvitationStatusApi = getTeamInvitationStatusApi as jest.MockedFunction<any>;
const mockRejectTeamInvitationApi = rejectTeamInvitationApi as jest.MockedFunction<any>;

jest.spyOn(message, 'success').mockImplementation(() => ({ key: 'success' }) as any);
jest.spyOn(message, 'error').mockImplementation(() => ({ key: 'error' }) as any);

describe('TeamNotification Component', () => {
  const onDataLoadedMock = jest.fn();
  const defaultProps = {
    timeFilter: 3,
    onDataLoaded: onDataLoadedMock,
  };

  const mockInvitationData = {
    success: true,
    data: {
      team_id: 'team-1',
      user_id: 'user-1',
      role: 'is_invited',
      teamTitle: [{ '@xml:lang': 'en', '#text': 'Test Team' }],
      modifiedAt: '2024-05-01T10:00:00.000Z',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocale = 'en';
    mockGetTeamInvitationStatusApi.mockResolvedValue(mockInvitationData);
    onDataLoadedMock.mockResolvedValue(undefined);
    mockAcceptTeamInvitationApi.mockResolvedValue({ success: true, error: null });
    mockRejectTeamInvitationApi.mockResolvedValue({ success: true, error: null });
  });

  it('renders fetched invitation rows', async () => {
    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Test Team')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('loads notification rows for the selected time filter', async () => {
    const { rerender } = render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(mockGetTeamInvitationStatusApi).toHaveBeenCalledWith(3);
    });

    rerender(
      <ConfigProvider>
        <TeamNotification {...defaultProps} timeFilter={7} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(mockGetTeamInvitationStatusApi).toHaveBeenCalledWith(7);
    });
  });

  it('renders status tags for non-invited roles', async () => {
    mockGetTeamInvitationStatusApi.mockResolvedValueOnce({
      success: true,
      data: {
        ...mockInvitationData.data,
        role: 'member',
      },
    });

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Accepted')).toBeInTheDocument();
      expect(screen.queryByText('Accept')).not.toBeInTheDocument();
    });
  });

  it('renders localized team names from the query rpc payload', async () => {
    mockLocale = 'zh-CN';
    mockGetTeamInvitationStatusApi.mockResolvedValueOnce({
      success: true,
      data: {
        ...mockInvitationData.data,
        teamTitle: [
          { '@xml:lang': 'en', '#text': 'Test Team' },
          { '@xml:lang': 'zh', '#text': '测试团队' },
        ],
      },
    });

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('测试团队')).toBeInTheDocument();
    });
  });

  it('falls back to the first title or Unknown Team when localized titles are missing', async () => {
    mockLocale = 'zh-CN';
    mockGetTeamInvitationStatusApi.mockResolvedValueOnce({
      success: true,
      data: {
        ...mockInvitationData.data,
        teamTitle: [{ '@xml:lang': 'en', '#text': 'Fallback Team' }],
      },
    });

    const { rerender } = render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Fallback Team')).toBeInTheDocument();
    });

    mockGetTeamInvitationStatusApi.mockResolvedValueOnce({
      success: true,
      data: {
        ...mockInvitationData.data,
        teamTitle: [],
      },
    });

    rerender(
      <ConfigProvider>
        <TeamNotification {...defaultProps} timeFilter={30} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Unknown Team')).toBeInTheDocument();
    });
  });

  it('renders string team titles directly and falls back to Unknown Team for blank strings', async () => {
    mockGetTeamInvitationStatusApi.mockResolvedValueOnce({
      success: true,
      data: {
        ...mockInvitationData.data,
        teamTitle: 'Standalone Team',
      },
    });

    const { rerender } = render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Standalone Team')).toBeInTheDocument();
    });

    mockGetTeamInvitationStatusApi.mockResolvedValueOnce({
      success: true,
      data: {
        ...mockInvitationData.data,
        teamTitle: '   ',
      },
    });

    rerender(
      <ConfigProvider>
        <TeamNotification {...defaultProps} timeFilter={14} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Unknown Team')).toBeInTheDocument();
    });
  });

  it('handles accept and reject actions', async () => {
    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    const acceptButton = await screen.findByRole('button', { name: 'Accept' });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mockAcceptTeamInvitationApi).toHaveBeenCalledWith('team-1', 'user-1');
      expect(message.success).toHaveBeenCalledWith('teams.members.actionSuccess');
    });

    const rejectButton = await screen.findByRole('button', { name: 'Reject' });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(mockRejectTeamInvitationApi).toHaveBeenCalledWith('team-1', 'user-1');
      expect(message.success).toHaveBeenCalledWith('teams.members.actionSuccess');
    });
  });

  it('surfaces action failures and exceptions', async () => {
    mockAcceptTeamInvitationApi.mockResolvedValueOnce({ success: false, error: 'failed' });
    mockRejectTeamInvitationApi.mockRejectedValueOnce(new Error('Network error'));

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    const acceptButton = await screen.findByRole('button', { name: 'Accept' });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('teams.members.actionError');
    });

    const rejectButton = await screen.findByRole('button', { name: 'Reject' });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('teams.members.actionError');
    });
  });

  it('uses english array fallbacks for team titles and falls back to the empty status tag', async () => {
    mockGetTeamInvitationStatusApi.mockResolvedValueOnce({
      success: true,
      data: {
        ...mockInvitationData.data,
        role: 'mystery-role',
        modifiedAt: undefined,
        teamTitle: [{ '@xml:lang': 'fr', '#text': 'Fallback Array Team' }],
      },
    });

    const { rerender } = render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Fallback Array Team')).toBeInTheDocument();
      expect(screen.getByText('Empty')).toBeInTheDocument();
    });

    mockGetTeamInvitationStatusApi.mockResolvedValueOnce({
      success: true,
      data: {
        ...mockInvitationData.data,
        role: 'mystery-role',
        teamTitle: [],
      },
    });

    rerender(
      <ConfigProvider>
        <TeamNotification {...defaultProps} timeFilter={21} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Unknown Team')).toBeInTheDocument();
    });
  });

  it('shows an error toast when rejecting an invitation returns success=false', async () => {
    mockRejectTeamInvitationApi.mockResolvedValueOnce({ success: false, error: 'failed' });

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    const rejectButton = await screen.findByRole('button', { name: 'Reject' });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('teams.members.actionError');
    });
  });

  it('shows an error toast when accepting an invitation throws unexpectedly', async () => {
    mockAcceptTeamInvitationApi.mockRejectedValueOnce(new Error('accept failed'));

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    const acceptButton = await screen.findByRole('button', { name: 'Accept' });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('teams.members.actionError');
    });
  });

  it('refreshes data and notifies the parent after loading', async () => {
    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(onDataLoadedMock).toHaveBeenCalled();
    });

    const acceptButton = await screen.findByRole('button', { name: 'Accept' });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mockGetTeamInvitationStatusApi).toHaveBeenCalledTimes(2);
    });
  });

  it('handles empty or failed fetch results gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockGetTeamInvitationStatusApi.mockResolvedValueOnce({
      success: true,
      data: null,
    });

    const { rerender } = render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    mockGetTeamInvitationStatusApi.mockRejectedValueOnce(new Error('Fetch failed'));

    rerender(
      <ConfigProvider>
        <TeamNotification {...defaultProps} timeFilter={30} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
