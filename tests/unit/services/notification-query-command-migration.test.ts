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
    from: jest.fn(),
  },
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  resolveFunctionInvokeError: (...args: any[]) => mockResolveFunctionInvokeError.apply(null, args),
  invokeDatasetCommand: jest.fn(),
}));

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  getLifeCyclesByIdAndVersion: jest.fn().mockResolvedValue({ data: [] }),
}));

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessName: (value: any) => value?.baseName?.en ?? '-',
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLangText: (value: any, lang: string) => value?.[lang] ?? '-',
}));

import {
  getNotifications,
  getNotificationsCount,
  upsertValidationIssueNotification,
} from '@/services/notifications/api';
import { getNotifyReviews, getNotifyReviewsCount } from '@/services/reviews/api';
import { getTeamInvitationCountApi, getTeamInvitationStatusApi } from '@/services/roles/api';

describe('notification query and command migration boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1' },
          access_token: 'token',
        },
      },
    });
  });

  it('routes team, data, and issue reads through dedicated query rpc boundaries', async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: [{ team_id: 'team-1', user_id: 'user-1', role: 'is_invited' }],
        error: null,
      })
      .mockResolvedValueOnce({ data: 2, error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: 3, error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: 4, error: null });

    await getTeamInvitationStatusApi(3);
    await getTeamInvitationCountApi(3, 0);
    await getNotifyReviews({ pageSize: 10, current: 1 }, 'en', 3);
    await getNotifyReviewsCount(3, 0);
    await getNotifications({ pageSize: 10, current: 1 }, 3);
    await getNotificationsCount(3, 0);

    expect(mockRpc.mock.calls.map((call) => call[0])).toEqual([
      'qry_notification_get_my_team_items',
      'qry_notification_get_my_team_count',
      'qry_notification_get_my_data_items',
      'qry_notification_get_my_data_count',
      'qry_notification_get_my_issue_items',
      'qry_notification_get_my_issue_count',
    ]);
  });

  it('routes validation issue sends through the explicit notification command', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: { ok: true },
      error: null,
    });

    await upsertValidationIssueNotification({
      recipientUserId: 'user-2',
      sourceRef: {
        '@type': 'process data set',
        '@refObjectId': 'process-source-1',
        '@version': '01.00.000',
      },
      ref: {
        '@type': 'process data set',
        '@refObjectId': 'process-1',
        '@version': '01.00.000',
      },
      issues: [{ code: 'ruleVerificationFailed', tabName: 'processInformation' }],
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      'app_notification_send_validation_issue',
      expect.objectContaining({
        body: expect.objectContaining({
          recipientUserId: 'user-2',
          sourceDatasetType: 'process data set',
          sourceDatasetId: 'process-source-1',
          sourceDatasetVersion: '01.00.000',
          datasetType: 'process data set',
          datasetId: 'process-1',
          datasetVersion: '01.00.000',
        }),
      }),
    );
  });
});
