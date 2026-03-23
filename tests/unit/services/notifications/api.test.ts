/**
 * Tests for notifications service API functions
 * Path: src/services/notifications/api.ts
 */

const mockFrom = jest.fn();
const mockGetCurrentUser = jest.fn();
const mockGetUserId = jest.fn();

jest.mock('@/services/supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...args: any[]) => mockFrom.apply(null, args),
  },
}));

jest.mock('@/services/auth', () => ({
  __esModule: true,
  getCurrentUser: (...args: any[]) => mockGetCurrentUser.apply(null, args),
}));

jest.mock('@/services/users/api', () => ({
  __esModule: true,
  getUserId: (...args: any[]) => mockGetUserId.apply(null, args),
}));

import * as notificationsApi from '@/services/notifications/api';

const createQueryBuilder = <T>(resolvedValue: T) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    then: (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject),
  };
  return builder;
};

describe('Notifications API service (src/services/notifications/api.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({
      name: 'Sender User',
      email: 'sender@example.com',
    });
    mockGetUserId.mockResolvedValue('sender-user-id');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('upsertValidationIssueNotification', () => {
    it('returns failure when the sender is unavailable', async () => {
      mockGetUserId.mockResolvedValueOnce(null);

      const result = await notificationsApi.upsertValidationIssueNotification({
        recipientUserId: 'owner-1',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
        issues: [],
      });

      expect(result.success).toBe(false);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('returns failure when the dataset reference is incomplete', async () => {
      const result = await notificationsApi.upsertValidationIssueNotification({
        recipientUserId: 'owner-1',
        ref: {
          '@type': '',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
        issues: [],
      });

      expect(result.success).toBe(false);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('upserts a normalized validation issue payload', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValueOnce({ upsert: mockUpsert });

      const now = new Date('2024-05-01T08:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      const result = await notificationsApi.upsertValidationIssueNotification({
        recipientUserId: ' owner-1 ',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
        link: ' https://example.com/process-1 ',
        issues: [
          {
            code: 'ruleVerificationFailed',
            tabName: 'processInformation',
            tabNames: ['processInformation', 'modellingAndValidation'],
          },
          {
            code: 'ruleVerificationFailed',
            tabName: 'processInformation',
            tabNames: ['modellingAndValidation'],
          },
          {
            code: 'sdkInvalid',
            tabNames: ['modellingAndValidation'],
          },
        ],
      });

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          recipient_user_id: 'owner-1',
          sender_user_id: 'sender-user-id',
          type: 'validation_issue',
          dataset_type: 'process data set',
          dataset_id: 'process-1',
          dataset_version: '01.00.000',
          modified_at: now.toISOString(),
          json: {
            issueCodes: ['ruleVerificationFailed', 'sdkInvalid'],
            issueCount: 3,
            link: 'https://example.com/process-1',
            senderName: 'Sender User',
            tabNames: ['processInformation', 'modellingAndValidation'],
          },
        },
        {
          onConflict:
            'recipient_user_id,sender_user_id,type,dataset_type,dataset_id,dataset_version',
        },
      );
      expect(result).toEqual({ success: true, error: null });
    });

    it('falls back to sender email when the current user has no display name', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValueOnce({ upsert: mockUpsert });
      mockGetCurrentUser.mockResolvedValueOnce({
        email: 'sender-only@example.com',
      });

      await notificationsApi.upsertValidationIssueNotification({
        recipientUserId: 'owner-1',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
        issues: [],
      });

      expect(mockUpsert.mock.calls[0]?.[0]?.json?.senderName).toBe('sender-only@example.com');
    });

    it('falls back to a dash sender name and empty tab names when profile fields are blank', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValueOnce({ upsert: mockUpsert });
      mockGetCurrentUser.mockResolvedValueOnce({
        name: '   ',
        email: '   ',
      });

      await notificationsApi.upsertValidationIssueNotification({
        recipientUserId: 'owner-1',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
        issues: [
          {
            code: 'ruleVerificationFailed',
            tabName: '   ',
          },
        ],
      });

      expect(mockUpsert.mock.calls[0]?.[0]?.json).toMatchObject({
        senderName: '-',
        tabNames: [],
      });
    });

    it('propagates Supabase upsert errors to the caller', async () => {
      const upsertError = { message: 'insert failed' };
      const mockUpsert = jest.fn().mockResolvedValue({ error: upsertError });
      mockFrom.mockReturnValueOnce({ upsert: mockUpsert });

      const result = await notificationsApi.upsertValidationIssueNotification({
        recipientUserId: 'owner-1',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
        issues: [],
      });

      expect(result).toEqual({ success: false, error: upsertError });
    });
  });

  describe('getNotifications', () => {
    it('returns failure response when the current user is missing', async () => {
      mockGetUserId.mockResolvedValueOnce(undefined);

      const result = await notificationsApi.getNotifications({ pageSize: 10, current: 1 }, 3);

      expect(result).toEqual({ data: [], success: false, total: 0 });
    });

    it('returns notifications filtered by recent activity', async () => {
      const now = new Date('2024-05-01T08:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      const builder = createQueryBuilder({
        data: [
          {
            id: 'notification-1',
            type: 'validation_issue',
            dataset_type: 'process data set',
            dataset_id: 'process-1',
            dataset_version: '01.00.000',
            modified_at: '2024-04-30T12:00:00.000Z',
            json: {
              senderName: 'Alice',
              link: 'https://example.com/process-1',
            },
          },
        ],
        count: 1,
      });
      mockFrom.mockReturnValueOnce(builder);

      const result = await notificationsApi.getNotifications({ pageSize: 5, current: 2 }, 3);

      expect(builder.eq).toHaveBeenNthCalledWith(1, 'recipient_user_id', 'sender-user-id');
      expect(builder.eq).toHaveBeenNthCalledWith(2, 'type', 'validation_issue');
      expect(builder.gte).toHaveBeenCalledWith(
        'modified_at',
        new Date('2024-04-28T08:00:00.000Z').toISOString(),
      );
      expect(result).toEqual({
        data: [
          {
            key: 'notification-1',
            id: 'notification-1',
            type: 'validation_issue',
            datasetType: 'process data set',
            datasetId: 'process-1',
            datasetVersion: '01.00.000',
            senderName: 'Alice',
            modifiedAt: '2024-04-30T12:00:00.000Z',
            link: 'https://example.com/process-1',
            json: {
              senderName: 'Alice',
              link: 'https://example.com/process-1',
            },
          },
        ],
        page: 2,
        success: true,
        total: 1,
      });
    });

    it('returns empty success response when no notifications are found', async () => {
      const builder = createQueryBuilder({ data: [], count: 0 });
      mockFrom.mockReturnValueOnce(builder);

      const result = await notificationsApi.getNotifications({ pageSize: 10, current: 1 }, 0);

      expect(builder.gte).not.toHaveBeenCalled();
      expect(result).toEqual({ data: [], success: true, total: 0 });
    });

    it('returns failure response when query payload is malformed', async () => {
      const builder = createQueryBuilder({ data: undefined, count: 0 });
      mockFrom.mockReturnValueOnce(builder);

      const result = await notificationsApi.getNotifications({ pageSize: 10, current: 1 }, 0);

      expect(result).toEqual({ data: [], success: false, total: 0 });
    });

    it('uses the default time filter and maps missing json payloads', async () => {
      const now = new Date('2024-05-01T08:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      const builder = createQueryBuilder({
        data: [
          {
            id: 'notification-3',
            type: 'validation_issue',
            dataset_type: 'flow data set',
            dataset_id: 'flow-1',
            dataset_version: '01.00.000',
            modified_at: '2024-04-30T12:00:00.000Z',
            json: null,
          },
        ],
        count: 1,
      });
      mockFrom.mockReturnValueOnce(builder);

      const result = await notificationsApi.getNotifications({ pageSize: 10, current: 1 });

      expect(builder.gte).toHaveBeenCalledWith(
        'modified_at',
        new Date('2024-04-28T08:00:00.000Z').toISOString(),
      );
      expect(result.data[0]).toMatchObject({
        senderName: '-',
        link: undefined,
        json: undefined,
      });
    });

    it('normalizes invalid timestamps, blank sender names, and blank links', async () => {
      const builder = createQueryBuilder({
        data: [
          {
            id: 'notification-2',
            type: 'validation_issue',
            dataset_type: 'source data set',
            dataset_id: 'source-1',
            dataset_version: '02.00.000',
            modified_at: 'invalid-date',
            json: {
              senderName: '   ',
              link: '   ',
            },
          },
        ],
      });
      mockFrom.mockReturnValueOnce(builder);

      const result = await notificationsApi.getNotifications({ pageSize: 10, current: 1 }, 0);

      expect(result.data[0]).toMatchObject({
        senderName: '-',
        modifiedAt: '',
        link: undefined,
      });
    });

    it('uses default paging bounds and page numbers when params omit current and pageSize', async () => {
      const builder = createQueryBuilder({
        data: [
          {
            id: 'notification-4',
            type: 'validation_issue',
            dataset_type: 'process data set',
            dataset_id: 'process-4',
            dataset_version: '01.00.000',
            modified_at: '2024-04-30T12:00:00.000Z',
            json: {},
          },
        ],
        count: 1,
      });
      mockFrom.mockReturnValueOnce(builder);

      const result = await notificationsApi.getNotifications(
        { pageSize: undefined, current: undefined } as any,
        0,
      );

      expect(builder.range).toHaveBeenCalledWith(0, 9);
      expect(result).toMatchObject({ page: 1 });
    });
  });

  describe('getValidationIssueNotificationStatus', () => {
    it('returns failure response when the current user is missing', async () => {
      mockGetUserId.mockResolvedValueOnce('');

      const result = await notificationsApi.getValidationIssueNotificationStatus([
        {
          key: 'process data set:process-1:01.00.000',
          recipientUserId: 'owner-1',
          ref: {
            '@type': 'process data set',
            '@refObjectId': 'process-1',
            '@version': '01.00.000',
          },
        },
      ]);

      expect(result).toEqual({ data: {}, success: false });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('returns empty success response when no valid lookup items remain after normalization', async () => {
      const result = await notificationsApi.getValidationIssueNotificationStatus([
        {
          key: '   ',
          recipientUserId: 'owner-1',
          ref: {
            '@type': 'process data set',
            '@refObjectId': 'process-1',
            '@version': '01.00.000',
          },
        },
        {
          key: 'process data set:process-2:01.00.000',
          recipientUserId: '   ',
          ref: {
            '@type': 'process data set',
            '@refObjectId': 'process-2',
            '@version': '01.00.000',
          },
        },
      ]);

      expect(result).toEqual({ data: {}, success: true });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('returns per-row notified states for matching validation issue notifications', async () => {
      const builder = createQueryBuilder({
        data: [
          {
            recipient_user_id: 'owner-1',
            dataset_type: 'process data set',
            dataset_id: 'process-1',
            dataset_version: '01.00.000',
          },
        ],
        error: null,
      });
      mockFrom.mockReturnValueOnce(builder);

      const result = await notificationsApi.getValidationIssueNotificationStatus([
        {
          key: 'process data set:process-1:01.00.000',
          recipientUserId: ' owner-1 ',
          ref: {
            '@type': 'process data set',
            '@refObjectId': 'process-1',
            '@version': '01.00.000',
          },
        },
        {
          key: 'source data set:source-1:02.00.000',
          recipientUserId: 'owner-2',
          ref: {
            '@type': 'source data set',
            '@refObjectId': 'source-1',
            '@version': '02.00.000',
          },
        },
      ]);

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(builder.eq).toHaveBeenNthCalledWith(1, 'sender_user_id', 'sender-user-id');
      expect(builder.eq).toHaveBeenNthCalledWith(2, 'type', 'validation_issue');
      expect(builder.in).toHaveBeenNthCalledWith(1, 'recipient_user_id', ['owner-1', 'owner-2']);
      expect(builder.in).toHaveBeenNthCalledWith(2, 'dataset_type', [
        'process data set',
        'source data set',
      ]);
      expect(builder.in).toHaveBeenNthCalledWith(3, 'dataset_id', ['process-1', 'source-1']);
      expect(builder.in).toHaveBeenNthCalledWith(4, 'dataset_version', ['01.00.000', '02.00.000']);
      expect(result).toEqual({
        data: {
          'process data set:process-1:01.00.000': true,
          'source data set:source-1:02.00.000': false,
        },
        success: true,
      });
    });

    it('returns failure when the notification-status query is malformed or throws', async () => {
      const malformedBuilder = createQueryBuilder({
        data: undefined,
        error: null,
      });
      mockFrom.mockReturnValueOnce(malformedBuilder).mockImplementationOnce(() => {
        throw new Error('query failed');
      });

      const malformedResult = await notificationsApi.getValidationIssueNotificationStatus([
        {
          key: 'process data set:process-3:01.00.000',
          recipientUserId: 'owner-3',
          ref: {
            '@type': 'process data set',
            '@refObjectId': 'process-3',
            '@version': '01.00.000',
          },
        },
      ]);
      const thrownResult = await notificationsApi.getValidationIssueNotificationStatus([
        {
          key: 'process data set:process-4:01.00.000',
          recipientUserId: 'owner-4',
          ref: {
            '@type': 'process data set',
            '@refObjectId': 'process-4',
            '@version': '01.00.000',
          },
        },
      ]);

      expect(malformedResult).toEqual({ data: {}, success: false });
      expect(thrownResult).toEqual({ data: {}, success: false });
    });
  });

  describe('getNotificationsCount', () => {
    it('returns failure when the current user is missing', async () => {
      mockGetUserId.mockResolvedValueOnce('');

      const result = await notificationsApi.getNotificationsCount(3, 0);

      expect(result).toEqual({ success: false, total: 0 });
    });

    it('filters unread notifications using lastViewTime when provided', async () => {
      const builder = createQueryBuilder({ count: 4, error: null });
      mockFrom.mockReturnValueOnce(builder);

      const result = await notificationsApi.getNotificationsCount(3, 1714550400000);

      expect(builder.gt).toHaveBeenCalledWith('modified_at', new Date(1714550400000).toISOString());
      expect(builder.gte).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, total: 4 });
    });

    it('falls back to time filter when no lastViewTime is available', async () => {
      const now = new Date('2024-05-01T08:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      const builder = createQueryBuilder({ count: 2, error: { message: 'count failed' } });
      mockFrom.mockReturnValueOnce(builder);

      const result = await notificationsApi.getNotificationsCount(7, 0);

      expect(builder.gte).toHaveBeenCalledWith(
        'modified_at',
        new Date('2024-04-24T08:00:00.000Z').toISOString(),
      );
      expect(result).toEqual({ success: false, total: 2 });
    });

    it('uses the default time filter and falls back to zero when the count is missing', async () => {
      const now = new Date('2024-05-01T08:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      const builder = createQueryBuilder({ count: undefined, error: null });
      mockFrom.mockReturnValueOnce(builder);

      const result = await notificationsApi.getNotificationsCount();

      expect(builder.gte).toHaveBeenCalledWith(
        'modified_at',
        new Date('2024-04-28T08:00:00.000Z').toISOString(),
      );
      expect(result).toEqual({ success: true, total: 0 });
    });
  });
});
