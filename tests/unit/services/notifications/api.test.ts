import { FunctionRegion } from '@supabase/supabase-js';

const mockAuthGetSession = jest.fn();
const mockFunctionsInvoke = jest.fn();
const mockRpc = jest.fn();
const mockResolveFunctionInvokeError = jest.fn();

jest.mock('@/services/supabase', () => ({
  __esModule: true,
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockAuthGetSession.apply(null, args),
    },
    functions: {
      invoke: (...args: any[]) => mockFunctionsInvoke.apply(null, args),
    },
    rpc: (...args: any[]) => mockRpc.apply(null, args),
  },
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  resolveFunctionInvokeError: (...args: any[]) => mockResolveFunctionInvokeError.apply(null, args),
}));

import * as notificationsApi from '@/services/notifications/api';

describe('Notifications API service (src/services/notifications/api.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'sender-user-id' },
          access_token: 'access-token',
        },
      },
    });
    mockResolveFunctionInvokeError.mockResolvedValue({
      message: 'Resolved function error',
      code: 'FUNCTION_ERROR',
      details: 'details',
      status: 400,
    });
  });

  describe('upsertValidationIssueNotification', () => {
    it('returns failure when the sender session is unavailable', async () => {
      mockAuthGetSession.mockResolvedValueOnce({
        data: {
          session: null,
        },
      });

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
      expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    });

    it('returns failure when the target dataset reference is incomplete', async () => {
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
      expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    });

    it('returns failure when the sender and recipient are the same user', async () => {
      const result = await notificationsApi.upsertValidationIssueNotification({
        recipientUserId: 'sender-user-id',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
        issues: [],
      });

      expect(result.success).toBe(false);
      expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    });

    it('invokes the explicit notification command with normalized payload', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { ok: true },
        error: null,
      });

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
          {
            code: 'sdkInvalid',
            tabName: 'processInformation',
            tabNames: 'modellingAndValidation' as any,
          },
        ],
      });

      expect(mockFunctionsInvoke).toHaveBeenCalledWith('app_notification_send_validation_issue', {
        headers: {
          Authorization: 'Bearer access-token',
        },
        body: {
          recipientUserId: 'owner-1',
          datasetType: 'process data set',
          datasetId: 'process-1',
          datasetVersion: '01.00.000',
          issueCodes: ['ruleVerificationFailed', 'sdkInvalid'],
          issueCount: 4,
          link: 'https://example.com/process-1',
          tabNames: ['processInformation', 'modellingAndValidation'],
        },
        region: FunctionRegion.UsEast1,
      });
      expect(result).toEqual({ success: true, error: null });
    });

    it('drops unsafe navigation links before invoking the notification command', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { ok: true },
        error: null,
      });

      await notificationsApi.upsertValidationIssueNotification({
        recipientUserId: ' owner-1 ',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
        link: ' javascript:alert(1) ',
        issues: [],
      });

      expect(mockFunctionsInvoke).toHaveBeenCalledWith('app_notification_send_validation_issue', {
        headers: {
          Authorization: 'Bearer access-token',
        },
        body: {
          recipientUserId: 'owner-1',
          datasetType: 'process data set',
          datasetId: 'process-1',
          datasetVersion: '01.00.000',
          issueCodes: [],
          issueCount: 0,
          link: undefined,
          tabNames: [],
        },
        region: FunctionRegion.UsEast1,
      });
    });

    it('maps function invoke errors through resolveFunctionInvokeError', async () => {
      const invokeError = { message: 'Edge failed', context: { status: 500 } as any };
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: invokeError,
      });
      mockResolveFunctionInvokeError.mockResolvedValueOnce({
        message: 'Command failed',
        code: 'EDGE_FAILURE',
        details: { retryable: false },
        status: 500,
      });

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
      expect(result.error).toMatchObject({
        message: 'Command failed',
        code: 'EDGE_FAILURE',
        details: { retryable: false },
        status: 500,
      });
    });

    it('maps command envelopes with ok=false to an error result', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: {
          ok: false,
          code: 'NOTIFICATION_SELF_TARGET',
          message: 'The recipient must differ from the actor',
          status: 409,
        },
        error: null,
      });

      const result = await notificationsApi.upsertValidationIssueNotification({
        recipientUserId: 'owner-2',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-2',
          '@version': '01.00.000',
        },
        issues: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        message: 'The recipient must differ from the actor',
        code: 'NOTIFICATION_SELF_TARGET',
        status: 409,
      });
    });

    it('uses an empty bearer token and the default request-failed message when command payloads are sparse', async () => {
      mockAuthGetSession.mockResolvedValueOnce({
        data: {
          session: {
            user: { id: 'sender-user-id' },
          },
        },
      });
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: {
          ok: false,
          code: 'NO_MESSAGE',
        },
        error: null,
      });

      const result = await notificationsApi.upsertValidationIssueNotification({
        recipientUserId: 'owner-2',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-2',
          '@version': '01.00.000',
        },
        issues: [],
      });

      expect(mockFunctionsInvoke).toHaveBeenCalledWith('app_notification_send_validation_issue', {
        headers: {
          Authorization: 'Bearer ',
        },
        body: {
          recipientUserId: 'owner-2',
          datasetType: 'process data set',
          datasetId: 'process-2',
          datasetVersion: '01.00.000',
          issueCodes: [],
          issueCount: 0,
          link: undefined,
          tabNames: [],
        },
        region: FunctionRegion.UsEast1,
      });
      expect(result.error).toMatchObject({
        message: 'Request failed',
        code: 'NO_MESSAGE',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('getNotifications', () => {
    it('returns failure response when the current session is missing', async () => {
      mockAuthGetSession.mockResolvedValueOnce({
        data: {
          session: null,
        },
      });

      const result = await notificationsApi.getNotifications({ pageSize: 10, current: 1 }, 3);

      expect(result).toEqual({ data: [], success: false, total: 0 });
    });

    it('loads issue notifications from the dedicated query rpc', async () => {
      mockRpc.mockResolvedValueOnce({
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
            total_count: 1,
          },
        ],
        error: null,
      });

      const result = await notificationsApi.getNotifications({ pageSize: 5, current: 2 }, 3);

      expect(mockRpc).toHaveBeenCalledWith('qry_notification_get_my_issue_items', {
        p_page: 2,
        p_page_size: 5,
        p_days: 3,
      });
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

    it('filters unsafe notification links returned from the query rpc', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          {
            id: 'notification-unsafe-link',
            type: 'validation_issue',
            dataset_type: 'process data set',
            dataset_id: 'process-1',
            dataset_version: '01.00.000',
            modified_at: '2024-04-30T12:00:00.000Z',
            json: {
              senderName: 'Alice',
              link: 'javascript:alert(1)',
            },
            total_count: 1,
          },
        ],
        error: null,
      });

      const result = await notificationsApi.getNotifications({ pageSize: 5, current: 1 }, 3);

      expect(result).toEqual({
        data: [
          {
            key: 'notification-unsafe-link',
            id: 'notification-unsafe-link',
            type: 'validation_issue',
            datasetType: 'process data set',
            datasetId: 'process-1',
            datasetVersion: '01.00.000',
            senderName: 'Alice',
            modifiedAt: '2024-04-30T12:00:00.000Z',
            link: undefined,
            json: {
              senderName: 'Alice',
              link: 'javascript:alert(1)',
            },
          },
        ],
        page: 1,
        success: true,
        total: 1,
      });
    });

    it('returns empty success response when no notifications are found', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await notificationsApi.getNotifications({ pageSize: 10, current: 1 }, 0);

      expect(result).toEqual({ data: [], success: true, total: 0 });
    });

    it('returns failure response when the rpc payload is malformed', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null });

      const result = await notificationsApi.getNotifications({ pageSize: 10, current: 1 }, 0);

      expect(result).toEqual({ data: [], success: false, total: 0 });
    });

    it('normalizes invalid timestamps and blank sender/link values', async () => {
      mockRpc.mockResolvedValueOnce({
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
            total_count: 1,
          },
        ],
        error: null,
      });

      const result = await notificationsApi.getNotifications({ pageSize: 10, current: 1 }, 0);

      expect(result.data[0]).toMatchObject({
        senderName: '-',
        modifiedAt: '',
        link: undefined,
      });
    });

    it('uses default pagination and json fallbacks when params or totals are omitted', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          {
            id: 'notification-defaults',
            type: 'validation_issue',
            dataset_type: 'process data set',
            dataset_id: 'process-9',
            dataset_version: '09.00.000',
            modified_at: 'invalid-date',
            json: null,
          },
          {
            id: 'notification-3',
            type: 'validation_issue',
            dataset_type: 'process data set',
            dataset_id: 'process-3',
            dataset_version: '03.00.000',
            modified_at: '2024-04-30T12:00:00.000Z',
            json: null,
          },
        ],
        error: null,
      });

      const result = await notificationsApi.getNotifications({} as any);

      expect(mockRpc).toHaveBeenCalledWith('qry_notification_get_my_issue_items', {
        p_page: 1,
        p_page_size: 10,
        p_days: 3,
      });
      expect(result).toEqual({
        data: [
          {
            key: 'notification-defaults',
            id: 'notification-defaults',
            type: 'validation_issue',
            datasetType: 'process data set',
            datasetId: 'process-9',
            datasetVersion: '09.00.000',
            senderName: '-',
            modifiedAt: '',
            link: undefined,
            json: undefined,
          },
          {
            key: 'notification-3',
            id: 'notification-3',
            type: 'validation_issue',
            datasetType: 'process data set',
            datasetId: 'process-3',
            datasetVersion: '03.00.000',
            senderName: '-',
            modifiedAt: '2024-04-30T12:00:00.000Z',
            link: undefined,
            json: undefined,
          },
        ],
        page: 1,
        success: true,
        total: 0,
      });
    });
  });

  describe('getNotificationsCount', () => {
    it('returns failure when the current session is missing', async () => {
      mockAuthGetSession.mockResolvedValueOnce({
        data: {
          session: null,
        },
      });

      const result = await notificationsApi.getNotificationsCount(3, 0);

      expect(result).toEqual({ success: false, total: 0 });
    });

    it('filters unread notifications using the lastViewTime parameter', async () => {
      mockRpc.mockResolvedValueOnce({ data: 4, error: null });

      const result = await notificationsApi.getNotificationsCount(3, 1714550400000);

      expect(mockRpc).toHaveBeenCalledWith('qry_notification_get_my_issue_count', {
        p_days: 3,
        p_last_view_at: new Date(1714550400000).toISOString(),
      });
      expect(result).toEqual({ success: true, total: 4 });
    });

    it('uses the default time filter and falls back to zero when the count is missing', async () => {
      mockRpc.mockResolvedValueOnce({ data: undefined, error: null });

      const result = await notificationsApi.getNotificationsCount();

      expect(mockRpc).toHaveBeenCalledWith('qry_notification_get_my_issue_count', {
        p_days: 3,
        p_last_view_at: null,
      });
      expect(result).toEqual({ success: true, total: 0 });
    });

    it('reports rpc failures as unsuccessful notification counts', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'db failed' } });

      const result = await notificationsApi.getNotificationsCount(7);

      expect(result).toEqual({ success: false, total: 0 });
    });

    it('returns an unsuccessful count response when the rpc fails', async () => {
      mockRpc.mockResolvedValueOnce({ data: 9, error: { message: 'count failed' } });

      const result = await notificationsApi.getNotificationsCount(5, 0);

      expect(result).toEqual({ success: false, total: 9 });
    });
  });
});
