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
import { getNotifyReviews } from '@/services/reviews/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';

// Mock dependencies
jest.mock('@/services/reviews/api', () => ({
  getNotifyReviews: jest.fn(),
}));

let mockIntlLocale = 'en';

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
    locale: mockIntlLocale,
  }),
}));

const mockGetNotifyReviews = getNotifyReviews as jest.MockedFunction<any>;

describe('DataNotification Component', () => {
  const onDataLoadedMock = jest.fn();
  const defaultProps = {
    timeFilter: 3,
    onDataLoaded: onDataLoadedMock,
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
    mockIntlLocale = 'en';
    mockGetNotifyReviews.mockResolvedValue(mockReviewData);
    onDataLoadedMock.mockResolvedValue(undefined);
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
      expect(screen.getByText('No information')).toBeInTheDocument();
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

  it('should render dash for missing modified date', async () => {
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
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  it('should render dash for invalid modified date strings', async () => {
    const invalidDateData = {
      ...mockReviewData,
      data: [
        {
          ...mockReviewData.data[0],
          modifiedAt: 'not-a-date',
        },
      ],
      page: 1,
    };
    mockGetNotifyReviews.mockResolvedValue(invalidDateData);

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  it('should render dash when modified date is undefined', async () => {
    const undefinedDateData = {
      ...mockReviewData,
      data: [
        {
          ...mockReviewData.data[0],
          modifiedAt: undefined,
        },
      ],
      page: 1,
    };
    mockGetNotifyReviews.mockResolvedValue(undefinedDateData);

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument();
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

  it('opens process view mode when a non-rejected process notification is viewed', async () => {
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

    expect(mockOpen).toHaveBeenCalledWith(
      'http://localhost:8000/#/mydata/processes?id=process-1&version=1.0.0&mode=view',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('opens model view mode when a non-rejected lifecycle notification is viewed', async () => {
    const mockOpen = jest.fn();
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true,
    });
    mockGetNotifyReviews.mockResolvedValue({
      ...mockReviewData,
      data: [
        {
          ...mockReviewData.data[1],
          stateCode: 2,
        },
      ],
      page: 1,
    });

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    const viewButton = await screen.findByText('View');
    fireEvent.click(viewButton);

    expect(mockOpen).toHaveBeenCalledWith(
      'http://localhost:8000/#/mydata/models?id=process-2&version=2.0.0&mode=view',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('uses empty route params when notification data identifiers are missing', async () => {
    const mockOpen = jest.fn();
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true,
    });
    mockGetNotifyReviews.mockResolvedValue({
      ...mockReviewData,
      data: [
        {
          ...mockReviewData.data[0],
          json: {
            ...mockReviewData.data[0].json,
            data: {},
          },
        },
      ],
      page: 1,
    });

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    fireEvent.click(await screen.findByText('View'));

    expect(mockOpen).toHaveBeenCalledWith(
      'http://localhost:8000/#/mydata/processes?id=&version=&mode=view',
      '_blank',
      'noopener,noreferrer',
    );
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

  it('should call onDataLoaded after successful fetch', async () => {
    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(onDataLoadedMock).toHaveBeenCalled();
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
      expect(onDataLoadedMock).not.toHaveBeenCalled();
    });
  });

  it('should tolerate successful responses with no rows and zero total', async () => {
    mockGetNotifyReviews.mockResolvedValue({
      success: true,
      data: undefined,
      total: 0,
      page: 1,
    });

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(onDataLoadedMock).toHaveBeenCalledTimes(1);
      expect(screen.getAllByText('No data').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('View')).not.toBeInTheDocument();
  });

  it('opens rejection comment modal and fixes rejected data from the current process link', async () => {
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

    const rejectedViewButton = (await screen.findAllByText('View'))[1];
    fireEvent.click(rejectedViewButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Review Comment' })).toBeInTheDocument();
      expect(screen.getByText('Rejected comment')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Fix Data' }));

    expect(mockOpen).toHaveBeenCalledWith(
      'http://localhost:8000/#/mydata/processes?id=process-2&version=2.0.0&mode=edit',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('shows rejection comments stored as serialized JSON strings', async () => {
    mockGetNotifyReviews.mockResolvedValue({
      ...mockReviewData,
      data: [
        {
          ...mockReviewData.data[1],
          json: {
            ...mockReviewData.data[1].json,
            comment: JSON.stringify({ message: 'Serialized rejected comment' }),
          },
        },
      ],
      page: 1,
    });

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    fireEvent.click(await screen.findByText('View'));

    expect(await screen.findByText('Serialized rejected comment')).toBeInTheDocument();
  });

  it('falls back for malformed serialized rejection comments and closes the modal', async () => {
    mockGetNotifyReviews.mockResolvedValue({
      ...mockReviewData,
      data: [
        {
          ...mockReviewData.data[1],
          json: {
            ...mockReviewData.data[1].json,
            comment: '{not-json',
          },
        },
      ],
      page: 1,
    });

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    fireEvent.click(await screen.findByText('View'));

    expect(await screen.findByText('No review comment available.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Review Comment' })).not.toBeInTheDocument();
    });
  });

  it('falls back when rejection comment payloads omit the message field', async () => {
    mockGetNotifyReviews.mockResolvedValue({
      ...mockReviewData,
      data: [
        {
          ...mockReviewData.data[1],
          key: 'review-string-without-message',
          id: 'review-string-without-message',
          json: {
            ...mockReviewData.data[1].json,
            comment: JSON.stringify({ detail: 'missing message' }),
          },
        },
        {
          ...mockReviewData.data[1],
          key: 'review-object-without-message',
          id: 'review-object-without-message',
          json: {
            ...mockReviewData.data[1].json,
            data: { id: 'process-4', version: '4.0.0' },
            comment: { detail: 'missing message' },
          },
        },
      ],
      page: 1,
    });

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    const viewButtons = await screen.findAllByText('View');
    fireEvent.click(viewButtons[0]);

    expect(await screen.findByText('No review comment available.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Review Comment' })).not.toBeInTheDocument();
    });

    fireEvent.click(viewButtons[1]);

    expect(await screen.findByText('No review comment available.')).toBeInTheDocument();
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

  it('should render zh names when locale is zh-CN and fall back to the first entry when zh is missing', async () => {
    mockIntlLocale = 'zh-CN';
    const zhPreferredData = {
      ...mockReviewData,
      data: [
        {
          ...mockReviewData.data[0],
          name: [
            { '@xml:lang': 'zh', '#text': '测试流程' },
            { '@xml:lang': 'en', '#text': 'Test Process' },
          ],
        },
        {
          ...mockReviewData.data[1],
          name: [{ '@xml:lang': 'en', '#text': 'Fallback English First' }],
        },
      ],
      page: 1,
    };
    mockGetNotifyReviews.mockResolvedValue(zhPreferredData);

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('测试流程')).toBeInTheDocument();
      expect(screen.getByText('Fallback English First')).toBeInTheDocument();
    });
  });

  it('should fall back to the first name entry when english is missing', async () => {
    const fallbackNameData = {
      ...mockReviewData,
      data: [
        {
          ...mockReviewData.data[0],
          json: {
            data: { id: 'process-3', version: '3.0.0' },
          },
          name: [{ '@xml:lang': 'zh', '#text': 'Only Chinese Name' }],
        },
      ],
      page: 1,
    };
    mockGetNotifyReviews.mockResolvedValue(fallbackNameData);

    render(
      <ConfigProvider>
        <DataNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Only Chinese Name')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });
  });

  it('does not call onDataLoaded when only pagination changes', async () => {
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
      expect(onDataLoadedMock).toHaveBeenCalledTimes(1);
    });

    const nextButton = await screen.findByTitle('Next Page');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockGetNotifyReviews).toHaveBeenCalledWith({ pageSize: 10, current: 2 }, 'en', 3);
    });
    expect(onDataLoadedMock).toHaveBeenCalledTimes(1);
  });
});
