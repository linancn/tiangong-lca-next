/**
 * Tests for TeamNotification component
 * Path: src/components/Notification/TeamNotification.tsx
 *
 * Coverage focuses on:
 * - Renders correctly with given props
 * - Handles data fetching and loading states
 * - Table rendering with correct columns
 * - Status tag rendering for different roles
 * - Action buttons functionality (accept/reject)
 * - Service integration
 * - Error handling
 */

import TeamNotification from '@/components/Notification/TeamNotification';
import {
  acceptTeamInvitationApi,
  getTeamInvitationStatusApi,
  rejectTeamInvitationApi,
} from '@/services/roles/api';
import { getTeamById } from '@/services/teams/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider, message } from 'antd';

// Mock dependencies

jest.mock('@/services/roles/api', () => ({
  acceptTeamInvitationApi: jest.fn(),
  getTeamInvitationStatusApi: jest.fn(),
  rejectTeamInvitationApi: jest.fn(),
}));

jest.mock('@/services/teams/api', () => ({
  getTeamById: jest.fn(),
}));

jest.mock('umi', () => ({
  useIntl: () => ({
    formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) =>
      defaultMessage || id,
    locale: 'en',
  }),
}));

const mockAcceptTeamInvitationApi = acceptTeamInvitationApi as jest.MockedFunction<any>;
const mockGetTeamInvitationStatusApi = getTeamInvitationStatusApi as jest.MockedFunction<any>;
const mockRejectTeamInvitationApi = rejectTeamInvitationApi as jest.MockedFunction<any>;
const mockGetTeamById = getTeamById as jest.MockedFunction<any>;

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
    },
  };

  const mockTeamData = {
    success: true,
    data: [
      {
        key: 'team-1',
        id: 'team-1',
        json: {
          title: [{ '@xml:lang': 'en', '#text': 'Test Team' }],
        },
        rank: 1,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTeamInvitationStatusApi.mockResolvedValue(mockInvitationData);
    mockGetTeamById.mockResolvedValue(mockTeamData);
    onDataLoadedMock.mockResolvedValue(undefined);
    mockAcceptTeamInvitationApi.mockResolvedValue({ success: true, error: null });
    mockRejectTeamInvitationApi.mockResolvedValue({ success: true, error: null });
  });

  it('should render correctly with given props', async () => {
    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Test Team')).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    mockGetTeamInvitationStatusApi.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('should fetch data on mount', async () => {
    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(mockGetTeamInvitationStatusApi).toHaveBeenCalledWith(3);
    });
  });

  it('should fetch data when timeFilter changes', async () => {
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

  it('should render table with correct columns', async () => {
    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Team Name')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  it('should render pending status tag for is_invited role', async () => {
    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('should render accepted status tag for member role', async () => {
    const memberData = {
      ...mockInvitationData,
      data: {
        ...mockInvitationData.data,
        role: 'member',
      },
    };
    mockGetTeamInvitationStatusApi.mockResolvedValue(memberData);

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Accepted')).toBeInTheDocument();
    });
  });

  it('should render rejected status tag for rejected role', async () => {
    const rejectedData = {
      ...mockInvitationData,
      data: {
        ...mockInvitationData.data,
        role: 'rejected',
      },
    };
    mockGetTeamInvitationStatusApi.mockResolvedValue(rejectedData);

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });

  it('should render admin status tag for admin role', async () => {
    const adminData = {
      ...mockInvitationData,
      data: {
        ...mockInvitationData.data,
        role: 'admin',
      },
    };
    mockGetTeamInvitationStatusApi.mockResolvedValue(adminData);

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  it('should render owner status tag for owner role', async () => {
    const ownerData = {
      ...mockInvitationData,
      data: {
        ...mockInvitationData.data,
        role: 'owner',
      },
    };
    mockGetTeamInvitationStatusApi.mockResolvedValue(ownerData);

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Owner')).toBeInTheDocument();
    });
  });

  it('should render empty status tag for unknown role', async () => {
    const emptyData = {
      ...mockInvitationData,
      data: {
        ...mockInvitationData.data,
        role: 'unknown',
      },
    };
    mockGetTeamInvitationStatusApi.mockResolvedValue(emptyData);

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Empty')).toBeInTheDocument();
    });
  });

  it('should render accept and reject buttons for is_invited role', async () => {
    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Accept')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });
  });

  it('should not render action buttons for non-invited roles', async () => {
    const memberData = {
      ...mockInvitationData,
      data: {
        ...mockInvitationData.data,
        role: 'member',
      },
    };
    mockGetTeamInvitationStatusApi.mockResolvedValue(memberData);

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText('Accept')).not.toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });
  });

  it('should handle accept button click', async () => {
    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      const acceptButton = screen.getByText('Accept');
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(mockAcceptTeamInvitationApi).toHaveBeenCalledWith('team-1', 'user-1');
    });
  });

  it('should handle reject button click', async () => {
    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      const rejectButton = screen.getByText('Reject');
      fireEvent.click(rejectButton);
    });

    await waitFor(() => {
      expect(mockRejectTeamInvitationApi).toHaveBeenCalledWith('team-1', 'user-1');
    });
  });

  it('should show loading state on accept button when processing', async () => {
    mockAcceptTeamInvitationApi.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    const acceptButton = await screen.findByRole('button', { name: 'Accept' });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept/i })).toHaveClass('ant-btn-loading');
    });
  });

  it('should show loading state on reject button when processing', async () => {
    mockRejectTeamInvitationApi.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    const rejectButton = await screen.findByRole('button', { name: 'Reject' });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reject/i })).toHaveClass('ant-btn-loading');
    });
  });

  it('should call onDataLoaded after successful fetch', async () => {
    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(onDataLoadedMock).toHaveBeenCalled();
    });
  });

  it('should handle fetch error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockGetTeamInvitationStatusApi.mockRejectedValue(new Error('Fetch failed'));

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should handle unsuccessful invitation response', async () => {
    mockGetTeamInvitationStatusApi.mockResolvedValue({
      success: false,
      data: [],
    });

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(onDataLoadedMock).toHaveBeenCalled();
    });
  });

  it('should handle unsuccessful team fetch', async () => {
    mockGetTeamById.mockResolvedValue({
      success: false,
      data: [],
    });

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.queryAllByText(/no data/i).length).toBeGreaterThan(0);
    });
  });

  it('should handle accept action error', async () => {
    mockAcceptTeamInvitationApi.mockResolvedValue({ success: false, error: 'Accept failed' });

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

  it('should handle reject action error', async () => {
    mockRejectTeamInvitationApi.mockResolvedValue({ success: false, error: 'Reject failed' });

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

  it('should handle accept action exception', async () => {
    mockAcceptTeamInvitationApi.mockRejectedValue(new Error('Network error'));

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

  it('should handle reject action exception', async () => {
    mockRejectTeamInvitationApi.mockRejectedValue(new Error('Network error'));

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

  it('should render team name in correct language', async () => {
    const zhTeamData = {
      ...mockTeamData,
      data: [
        {
          ...mockTeamData.data[0],
          json: {
            title: [
              { '@xml:lang': 'zh', '#text': '测试团队' },
              { '@xml:lang': 'en', '#text': 'Test Team' },
            ],
          },
        },
      ],
    };
    mockGetTeamById.mockResolvedValue(zhTeamData);

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Test Team')).toBeInTheDocument();
    });
  });

  it('should render empty data when no invitation', async () => {
    mockGetTeamInvitationStatusApi.mockResolvedValue({
      success: true,
      data: [],
    });

    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  it('should refresh data after successful action', async () => {
    render(
      <ConfigProvider>
        <TeamNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      const acceptButton = screen.getByText('Accept');
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(mockGetTeamInvitationStatusApi).toHaveBeenCalledTimes(2);
    });
  });
});
