/**
 * Tests for IssueNotification component
 * Path: src/components/Notification/IssueNotification.tsx
 */

import IssueNotification from '@/components/Notification/IssueNotification';
import { getNotifications } from '@/services/notifications/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';

jest.mock('@/services/notifications/api', () => ({
  getNotifications: jest.fn(),
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

const mockGetNotifications = getNotifications as jest.MockedFunction<any>;

describe('IssueNotification Component', () => {
  const onDataLoadedMock = jest.fn();
  const defaultProps = {
    timeFilter: 3,
    onDataLoaded: onDataLoadedMock,
  };

  const mockNotificationData = {
    success: true,
    data: [
      {
        key: 'notification-1',
        id: 'notification-1',
        type: 'validation_issue',
        datasetType: 'process data set',
        datasetId: 'process-1',
        datasetVersion: '01.00.000',
        senderName: 'Alice',
        modifiedAt: '2024-05-01T10:00:00.000Z',
        link: 'https://example.com/process-1',
        json: {
          issueCodes: ['ruleVerificationFailed'],
        },
      },
      {
        key: 'notification-2',
        id: 'notification-2',
        type: 'validation_issue',
        datasetType: 'source data set',
        datasetId: 'source-1',
        datasetVersion: '02.00.000',
        senderName: '-',
        modifiedAt: 'invalid-date',
      },
    ],
    total: 2,
    page: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNotifications.mockResolvedValue(mockNotificationData);
    onDataLoadedMock.mockResolvedValue(undefined);
  });

  it('renders fetched notifications and message text', async () => {
    render(
      <ConfigProvider>
        <IssueNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Process')).toBeInTheDocument();
      expect(screen.getByText('process-1')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Dataset validation did not pass')).toBeInTheDocument();
    });
  });

  it('fetches notifications on mount and when timeFilter changes', async () => {
    const { rerender } = render(
      <ConfigProvider>
        <IssueNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(mockGetNotifications).toHaveBeenCalledWith({ pageSize: 10, current: 1 }, 3);
    });

    rerender(
      <ConfigProvider>
        <IssueNotification {...defaultProps} timeFilter={7} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(mockGetNotifications).toHaveBeenCalledWith({ pageSize: 10, current: 1 }, 7);
    });
  });

  it('renders the expected columns', async () => {
    render(
      <ConfigProvider>
        <IssueNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Dataset type')).toBeInTheDocument();
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Version')).toBeInTheDocument();
      expect(screen.getByText('Requester')).toBeInTheDocument();
      expect(screen.getByText('Issue')).toBeInTheDocument();
      expect(screen.getByText('Modified At')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  it('formats valid and invalid notification times', async () => {
    render(
      <ConfigProvider>
        <IssueNotification {...defaultProps} />
      </ConfigProvider>,
    );

    const expected = new Date('2024-05-01T10:00:00.000Z');
    const expectedString = `${expected.getFullYear()}-${expected.getMonth() + 1}-${expected.getDate()} ${expected
      .getHours()
      .toString()
      .padStart(2, '0')}:${expected
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${expected.getSeconds().toString().padStart(2, '0')}`;

    await waitFor(() => {
      expect(screen.getByText(expectedString)).toBeInTheDocument();
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });
  });

  it('falls back to "A user" when sender name is unavailable', async () => {
    render(
      <ConfigProvider>
        <IssueNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('A user')).toBeInTheDocument();
    });
  });

  it('renders specific issues from issue codes and falls back for generic issue types', async () => {
    mockGetNotifications.mockResolvedValueOnce({
      success: true,
      data: [
        {
          key: 'notification-special',
          id: 'notification-special',
          type: 'validation_issue',
          datasetType: 'process data set',
          datasetId: 'process-special',
          datasetVersion: '01.00.000',
          senderName: 'Bob',
          modifiedAt: '2024-05-01T10:00:00.000Z',
          json: {
            issueCodes: ['versionUnderReview', 'customIssue', 'versionUnderReview', '', 123 as any],
          },
        },
      ],
      total: 1,
      page: 1,
    });

    render(
      <ConfigProvider>
        <IssueNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Another version of this dataset is already under review.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Validation issue')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('renders the remaining built-in validation issue labels', async () => {
    mockGetNotifications.mockResolvedValueOnce({
      success: true,
      data: [
        {
          key: 'notification-built-in-issues',
          id: 'notification-built-in-issues',
          type: 'validation_issue',
          datasetType: 'source data set',
          datasetId: 'source-built-in',
          datasetVersion: '01.00.000',
          senderName: 'Carol',
          modifiedAt: '2024-05-01T10:00:00.000Z',
          json: {
            issueCodes: ['sdkInvalid', 'nonExistentRef', 'underReview', 'versionIsInTg'],
          },
        },
      ],
      total: 1,
      page: 1,
    });

    render(
      <ConfigProvider>
        <IssueNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Current dataset validation failed')).toBeInTheDocument();
      expect(screen.getByText('Dataset does not exist')).toBeInTheDocument();
      expect(screen.getByText('Dataset is under review')).toBeInTheDocument();
      expect(
        screen.getByText('Current version is lower than the published version'),
      ).toBeInTheDocument();
    });
  });

  it('renders additional dataset type labels, falls back to raw types, and formats dash timestamps', async () => {
    mockGetNotifications.mockResolvedValueOnce({
      success: true,
      data: [
        {
          key: 'notification-contact',
          id: 'notification-contact',
          type: 'validation_issue',
          datasetType: 'contact data set',
          datasetId: 'contact-1',
          datasetVersion: '01.00.000',
          senderName: 'Alice',
          modifiedAt: '-',
        },
        {
          key: 'notification-unit-group',
          id: 'notification-unit-group',
          type: 'validation_issue',
          datasetType: 'unit group data set',
          datasetId: 'unitgroup-1',
          datasetVersion: '01.00.000',
          senderName: 'Alice',
          modifiedAt: '2024-05-01T10:00:00.000Z',
        },
        {
          key: 'notification-flow-property',
          id: 'notification-flow-property',
          type: 'validation_issue',
          datasetType: 'flow property data set',
          datasetId: 'flowproperty-1',
          datasetVersion: '01.00.000',
          senderName: 'Alice',
          modifiedAt: '2024-05-01T10:00:00.000Z',
        },
        {
          key: 'notification-flow',
          id: 'notification-flow',
          type: 'validation_issue',
          datasetType: 'flow data set',
          datasetId: 'flow-1',
          datasetVersion: '01.00.000',
          senderName: 'Alice',
          modifiedAt: '2024-05-01T10:00:00.000Z',
        },
        {
          key: 'notification-model',
          id: 'notification-model',
          type: 'validation_issue',
          datasetType: 'lifeCycleModel data set',
          datasetId: 'model-1',
          datasetVersion: '01.00.000',
          senderName: 'Alice',
          modifiedAt: '2024-05-01T10:00:00.000Z',
        },
        {
          key: 'notification-custom',
          id: 'notification-custom',
          type: 'validation_issue',
          datasetType: 'custom data set',
          datasetId: 'custom-1',
          datasetVersion: '01.00.000',
          senderName: 'Alice',
          modifiedAt: '2024-05-01T10:00:00.000Z',
        },
      ],
      total: 6,
      page: 1,
    });

    render(
      <ConfigProvider>
        <IssueNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByText('Unit group')).toBeInTheDocument();
      expect(screen.getByText('Flow property')).toBeInTheDocument();
      expect(screen.getByText('Flow')).toBeInTheDocument();
      expect(screen.getByText('Lifecycle model')).toBeInTheDocument();
      expect(screen.getByText('custom data set')).toBeInTheDocument();
    });
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('opens the dataset link in a new window when view is clicked', async () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <ConfigProvider>
        <IssueNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('View'));
    });

    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/process-1',
      '_blank',
      'noopener,noreferrer',
    );

    openSpy.mockRestore();
  });

  it('renders a dash when a notification row has no view link', async () => {
    render(
      <ConfigProvider>
        <IssueNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('source-1')).toBeInTheDocument();
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });
  });

  it('handles pagination changes and avoids re-calling onDataLoaded', async () => {
    mockGetNotifications.mockResolvedValue({
      ...mockNotificationData,
      total: 25,
    });

    render(
      <ConfigProvider>
        <IssueNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(onDataLoadedMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Items 1-10 of 25')).toBeInTheDocument();
    });

    const nextButton = await screen.findByTitle('Next Page');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockGetNotifications).toHaveBeenCalledWith({ pageSize: 10, current: 2 }, 3);
    });
    expect(onDataLoadedMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to empty rows and zero total when a success payload omits data and total', async () => {
    onDataLoadedMock.mockClear();
    mockGetNotifications.mockResolvedValueOnce({
      success: true,
      page: 1,
    } as any);

    render(
      <ConfigProvider>
        <IssueNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(onDataLoadedMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText('process-1')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Next Page')).not.toBeInTheDocument();
  });

  it('logs fetch failures and tolerates unsuccessful responses', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockGetNotifications.mockRejectedValueOnce(new Error('Fetch failed')).mockResolvedValueOnce({
      success: false,
      data: [],
      total: 0,
      page: 1,
    });

    const { rerender } = render(
      <ConfigProvider>
        <IssueNotification {...defaultProps} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('获取问题通知失败:', expect.any(Error));
    });

    rerender(
      <ConfigProvider>
        <IssueNotification {...defaultProps} timeFilter={7} />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(mockGetNotifications).toHaveBeenCalledWith({ pageSize: 10, current: 1 }, 7);
    });
    expect(onDataLoadedMock).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
