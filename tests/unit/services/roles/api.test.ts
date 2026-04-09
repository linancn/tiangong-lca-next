import {
  acceptTeamInvitationApi,
  addReviewMemberApi,
  addRoleApi,
  addSystemMemberApi,
  createTeamMessage,
  delRoleApi,
  getLatestRolesOfMine,
  getReviewMembersApi,
  getReviewUserRoleApi,
  getRoleByUserId,
  getRoleByuserId,
  getSystemMembersApi,
  getSystemUserRoleApi,
  getTeamInvitationCountApi,
  getTeamInvitationStatusApi,
  getTeamRoles,
  getUserIdsByTeamIds,
  getUserManageTableData,
  getUserRoles,
  getUserTeamId,
  reInvitedApi,
  rejectTeamInvitationApi,
  updateRoleApi,
} from '@/services/roles/api';

const SYSTEM_TEAM_ID = '00000000-0000-0000-0000-000000000000';

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock('@/services/teams/api', () => ({
  addTeam: jest.fn(),
}));

jest.mock('@/services/users/api', () => ({
  getUserId: jest.fn(),
  getUserIdByEmail: jest.fn(),
}));

const { supabase } = jest.requireMock('@/services/supabase');
const { addTeam } = jest.requireMock('@/services/teams/api');
const { getUserId, getUserIdByEmail } = jest.requireMock('@/services/users/api');

const createQueryBuilder = (
  resolvedValue: {
    count?: number | null;
    data?: any;
    error?: any;
  } = {},
) => {
  const builder: any = {
    count: resolvedValue.count,
    data: resolvedValue.data,
    error: resolvedValue.error ?? null,
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest
      .fn()
      .mockResolvedValue({ data: resolvedValue.data, error: resolvedValue.error ?? null }),
    single: jest
      .fn()
      .mockResolvedValue({ data: resolvedValue.data, error: resolvedValue.error ?? null }),
    then: (resolve: any, reject?: any) =>
      Promise.resolve({
        data: resolvedValue.data,
        error: resolvedValue.error ?? null,
        count: resolvedValue.count,
      }).then(resolve, reject),
  };

  return builder;
};

const createRolesQueryBuilder = createQueryBuilder;

describe('roles api task-4 boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: '11111111-1111-1111-1111-111111111111' },
          access_token: 'token',
        },
      },
    });
    getUserId.mockResolvedValue('11111111-1111-1111-1111-111111111111');
  });

  it('routes team member list query to qry_team_get_member_list', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    await getTeamRoles({ current: 2, pageSize: 20 }, { modified_at: 'ascend' } as any, 'team-id');

    expect(supabase.rpc).toHaveBeenCalledWith('qry_team_get_member_list', {
      p_team_id: 'team-id',
      p_page: 2,
      p_page_size: 20,
      p_sort_by: 'modified_at',
      p_sort_order: 'asc',
    });
  });

  it('reads team-scoped role ownership rows for the current and target users', async () => {
    const userTeamBuilder = createQueryBuilder({
      data: [{ team_id: 'team-id' }],
    });
    const userRolesBuilder = createQueryBuilder({
      data: [
        { user_id: '11111111-1111-1111-1111-111111111111', team_id: 'team-id', role: 'admin' },
      ],
    });
    const byUserBuilder = createQueryBuilder({
      data: [{ user_id: 'user-id', team_id: 'team-id', role: 'member' }],
    });
    const byTeamIdsBuilder = createQueryBuilder({
      data: [{ user_id: 'user-a', team_id: 'team-a', role: 'owner' }],
    });
    const roleByCurrentUserBuilder = createQueryBuilder({
      data: [{ team_id: 'team-id', role: 'admin' }],
    });

    supabase.from
      .mockReturnValueOnce(userTeamBuilder)
      .mockReturnValueOnce(userRolesBuilder)
      .mockReturnValueOnce(byUserBuilder)
      .mockReturnValueOnce(byTeamIdsBuilder)
      .mockReturnValueOnce(roleByCurrentUserBuilder);

    const teamId = await getUserTeamId();
    const userRoles = await getUserRoles();
    const rolesByUser = await getRoleByuserId('user-id');
    const userIdsByTeam = await getUserIdsByTeamIds(['team-a']);
    const roleByCurrentUser = await getRoleByUserId();

    expect(teamId).toBe('team-id');
    expect(userRoles).toEqual({
      data: [
        { user_id: '11111111-1111-1111-1111-111111111111', team_id: 'team-id', role: 'admin' },
      ],
      success: true,
    });
    expect(rolesByUser).toEqual(
      expect.objectContaining({
        data: [{ user_id: 'user-id', team_id: 'team-id', role: 'member' }],
      }),
    );
    expect(userIdsByTeam).toEqual([{ user_id: 'user-a', team_id: 'team-a', role: 'owner' }]);
    expect(getUserId).toHaveBeenCalled();
    expect(roleByCurrentUser).toEqual([{ team_id: 'team-id', role: 'admin' }]);
  });

  it('routes addRoleApi by scope and reports missing auth for membership commands', async () => {
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });

    const reviewResult = await addRoleApi('user-id', SYSTEM_TEAM_ID, 'review-member');
    const systemResult = await addRoleApi('user-id', SYSTEM_TEAM_ID, 'member');
    const teamResult = await addRoleApi('user-id', 'team-id', 'admin');

    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      1,
      'admin_review_change_member_role',
      expect.objectContaining({
        body: { userId: 'user-id', role: 'review-member', action: 'set' },
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      2,
      'admin_system_change_member_role',
      expect.objectContaining({
        body: { userId: 'user-id', role: 'member', action: 'set' },
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      3,
      'admin_team_change_member_role',
      expect.objectContaining({
        body: { teamId: 'team-id', userId: 'user-id', role: 'admin', action: 'set' },
      }),
    );
    expect(reviewResult).toBeNull();
    expect(systemResult).toBeNull();
    expect(teamResult).toBeNull();

    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
    });

    const noSessionError = await addRoleApi('user-id', SYSTEM_TEAM_ID, 'member');

    expect(noSessionError).toEqual({ message: 'No session' });
  });

  it('routes role change by scope-specific commands and logs invoke failures', async () => {
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'boom' },
      });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const successResult = await updateRoleApi('team-id', 'user-id', 'admin');
    const failureResult = await updateRoleApi(SYSTEM_TEAM_ID, 'user-id', 'member');

    expect(successResult).toEqual({ ok: true, error: null });
    expect(failureResult).toEqual({
      error: { message: 'boom' },
    });
    expect(consoleSpy).toHaveBeenCalledWith('error', { message: 'boom' });
    consoleSpy.mockRestore();
  });

  it('logs and returns invoke errors when updateRoleApi cannot resolve a session', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
    });

    const result = await updateRoleApi('team-id', 'user-id', 'member');

    expect(result).toEqual({
      error: { message: 'No session' },
    });
    expect(consoleSpy).toHaveBeenCalledWith('error', { message: 'No session' });
    consoleSpy.mockRestore();
  });

  it('routes delete role across team, system, review, and fallback removal flows', async () => {
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'system remove failed' } })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });

    const teamResult = await delRoleApi('team-id', 'user-id', 'admin');
    const reviewResult = await delRoleApi(SYSTEM_TEAM_ID, 'user-id', 'review-member');
    const systemResult = await delRoleApi(SYSTEM_TEAM_ID, 'user-id', 'member');
    const fallbackResult = await delRoleApi(SYSTEM_TEAM_ID, 'user-id');

    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      1,
      'admin_team_change_member_role',
      expect.objectContaining({
        body: { teamId: 'team-id', userId: 'user-id', action: 'remove' },
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      2,
      'admin_review_change_member_role',
      expect.objectContaining({
        body: { userId: 'user-id', action: 'remove' },
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      3,
      'admin_system_change_member_role',
      expect.objectContaining({
        body: { userId: 'user-id', action: 'remove' },
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      5,
      'admin_review_change_member_role',
      expect.objectContaining({
        body: { userId: 'user-id', action: 'remove' },
      }),
    );
    expect(teamResult).toEqual({ ok: true, error: null });
    expect(reviewResult).toEqual({ ok: true, error: null });
    expect(systemResult).toEqual({ ok: true, error: null });
    expect(fallbackResult).toEqual({ ok: true, error: null });
  });

  it('routes invitation actions to explicit commands and logs failures', async () => {
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'accept failed' },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'reject failed' },
      });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const reinviteResult = await reInvitedApi('user-id', 'team-id');
    const acceptResult = await acceptTeamInvitationApi('team-id', 'ignored');
    const rejectResult = await rejectTeamInvitationApi('team-id', 'ignored');

    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      1,
      'admin_team_reinvite_member',
      expect.objectContaining({
        body: { teamId: 'team-id', userId: 'user-id' },
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      2,
      'app_team_accept_invitation',
      expect.objectContaining({
        body: { teamId: 'team-id' },
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      3,
      'app_team_reject_invitation',
      expect.objectContaining({
        body: { teamId: 'team-id' },
      }),
    );
    expect(reinviteResult).toBeNull();
    expect(acceptResult).toEqual({
      success: false,
      error: { message: 'accept failed' },
    });
    expect(rejectResult).toEqual({
      success: false,
      error: { message: 'reject failed' },
    });
    expect(consoleSpy).toHaveBeenCalledWith('error', { message: 'accept failed' });
    expect(consoleSpy).toHaveBeenCalledWith('error', { message: 'reject failed' });
    consoleSpy.mockRestore();
  });

  it('logs and returns invitation command failures', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    expect(await reInvitedApi('user-id', 'team-id')).toEqual({ message: 'No session' });
    expect(await acceptTeamInvitationApi('team-id', 'ignored')).toEqual({
      success: false,
      error: { message: 'No session' },
    });
    expect(await rejectTeamInvitationApi('team-id', 'ignored')).toEqual({
      success: false,
      error: { message: 'No session' },
    });

    expect(consoleSpy).toHaveBeenCalledWith('error', { message: 'No session' });
    consoleSpy.mockRestore();
  });

  it('loads team notification rows via qry_notification_get_my_team_items and handles empty/failure states', async () => {
    supabase.rpc
      .mockResolvedValueOnce({
        data: [
          {
            user_id: 'user-id',
            team_id: 'team-id',
            role: 'is_invited',
            team_title: [{ '@xml:lang': 'en', '#text': 'Team Title' }],
            modified_at: '2024-05-01T10:00:00.000Z',
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            user_id: 'user-id-2',
            team_id: 'team-id-2',
            role: 'is_invited',
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'rpc failed' },
      });

    const successResult = await getTeamInvitationStatusApi(7);
    const sparseResult = await getTeamInvitationStatusApi(5);
    const emptyResult = await getTeamInvitationStatusApi(3);
    const failureResult = await getTeamInvitationStatusApi(1);

    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'qry_notification_get_my_team_items', {
      p_days: 7,
    });
    expect(successResult).toEqual({
      success: true,
      data: {
        user_id: 'user-id',
        team_id: 'team-id',
        role: 'is_invited',
        teamTitle: [{ '@xml:lang': 'en', '#text': 'Team Title' }],
        modifiedAt: '2024-05-01T10:00:00.000Z',
      },
    });
    expect(sparseResult).toEqual({
      success: true,
      data: {
        user_id: 'user-id-2',
        team_id: 'team-id-2',
        role: 'is_invited',
        teamTitle: [],
        modifiedAt: null,
      },
    });
    expect(emptyResult).toEqual({
      success: true,
      data: null,
    });
    expect(failureResult).toEqual({
      success: false,
      data: null,
    });

    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
    });

    const noSessionResult = await getTeamInvitationStatusApi();

    expect(noSessionResult).toEqual({
      success: false,
      data: null,
    });
  });

  it('returns failure without a session and handles malformed team-notification payloads', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
    });

    const noSession = await getTeamInvitationStatusApi(7);

    expect(noSession).toEqual({
      success: false,
      data: null,
    });

    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const malformed = await getTeamInvitationStatusApi(7);

    expect(malformed).toEqual({
      success: false,
      data: null,
    });

    supabase.rpc.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const empty = await getTeamInvitationStatusApi(7);

    expect(empty).toEqual({
      success: true,
      data: null,
    });
  });

  it('maps undefined review member payloads to empty member rows', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: undefined,
      error: null,
    });

    const result = await getReviewMembersApi({ current: 1, pageSize: 10 }, {}, undefined);

    expect(result).toEqual({
      data: [],
      success: true,
      total: 0,
    });
  });

  it('maps undefined review workload payloads to empty member rows', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: undefined,
      error: null,
    });

    const result = await getUserManageTableData({ current: 1, pageSize: 10 }, {}, undefined);

    expect(result).toEqual({
      data: [],
      success: true,
      total: 0,
    });
  });

  it('loads team notification counts and handles empty, failure, and no-session states', async () => {
    supabase.rpc
      .mockResolvedValueOnce({
        data: 3,
        error: null,
      })
      .mockResolvedValueOnce({
        data: undefined,
        error: null,
      })
      .mockResolvedValueOnce({
        data: 0,
        error: { message: 'rpc failed' },
      });

    const lastViewTime = new Date('2024-05-01T00:00:00.000Z').getTime();
    const successResult = await getTeamInvitationCountApi(3, lastViewTime);
    const defaultResult = await getTeamInvitationCountApi();
    const failureResult = await getTeamInvitationCountApi(1, 0);

    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'qry_notification_get_my_team_count', {
      p_days: 3,
      p_last_view_at: new Date(lastViewTime).toISOString(),
    });
    expect(successResult).toEqual({
      success: true,
      data: [],
      total: 3,
    });
    expect(defaultResult).toEqual({
      success: true,
      data: [],
      total: 0,
    });
    expect(failureResult).toEqual({
      success: false,
      data: [],
      total: 0,
    });

    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
    });

    const noSessionResult = await getTeamInvitationCountApi();

    expect(noSessionResult).toEqual({
      success: false,
      data: [],
      total: 0,
    });
  });

  it('delegates team message creation through addTeam', async () => {
    addTeam.mockResolvedValueOnce({ message: 'error' });

    const result = await createTeamMessage('team-id', { title: 'Team' }, 3, true);

    expect(addTeam).toHaveBeenCalledWith('team-id', { title: 'Team' }, 3, true);
    expect(result).toEqual({ message: 'error' });
  });

  it('loads system and review member roles with success and failure fallbacks', async () => {
    const systemSuccessBuilder = createQueryBuilder({
      data: { user_id: 'user-id', role: 'member' },
      error: null,
    });
    const systemFailureBuilder = createQueryBuilder({
      data: null,
      error: { message: 'system failed' },
    });
    const reviewSuccessBuilder = createQueryBuilder({
      data: { user_id: 'user-id', role: 'review-member' },
      error: null,
    });
    const reviewFailureBuilder = createQueryBuilder({
      data: null,
      error: { message: 'review failed' },
    });
    supabase.from
      .mockReturnValueOnce(systemSuccessBuilder)
      .mockReturnValueOnce(systemFailureBuilder)
      .mockReturnValueOnce(reviewSuccessBuilder)
      .mockReturnValueOnce(reviewFailureBuilder);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const systemSuccess = await getSystemUserRoleApi();
    const systemFailure = await getSystemUserRoleApi();
    const reviewSuccess = await getReviewUserRoleApi();
    const reviewFailure = await getReviewUserRoleApi();

    expect(systemSuccess).toEqual({ user_id: 'user-id', role: 'member' });
    expect(systemFailure).toBeNull();
    expect(reviewSuccess).toEqual({ user_id: 'user-id', role: 'review-member' });
    expect(reviewFailure).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith({ message: 'system failed' });
    expect(consoleSpy).toHaveBeenCalledWith({ message: 'review failed' });
    consoleSpy.mockRestore();
  });

  it('loads system members via qry_system_get_member_list and falls back on rpc errors', async () => {
    supabase.rpc
      .mockResolvedValueOnce({
        data: [
          {
            user_id: 'u1',
            role: 'member',
            email: 'u1@example.com',
            display_name: 'U1',
            total_count: 12,
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: { message: 'system list failed' },
      });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const successResult = await getSystemMembersApi({ current: 1, pageSize: 10 }, {});
    const failureResult = await getSystemMembersApi({ current: 1, pageSize: 10 }, {});

    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'qry_system_get_member_list', {
      p_page: 1,
      p_page_size: 10,
      p_sort_by: 'created_at',
      p_sort_order: 'desc',
    });
    expect(successResult).toEqual({
      data: [
        {
          user_id: 'u1',
          role: 'member',
          email: 'u1@example.com',
          display_name: 'U1',
          team_id: SYSTEM_TEAM_ID,
          pendingCount: 0,
          reviewedCount: 0,
        },
      ],
      success: true,
      total: 12,
    });
    expect(failureResult).toEqual({
      data: [],
      total: 0,
      success: true,
    });
    expect(consoleSpy).toHaveBeenCalledWith({ message: 'system list failed' });
    consoleSpy.mockRestore();
  });

  it('falls back to zero totals and empty rows when member payloads omit rows or totals', async () => {
    supabase.rpc
      .mockResolvedValueOnce({
        data: undefined,
        error: null,
      })
      .mockResolvedValueOnce({
        data: undefined,
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            user_id: 'u-zero',
            role: 'member',
            total: 'not-a-number',
          },
        ],
        error: null,
      });

    const emptySystemMembers = await getSystemMembersApi({ current: 1, pageSize: 10 }, {});
    const emptyReviewMembers = await getReviewMembersApi(
      { current: 1, pageSize: 10 },
      {},
      undefined,
    );
    const invalidTotalWorkload = await getUserManageTableData(
      { current: 1, pageSize: 10 },
      {},
      undefined,
    );

    expect(emptySystemMembers).toEqual({
      data: [],
      success: true,
      total: 0,
    });
    expect(emptyReviewMembers).toEqual({
      data: [],
      success: true,
      total: 0,
    });
    expect(invalidTotalWorkload.total).toBe(0);
  });

  it('adds system member through admin_system_change_member_role command and handles failures', async () => {
    getUserIdByEmail
      .mockResolvedValueOnce('user-id')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('user-id-2');
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({
        data: { ok: false, code: 'FORBIDDEN', message: 'forbidden' },
        error: null,
      });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const successResult = await addSystemMemberApi('u@example.com');
    const notRegisteredResult = await addSystemMemberApi('missing@example.com');
    const failureResult = await addSystemMemberApi('u2@example.com');

    expect(getUserIdByEmail).toHaveBeenNthCalledWith(1, 'u@example.com');
    expect(successResult).toEqual({ success: true });
    expect(notRegisteredResult).toEqual({ success: false, error: 'notRegistered' });
    expect(failureResult).toEqual({ success: false });
    expect(consoleSpy).toHaveBeenCalledWith({
      ok: false,
      code: 'FORBIDDEN',
      message: 'forbidden',
    });
    consoleSpy.mockRestore();
  });

  it('loads review workload and review member lists with default mapping and fallbacks', async () => {
    supabase.rpc
      .mockResolvedValueOnce({
        data: [
          {
            user_id: 'u2',
            role: 'review-member',
            email: 'u2@example.com',
            display_name: 'U2',
            pending_count: 3,
            reviewed_count: 5,
            total_count: 1,
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            user_id: 'u3',
            role: 'review-member',
            total: 2,
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: { message: 'workload failed' },
      });

    const workloadResult = await getUserManageTableData(
      { current: 1, pageSize: 10 },
      { created_at: 'descend' } as any,
      'review-member',
    );
    const membersResult = await getReviewMembersApi({ current: 1, pageSize: 10 }, {}, undefined);
    const emptyMembersResult = await getReviewMembersApi(
      { current: 1, pageSize: 10 },
      {},
      'review-admin',
    );
    const workloadFailureResult = await getUserManageTableData(
      { current: 1, pageSize: 10 },
      {},
      undefined,
    );

    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'qry_review_get_member_workload', {
      p_page: 1,
      p_page_size: 10,
      p_sort_by: 'created_at',
      p_sort_order: 'desc',
      p_role: 'review-member',
    });
    expect(workloadResult.data[0]).toEqual(
      expect.objectContaining({
        user_id: 'u2',
        pendingCount: 3,
        reviewedCount: 5,
      }),
    );
    expect(membersResult).toEqual({
      data: [
        {
          user_id: 'u3',
          role: 'review-member',
          email: '',
          display_name: '-',
          team_id: SYSTEM_TEAM_ID,
          pendingCount: 0,
          reviewedCount: 0,
        },
      ],
      success: true,
      total: 2,
    });
    expect(emptyMembersResult).toEqual({
      data: [],
      total: 0,
      success: true,
    });
    expect(workloadFailureResult).toEqual({
      data: [],
      total: 0,
      success: true,
    });
  });

  it('adds review members and handles missing ids or thrown errors', async () => {
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockRejectedValueOnce(new Error('invoke exploded'));
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const successResult = await addReviewMemberApi('user-id');
    const emptyUserResult = await addReviewMemberApi('');
    const failureResult = await addReviewMemberApi('user-id-2');

    expect(successResult).toEqual({
      success: true,
      error: null,
    });
    expect(emptyUserResult).toBeUndefined();
    expect(failureResult).toEqual({
      success: false,
    });
    expect(consoleSpy).toHaveBeenCalledWith(new Error('invoke exploded'));
    consoleSpy.mockRestore();
  });

  it('loads the latest non-system role rows for the current user and short-circuits missing ids', async () => {
    const latestRolesBuilder = createQueryBuilder({
      data: { team_id: 'team-id', role: 'member' },
    });
    supabase.from.mockReturnValueOnce(latestRolesBuilder);

    const successResult = await getLatestRolesOfMine();

    expect(latestRolesBuilder.order).toHaveBeenCalledWith('modified_at', { ascending: false });
    expect(latestRolesBuilder.limit).toHaveBeenCalledWith(1);
    expect(successResult).toEqual({ team_id: 'team-id', role: 'member' });

    getUserId.mockResolvedValueOnce(null);

    const noUserResult = await getLatestRolesOfMine();

    expect(noUserResult).toBeNull();
  });

  it('covers default pagination, empty bearer tokens, and fallback totals across role helpers', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { id: '11111111-1111-1111-1111-111111111111' },
        },
      },
    });
    supabase.functions.invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });

    const reviewUpdateResult = await updateRoleApi(SYSTEM_TEAM_ID, 'user-id', 'review-admin');

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'admin_review_change_member_role',
      expect.objectContaining({
        headers: { Authorization: 'Bearer ' },
      }),
    );
    expect(reviewUpdateResult).toEqual({ ok: true, error: null });

    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });
    await getTeamRoles({} as any, {} as any, 'team-id');
    expect(supabase.rpc).toHaveBeenLastCalledWith('qry_team_get_member_list', {
      p_team_id: 'team-id',
      p_page: 1,
      p_page_size: 10,
      p_sort_by: 'created_at',
      p_sort_order: 'desc',
    });

    const userRolesBuilder = createQueryBuilder({ data: null });
    const userIdsBuilder = createQueryBuilder({ data: null });
    const reviewRoleBuilder = createQueryBuilder({ data: null, error: null });
    supabase.from
      .mockReturnValueOnce(userRolesBuilder)
      .mockReturnValueOnce(userIdsBuilder)
      .mockReturnValueOnce(reviewRoleBuilder);

    const userRoles = await getUserRoles();
    const userIds = await getUserIdsByTeamIds(['team-id']);
    const reviewRole = await getReviewUserRoleApi();

    expect(userRoles).toEqual({ data: [], success: true });
    expect(userIds).toEqual([]);
    expect(reviewRole).toBeNull();

    supabase.rpc
      .mockResolvedValueOnce({
        data: [{ user_id: 'user-a', role: 'member', __total: 4 }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ user_id: 'user-b', role: 'review-member' }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: { message: 'review members failed' },
      });

    const systemMembers = await getSystemMembersApi(undefined, undefined);
    const workload = await getUserManageTableData(undefined, undefined, undefined);
    const emptyMembers = await getReviewMembersApi(undefined, undefined, undefined);
    const failedMembers = await getReviewMembersApi(undefined, undefined, 'review-admin');

    expect(systemMembers.total).toBe(4);
    expect(workload.total).toBe(1);
    expect(emptyMembers).toEqual({
      data: [],
      success: true,
      total: 0,
    });
    expect(failedMembers).toEqual({
      data: [],
      success: true,
      total: 0,
    });
  });

  it('logs reinvite failures and returns empty data payload fallbacks for removals', async () => {
    supabase.functions.invoke
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'reinvite failed' },
      })
      .mockResolvedValueOnce({
        data: null,
        error: null,
      });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const reinviteError = await reInvitedApi('user-id', 'team-id');
    const emptyDeletePayload = await delRoleApi('team-id', 'user-id', 'admin');

    expect(reinviteError).toEqual({ message: 'reinvite failed' });
    expect(consoleSpy).toHaveBeenCalledWith('error', { message: 'reinvite failed' });
    expect(emptyDeletePayload).toEqual({ error: null });
    consoleSpy.mockRestore();
  });

  it('returns notRegistered and false results from addSystemMemberApi when prerequisites fail', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    getUserIdByEmail.mockResolvedValueOnce(null);

    const missingUser = await addSystemMemberApi('missing@example.com');

    expect(missingUser).toEqual({
      success: false,
      error: 'notRegistered',
    });

    getUserIdByEmail.mockResolvedValueOnce('user-id');
    supabase.auth.getSession.mockRejectedValueOnce(new Error('session failed'));

    const failed = await addSystemMemberApi('u@example.com');

    expect(failed).toEqual({
      success: false,
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loads non-system roles for specific users and the current user', async () => {
    const byUserBuilder = createRolesQueryBuilder({
      data: [{ user_id: 'user-1', team_id: 'team-1', role: 'member' }],
    });
    const currentUserBuilder = createRolesQueryBuilder({
      data: null,
    });
    supabase.from.mockReturnValueOnce(byUserBuilder).mockReturnValueOnce(currentUserBuilder);

    const byUser = await getRoleByuserId('user-1');
    const mine = await getUserRoles();

    expect(byUser).toEqual(
      expect.objectContaining({
        data: [{ user_id: 'user-1', team_id: 'team-1', role: 'member' }],
      }),
    );
    expect(byUserBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(byUserBuilder.neq).toHaveBeenCalledWith('team_id', SYSTEM_TEAM_ID);
    expect(mine).toEqual({
      data: [],
      success: true,
    });
  });

  it('returns raw role rows for team-id lookups and role-by-user queries', async () => {
    const idsBuilder = createRolesQueryBuilder({
      data: null,
    });
    const byUserBuilder = createRolesQueryBuilder({
      data: [{ team_id: 'team-1', role: 'member' }],
    });
    supabase.from.mockReturnValueOnce(idsBuilder).mockReturnValueOnce(byUserBuilder);

    const ids = await getUserIdsByTeamIds(['team-1', 'team-2']);
    const byUser = await getRoleByUserId();

    expect(idsBuilder.in).toHaveBeenCalledWith('team_id', ['team-1', 'team-2']);
    expect(ids).toEqual([]);
    expect(byUserBuilder.eq).toHaveBeenCalledWith(
      'user_id',
      '11111111-1111-1111-1111-111111111111',
    );
    expect(byUser).toEqual([{ team_id: 'team-1', role: 'member' }]);
  });

  it('delegates createTeamMessage to addTeam', async () => {
    addTeam.mockResolvedValueOnce({ message: 'create-failed' });

    const result = await createTeamMessage('team-1', { title: 'Team' }, 3, true);

    expect(addTeam).toHaveBeenCalledWith('team-1', { title: 'Team' }, 3, true);
    expect(result).toEqual({ message: 'create-failed' });
  });

  it('returns system and review roles when maybeSingle succeeds and null when it fails', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const systemSuccessBuilder = createRolesQueryBuilder({
      data: { user_id: 'user-id', role: 'admin' },
    });
    const systemFailureBuilder = createRolesQueryBuilder({
      data: null,
      error: new Error('query failed'),
    });
    const reviewSuccessBuilder = createRolesQueryBuilder({
      data: { user_id: 'user-id', role: 'review-member' },
    });
    const reviewFailureBuilder = createRolesQueryBuilder({
      data: null,
      error: new Error('query failed'),
    });
    supabase.from
      .mockReturnValueOnce(systemSuccessBuilder)
      .mockReturnValueOnce(systemFailureBuilder)
      .mockReturnValueOnce(reviewSuccessBuilder)
      .mockReturnValueOnce(reviewFailureBuilder);

    expect(await getSystemUserRoleApi()).toEqual({ user_id: 'user-id', role: 'admin' });
    expect(await getSystemUserRoleApi()).toBeNull();
    expect(await getReviewUserRoleApi()).toEqual({ user_id: 'user-id', role: 'review-member' });
    expect(await getReviewUserRoleApi()).toBeNull();

    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loads review members and falls back cleanly when the list query fails', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [
        {
          user_id: 'u4',
          role: 'review-admin',
          email: 'u4@example.com',
          display_name: 'U4',
          pendingCount: 1,
          reviewedCount: 6,
          __total: 11,
        },
      ],
      error: null,
    });

    const success = await getReviewMembersApi({ current: 1, pageSize: 10 }, {}, undefined);

    expect(supabase.rpc).toHaveBeenCalledWith('qry_review_get_member_list', {
      p_page: 1,
      p_page_size: 10,
      p_sort_by: 'created_at',
      p_sort_order: 'desc',
      p_role: null,
    });
    expect(success).toEqual({
      data: [
        {
          user_id: 'u4',
          team_id: SYSTEM_TEAM_ID,
          role: 'review-admin',
          email: 'u4@example.com',
          display_name: 'U4',
          pendingCount: 1,
          reviewedCount: 6,
        },
      ],
      success: true,
      total: 11,
    });

    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('rpc failed'),
    });

    const failed = await getReviewMembersApi({ current: 1, pageSize: 10 }, {}, 'review-member');

    expect(failed).toEqual({
      data: [],
      total: 0,
      success: true,
    });
  });

  it('adds review members, returns undefined for blank ids, and handles thrown failures', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    supabase.functions.invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });

    const success = await addReviewMemberApi('user-1');
    const blank = await addReviewMemberApi('');
    supabase.auth.getSession.mockRejectedValueOnce(new Error('session failed'));
    const failed = await addReviewMemberApi('user-2');

    expect(success).toEqual({
      success: true,
      error: null,
    });
    expect(blank).toBeUndefined();
    expect(failed).toEqual({
      success: false,
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('returns the latest non-invited role of the current user and null when no user id can be resolved', async () => {
    getUserId.mockResolvedValueOnce(null);

    const noUser = await getLatestRolesOfMine();

    expect(noUser).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();

    getUserId.mockResolvedValueOnce('user-9');
    const latestBuilder = createRolesQueryBuilder({
      data: { id: 'role-1', role: 'admin' },
    });
    supabase.from.mockReturnValueOnce(latestBuilder);

    const latest = await getLatestRolesOfMine();

    expect(latestBuilder.select).toHaveBeenCalledWith('*');
    expect(latestBuilder.eq).toHaveBeenCalledWith('user_id', 'user-9');
    expect(latestBuilder.in).toHaveBeenCalledWith('role', ['admin', 'member', 'is_invited']);
    expect(latestBuilder.order).toHaveBeenCalledWith('modified_at', { ascending: false });
    expect(latestBuilder.limit).toHaveBeenCalledWith(1);
    expect(latest).toEqual({ id: 'role-1', role: 'admin' });
  });

  it('routes addRoleApi through review, system, and team commands with sparse auth headers', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: '11111111-1111-1111-1111-111111111111' },
        },
      },
    });
    supabase.functions.invoke
      .mockResolvedValueOnce({
        data: { ok: false, code: 'REVIEW_DENIED', message: 'denied' },
        error: null,
      })
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });

    const reviewError = await addRoleApi('user-review', SYSTEM_TEAM_ID, 'review-admin');
    const systemResult = await addRoleApi('user-system', SYSTEM_TEAM_ID, 'member');
    const teamResult = await addRoleApi('user-team', 'team-1', 'admin');

    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      1,
      'admin_review_change_member_role',
      expect.objectContaining({
        headers: { Authorization: 'Bearer ' },
        body: { userId: 'user-review', role: 'review-admin', action: 'set' },
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      2,
      'admin_system_change_member_role',
      expect.objectContaining({
        headers: { Authorization: 'Bearer ' },
        body: { userId: 'user-system', role: 'member', action: 'set' },
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      3,
      'admin_team_change_member_role',
      expect.objectContaining({
        headers: { Authorization: 'Bearer ' },
        body: { teamId: 'team-1', userId: 'user-team', role: 'admin', action: 'set' },
      }),
    );
    expect(reviewError).toEqual({
      ok: false,
      code: 'REVIEW_DENIED',
      message: 'denied',
    });
    expect(systemResult).toBeNull();
    expect(teamResult).toBeNull();
  });

  it('uses default team-notification params and zero fallbacks when rpc payloads are sparse', async () => {
    supabase.rpc
      .mockResolvedValueOnce({
        data: [
          {
            user_id: 'user-id',
            team_id: 'team-id',
            role: 'member',
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: undefined,
        error: null,
      });

    const status = await getTeamInvitationStatusApi();
    const count = await getTeamInvitationCountApi();

    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'qry_notification_get_my_team_items', {
      p_days: 3,
    });
    expect(status).toEqual({
      success: true,
      data: {
        user_id: 'user-id',
        team_id: 'team-id',
        role: 'member',
        teamTitle: [],
        modifiedAt: null,
      },
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'qry_notification_get_my_team_count', {
      p_days: 3,
      p_last_view_at: null,
    });
    expect(count).toEqual({
      success: true,
      data: [],
      total: 0,
    });
  });

  it('maps sparse member rows with default paging, sort, and total fallbacks', async () => {
    supabase.rpc
      .mockResolvedValueOnce({
        data: [
          {
            user_id: 'u-sparse',
            role: 'member',
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            user_id: 'u-zero',
            role: 'review-member',
            total: 0,
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: undefined,
        error: null,
      })
      .mockResolvedValueOnce({
        data: undefined,
        error: null,
      });

    const systemMembers = await getSystemMembersApi(undefined as any, undefined as any);
    const workload = await getUserManageTableData(undefined as any, undefined as any);
    const emptyWorkload = await getUserManageTableData(undefined as any, undefined as any);
    const reviewMembers = await getReviewMembersApi(undefined as any, undefined as any);

    expect(systemMembers).toEqual({
      data: [
        {
          user_id: 'u-sparse',
          role: 'member',
          email: '',
          display_name: '-',
          team_id: SYSTEM_TEAM_ID,
          pendingCount: 0,
          reviewedCount: 0,
        },
      ],
      success: true,
      total: 1,
    });
    expect(workload).toEqual({
      data: [
        {
          user_id: 'u-zero',
          role: 'review-member',
          email: '',
          display_name: '-',
          team_id: SYSTEM_TEAM_ID,
          pendingCount: 0,
          reviewedCount: 0,
        },
      ],
      success: true,
      total: 0,
    });
    expect(emptyWorkload).toEqual({
      data: [],
      success: true,
      total: 0,
    });
    expect(reviewMembers).toEqual({
      data: [],
      success: true,
      total: 0,
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'qry_review_get_member_workload', {
      p_page: 1,
      p_page_size: 10,
      p_sort_by: 'created_at',
      p_sort_order: 'desc',
      p_role: null,
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(4, 'qry_review_get_member_list', {
      p_page: 1,
      p_page_size: 10,
      p_sort_by: 'created_at',
      p_sort_order: 'desc',
      p_role: null,
    });
  });

  it('returns sparse fallback objects when delete-role and add-system-member commands have no data payload', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { ok: false, message: 'blocked' },
        error: null,
      });
    getUserIdByEmail.mockResolvedValueOnce('user-id');

    const deleted = await delRoleApi('team-id', 'user-id');
    const addSystemMember = await addSystemMemberApi('u@example.com');

    expect(deleted).toEqual({
      error: null,
    });
    expect(addSystemMember).toEqual({
      success: false,
    });
    expect(consoleSpy).toHaveBeenCalledWith({
      ok: false,
      message: 'blocked',
    });
    consoleSpy.mockRestore();
  });
});
