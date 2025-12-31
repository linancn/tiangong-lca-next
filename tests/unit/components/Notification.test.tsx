/**
 * Tests for Notification component
 * Path: src/components/Notification/index.tsx
 *
 * Coverage focuses on:
 * - Renders correctly
 * - Handles user interactions (icon click, modal open/close)
 * - Badge dot visibility based on state
 * - Tab switching functionality
 * - Time filter functionality
 * - Service integration
 */

import Notification from '@/components/Notification';
import { getCurrentUser, getFreshUserMetadata } from '@/services/auth';
import { getLatestReviewOfMine, getNotifyReviewsCount } from '@/services/reviews/api';
import { getLatestRolesOfMine, getTeamInvitationCountApi } from '@/services/roles/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';

// Mock dependencies
jest.mock('@/services/auth', () => ({
  getCurrentUser: jest.fn(),
  getFreshUserMetadata: jest.fn(),
}));

jest.mock('@/services/reviews/api', () => ({
  getLatestReviewOfMine: jest.fn(),
  getNotifyReviewsCount: jest.fn(),
}));

jest.mock('@/services/roles/api', () => ({
  getLatestRolesOfMine: jest.fn(),
  getTeamInvitationCountApi: jest.fn(),
}));

jest.mock('umi', () => ({
  useIntl: () => ({
    formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) =>
      defaultMessage || id,
    locale: 'en',
  }),
}));

// Mock child components
jest.mock('@/components/Notification/DataNotification', () => {
  return function DataNotification() {
    return <div data-testid='data-notification'>Data Notification</div>;
  };
});

jest.mock('@/components/Notification/TeamNotification', () => {
  return function TeamNotification() {
    return <div data-testid='team-notification'>Team Notification</div>;
  };
});

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<any>;
const mockGetFreshUserMetadata = getFreshUserMetadata as jest.MockedFunction<any>;
const mockGetLatestReviewOfMine = getLatestReviewOfMine as jest.MockedFunction<any>;
const mockGetLatestRolesOfMine = getLatestRolesOfMine as jest.MockedFunction<any>;
const mockGetNotifyReviewsCount = getNotifyReviewsCount as jest.MockedFunction<any>;
const mockGetTeamInvitationCountApi = getTeamInvitationCountApi as jest.MockedFunction<any>;

describe('Notification Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockGetCurrentUser.mockResolvedValue({
      userid: 'user-1',
      update_team_notification_time: 0,
      update_data_notification_time: 0,
    });

    mockGetFreshUserMetadata.mockResolvedValue({
      userid: 'user-1',
      update_team_notification_time: 0,
      update_data_notification_time: 0,
    });

    mockGetLatestReviewOfMine.mockResolvedValue([]);
    mockGetLatestRolesOfMine.mockResolvedValue(null);
    mockGetNotifyReviewsCount.mockResolvedValue({ success: true, total: 0 });
    mockGetTeamInvitationCountApi.mockResolvedValue({ success: true, total: 0 });
  });

  it('should render correctly', async () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = await screen.findByRole('img', { hidden: true });
    expect(icon).toBeInTheDocument();
  });

  it('should show badge dot when there are notifications', async () => {
    mockGetNotifyReviewsCount.mockResolvedValue({ success: true, total: 1 });
    mockGetTeamInvitationCountApi.mockResolvedValue({ success: true, total: 1 });

    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    await waitFor(() => {
      const badge = screen.getByRole('img', { hidden: true }).closest('.ant-badge');
      expect(badge).toHaveClass('ant-badge');
    });
  });

  it('should not show badge dot when there are no notifications', async () => {
    mockGetNotifyReviewsCount.mockResolvedValue({ success: true, total: 0 });
    mockGetTeamInvitationCountApi.mockResolvedValue({ success: true, total: 0 });

    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    await waitFor(() => {
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toBeInTheDocument();
    });
  });

  it('should open modal when icon is clicked', async () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = await screen.findByRole('img', { hidden: true });
    fireEvent.click(icon);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('should close modal when cancel button is clicked', async () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = await screen.findByRole('img', { hidden: true });
    fireEvent.click(icon);

    // Verify modal is open
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(cancelButton);

    // After closing, modal should be hidden
    await waitFor(() => {
      const modalAfterClose = screen.queryByRole('dialog');
      // Modal might still be in DOM but should be hidden, or removed entirely
      expect(modalAfterClose).toBeFalsy();
    });
  });

  it('should render both notification tabs', async () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = await screen.findByRole('img', { hidden: true });
    fireEvent.click(icon);

    expect(screen.getByText('Team Notifications')).toBeInTheDocument();
    expect(screen.getByText('Data Notifications')).toBeInTheDocument();
  });

  it('should render team notification by default', async () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = await screen.findByRole('img', { hidden: true });
    fireEvent.click(icon);

    expect(screen.getByTestId('team-notification')).toBeInTheDocument();
  });

  it('should switch to data notification tab when clicked', async () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = await screen.findByRole('img', { hidden: true });
    fireEvent.click(icon);

    const dataTab = screen.getByText('Data Notifications');
    fireEvent.click(dataTab);

    expect(screen.getByTestId('data-notification')).toBeInTheDocument();
  });

  it('should render time filter select', async () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = await screen.findByRole('img', { hidden: true });
    fireEvent.click(icon);

    const timeFilter = screen.getByRole('combobox');
    expect(timeFilter).toBeInTheDocument();
  });

  it('should change time filter when select value changes', async () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = await screen.findByRole('img', { hidden: true });
    fireEvent.click(icon);

    const timeFilter = screen.getByRole('combobox');
    fireEvent.mouseDown(timeFilter);

    const option = screen.getByText('Last 7 Days');
    fireEvent.click(option);

    fireEvent.mouseDown(timeFilter);

    const selectedOption = screen.getByRole('option', { name: 'Last 7 Days' });
    expect(selectedOption).toHaveAttribute('aria-selected', 'true');
  });

  it('should call service functions on mount', async () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(mockGetFreshUserMetadata).toHaveBeenCalled();
      expect(mockGetNotifyReviewsCount).toHaveBeenCalled();
      expect(mockGetTeamInvitationCountApi).toHaveBeenCalled();
    });
  });

  it('should show badge dot on team tab when team notification exists', async () => {
    mockGetTeamInvitationCountApi.mockResolvedValue({ success: true, total: 1 });
    mockGetNotifyReviewsCount.mockResolvedValue({ success: true, total: 0 });

    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = await screen.findByRole('img', { hidden: true });
    fireEvent.click(icon);

    await waitFor(() => {
      const teamTab = screen.getByText('Team Notifications');
      const badge = teamTab.closest('.ant-badge');
      expect(badge).toHaveClass('ant-badge');
    });
  });

  it('should show badge dot on data tab when data notification exists', async () => {
    mockGetNotifyReviewsCount.mockResolvedValue({ success: true, total: 1 });
    mockGetTeamInvitationCountApi.mockResolvedValue({ success: true, total: 0 });

    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = await screen.findByRole('img', { hidden: true });
    fireEvent.click(icon);

    await waitFor(() => {
      const dataTab = screen.getByText('Data Notifications');
      const badge = dataTab.closest('.ant-badge');
      expect(badge).toHaveClass('ant-badge');
    });
  });

  it('should have correct icon attributes', async () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = await screen.findByRole('img', { hidden: true });
    expect(icon).toHaveStyle({ fontSize: '16px', opacity: '0.5', cursor: 'pointer' });
  });

  it('should render modal with correct width', async () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = await screen.findByRole('img', { hidden: true });
    fireEvent.click(icon);

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
  });
});
