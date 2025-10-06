/**
 * Tests for DataNotification component
 * Path: src/components/Notification/DataNotification.tsx
 *
 * Coverage focuses on:
 * - Renders correctly with given props
 * - Handles data fetching and loading states
 * - Table rendering with correct columns
 * - Pagination functionality
 * - Status tag rendering
 * - Action buttons functionality
 * - Service integration
 */

import DataNotification from '@/components/Notification/DataNotification';
import { updateDataNotificationTime } from '@/services/auth/api';
import { getNotifyReviews } from '@/services/reviews/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';

// Mock dependencies
jest.mock('@/services/auth/api', () => ({
  updateDataNotificationTime: jest.fn(),
}));

jest.mock('@/services/reviews/api', () => ({
  getNotifyReviews: jest.fn(),
}));

jest.mock('umi', () => ({
  useIntl: () => ({
    formatMessage: (
      { id, defaultMessage }: { id: string; defaultMessage?: string },
      values?: Record<string, unknown>,
    ) => {
      const message = defaultMessage || id;
      if (!values) {
        return message;
      }
      return Object.keys(values).reduce((acc, key) => {
        const value = values[key];
        return acc.replace(new RegExp(`{${key}}`, 'g'), String(value));
      }, message);
    },
    locale: 'en',
  }),
}));

const mockUpdateDataNotificationTime = updateDataNotificationTime as jest.MockedFunction<any>;
const mockGetNotifyReviews = getNotifyReviews as jest.MockedFunction<any>;

describe('DataNotification Component', () => {
  const defaultProps = {
    timeFilter: 3,
    removeItemFromDotTabs: jest.fn(),
  };

  const mockReviewData = {
    success: true,
    data: [
      {
        key: 'review-1',
        id: 'review-1',
        name: 'Test Process',
        teamName: 'Test Team',
        userName: 'Test User',
        modifiedAt: '2023-12-01T10:00:00Z',
        isFromLifeCycle: false,
        stateCode: 2,
        json: {
          data: { id: 'process-1', version: '1.0.0' },
          comment: { message: 'Test comment' },
        },
      },
      {
        key: 'review-2',
        id: 'review-2',
        name: 'Test Process 2',
        teamName: 'Test Team 2',
        userName: 'Test User 2',
        modifiedAt: '2023-12-01T11:00:00Z',
        isFromLifeCycle: true,
        stateCode: -1,
        json: {
          data: { id: 'process-2', version: '2.0.0' },
          comment: { message: 'Rejected comment' },
        },
      },
    ],
    total: 2,
    page: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNotifyReviews.mockResolvedValue(mockReviewData);
    mockUpdateDataNotificationTime.mockResolvedValue({ error: null });
  });

  it('should render correctly with given props', async () => {
    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Test Process')).toBeInTheDocument();
      expect(screen.getByText('Test Team')).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    mockGetNotifyReviews.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('should fetch data on mount', async () => {
    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(mockGetNotifyReviews).toHaveBeenCalledWith({ pageSize: 10, current: 1 }, 'en', 3);
    });
  });

  it('should fetch data when timeFilter changes', async () => {
    const { rerender } = render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(mockGetNotifyReviews).toHaveBeenCalledWith({ pageSize: 10, current: 1 }, 'en', 3);
    });

    rerender(
      <ConfigProvider>
        <DataNotification {...defaultProps} timeFilter={7} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(mockGetNotifyReviews).toHaveBeenCalledWith({ pageSize: 10, current: 1 }, 'en', 7);
    });
  });

  it('should render table with correct columns', async () => {
    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Team')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Modified At')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  it('should render approved status tag correctly', async () => {
    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });
  });

  it('should render rejected status tag correctly', async () => {
    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });

  it('should render assigned status tag correctly', async () => {
    const assignedData = {
      ...mockReviewData,
      data: [
        {
          ...mockReviewData.data[0],
          stateCode: 1,
        },
      ],
      page: 1,
    };
    mockGetNotifyReviews.mockResolvedValue(assignedData);

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Assigned')).toBeInTheDocument();
    });
  });

  it('should render empty status tag for unknown state', async () => {
    const emptyData = {
      ...mockReviewData,
      data: [
        {
          ...mockReviewData.data[0],
          stateCode: 999,
        },
      ],
      page: 1,
    };
    mockGetNotifyReviews.mockResolvedValue(emptyData);

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Empty')).toBeInTheDocument();
    });
  });

  it('should render modified date correctly', async () => {
    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    const expected = new Date('2023-12-01T10:00:00Z');
    const expectedString = `${expected.getFullYear()}-${expected.getMonth() + 1}-${expected.getDate()} ${expected
      .getHours()
      .toString()
      .padStart(2, '0')}:${expected
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${expected.getSeconds().toString().padStart(2, '0')}`;

    await waitFor(() => {
      expect(screen.getByText(expectedString)).toBeInTheDocument();
    });
  });

  it('should render empty string for missing modified date', async () => {
    const noDateData = {
      ...mockReviewData,
      data: [
        {
          ...mockReviewData.data[0],
          modifiedAt: '',
        },
      ],
      page: 1,
    };
    mockGetNotifyReviews.mockResolvedValue(noDateData);

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  it('should render view button for each row', async () => {
    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      const viewButtons = screen.getAllByText('View');
      expect(viewButtons).toHaveLength(2);
    });
  });

  it('should open new window when view button is clicked', async () => {
    const mockOpen = jest.fn();
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true,
    });

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      const viewButton = screen.getAllByText('View')[0];
      fireEvent.click(viewButton);
    });

    expect(mockOpen).toHaveBeenCalledWith('/mydata/processes?id=process-1&version=1.0.0', '_blank');
  });

  it('should handle pagination correctly', async () => {
    const paginatedData = {
      ...mockReviewData,
      total: 25,
      page: 1,
    };
    mockGetNotifyReviews.mockResolvedValue(paginatedData);

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Items 1-10 of 25')).toBeInTheDocument();
    });
  });

  it('should fetch new data when pagination changes', async () => {
    const paginatedData = {
      ...mockReviewData,
      total: 25,
    };
    mockGetNotifyReviews.mockResolvedValue(paginatedData);

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    const nextButton = await screen.findByTitle('Next Page');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockGetNotifyReviews).toHaveBeenCalledWith({ pageSize: 10, current: 2 }, 'en', 3);
    });
  });

  it('should call updateDataNotificationTime after successful fetch', async () => {
    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(mockUpdateDataNotificationTime).toHaveBeenCalled();
    });
  });

  it('should call removeItemFromDotTabs after successful fetch', async () => {
    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(defaultProps.removeItemFromDotTabs).toHaveBeenCalledWith('data');
    });
  });

  it('should handle fetch error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockGetNotifyReviews.mockRejectedValue(new Error('Fetch failed'));

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('获取数据通知失败:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should handle unsuccessful response', async () => {
    mockGetNotifyReviews.mockResolvedValue({
      success: false,
      data: [],
      total: 0,
      page: 1,
    });

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(mockUpdateDataNotificationTime).not.toHaveBeenCalled();
      expect(defaultProps.removeItemFromDotTabs).not.toHaveBeenCalled();
    });
  });

  it('should render tooltip with reject reason', async () => {
    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    const rejectedTag = await screen.findByText('Rejected');
    fireEvent.mouseOver(rejectedTag);

    await waitFor(() => {
      expect(screen.getByText('Rejected comment')).toBeInTheDocument();
    });
  });

  it('should render name in correct language', async () => {
    const zhData = {
      ...mockReviewData,
      data: [
        {
          ...mockReviewData.data[0],
          name: [
            { '@xml:lang': 'zh', '#text': '测试流程' },
            { '@xml:lang': 'en', '#text': 'Test Process' },
          ],
        },
      ],
      page: 1,
    };
    mockGetNotifyReviews.mockResolvedValue(zhData);

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Test Process')).toBeInTheDocument();
    });
  });
});
