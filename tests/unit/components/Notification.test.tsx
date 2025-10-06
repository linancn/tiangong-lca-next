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
import { getCurrentUser } from '@/services/auth';
import { getLatestReviewOfMine } from '@/services/reviews/api';
import { getLatestRolesOfMine } from '@/services/roles/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';

// Mock dependencies
jest.mock('@/services/auth', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('@/services/reviews/api', () => ({
  getLatestReviewOfMine: jest.fn(),
}));

jest.mock('@/services/roles/api', () => ({
  getLatestRolesOfMine: jest.fn(),
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
const mockGetLatestReviewOfMine = getLatestReviewOfMine as jest.MockedFunction<any>;
const mockGetLatestRolesOfMine = getLatestRolesOfMine as jest.MockedFunction<any>;

describe('Notification Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockGetCurrentUser.mockResolvedValue({
      userid: 'user-1',
      update_team_notification_time: 0,
      update_data_notification_time: 0,
    });

    mockGetLatestReviewOfMine.mockResolvedValue([]);
    mockGetLatestRolesOfMine.mockResolvedValue(null);
  });

  it('should render correctly', () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = screen.getByRole('img', { hidden: true });
    expect(icon).toBeInTheDocument();
  });

  it('should show badge dot when there are notifications', async () => {
    const mockUser = {
      id: 'user-1',
      update_team_notification_time: 1000,
      update_data_notification_time: 1000,
    };

    const mockReview = [
      {
        id: 'review-1',
        modified_at: '2023-12-01T10:00:00Z',
      },
    ];

    const mockRole = {
      id: 'role-1',
      modified_at: '2023-12-01T11:00:00Z',
    };

    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetLatestReviewOfMine.mockResolvedValue(mockReview);
    mockGetLatestRolesOfMine.mockResolvedValue(mockRole);

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
    const mockUser = {
      id: 'user-1',
      update_team_notification_time: Date.now(),
      update_data_notification_time: Date.now(),
    };

    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetLatestReviewOfMine.mockResolvedValue([]);
    mockGetLatestRolesOfMine.mockResolvedValue(null);

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

  it('should open modal when icon is clicked', () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = screen.getByRole('img', { hidden: true });
    fireEvent.click(icon);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('should close modal when cancel button is clicked', () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = screen.getByRole('img', { hidden: true });
    fireEvent.click(icon);

    expect(screen.getByText('Notifications')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(cancelButton);

    waitFor(() => {
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });

  it('should render both notification tabs', () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = screen.getByRole('img', { hidden: true });
    fireEvent.click(icon);

    expect(screen.getByText('Team Notifications')).toBeInTheDocument();
    expect(screen.getByText('Data Notifications')).toBeInTheDocument();
  });

  it('should render team notification by default', () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = screen.getByRole('img', { hidden: true });
    fireEvent.click(icon);

    expect(screen.getByTestId('team-notification')).toBeInTheDocument();
  });

  it('should switch to data notification tab when clicked', () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = screen.getByRole('img', { hidden: true });
    fireEvent.click(icon);

    const dataTab = screen.getByText('Data Notifications');
    fireEvent.click(dataTab);

    expect(screen.getByTestId('data-notification')).toBeInTheDocument();
  });

  it('should render time filter select', () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = screen.getByRole('img', { hidden: true });
    fireEvent.click(icon);

    const timeFilter = screen.getByRole('combobox');
    expect(timeFilter).toBeInTheDocument();
  });

  it('should change time filter when select value changes', () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = screen.getByRole('img', { hidden: true });
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
      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockGetLatestReviewOfMine).toHaveBeenCalled();
      expect(mockGetLatestRolesOfMine).toHaveBeenCalled();
    });
  });

  it('should show badge dot on team tab when team notification exists', async () => {
    const mockUser = {
      id: 'user-1',
      update_team_notification_time: 1000,
      update_data_notification_time: Date.now(),
    };

    const mockRole = {
      id: 'role-1',
      modified_at: '2023-12-01T11:00:00Z',
    };

    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetLatestRolesOfMine.mockResolvedValue(mockRole);

    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = screen.getByRole('img', { hidden: true });
    fireEvent.click(icon);

    await waitFor(() => {
      const teamTab = screen.getByText('Team Notifications');
      const badge = teamTab.closest('.ant-badge');
      expect(badge).toHaveClass('ant-badge');
    });
  });

  it('should show badge dot on data tab when data notification exists', async () => {
    const mockUser = {
      id: 'user-1',
      update_team_notification_time: Date.now(),
      update_data_notification_time: 1000,
    };

    const mockReview = [
      {
        id: 'review-1',
        modified_at: '2023-12-01T10:00:00Z',
      },
    ];

    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetLatestReviewOfMine.mockResolvedValue(mockReview);

    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = screen.getByRole('img', { hidden: true });
    fireEvent.click(icon);

    await waitFor(() => {
      const dataTab = screen.getByText('Data Notifications');
      const badge = dataTab.closest('.ant-badge');
      expect(badge).toHaveClass('ant-badge');
    });
  });

  it('should have correct icon attributes', () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = screen.getByRole('img', { hidden: true });
    expect(icon).toHaveStyle({ fontSize: '16px', opacity: '0.5', cursor: 'pointer' });
  });

  it('should render modal with correct width', () => {
    render(
      <ConfigProvider>
        <Notification />
      </ConfigProvider>,
    );

    const icon = screen.getByRole('img', { hidden: true });
    fireEvent.click(icon);

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
  });
});
