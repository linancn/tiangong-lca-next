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

const createQueryBuilder = <T>(resolvedValue: T) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(resolvedValue),
    single: jest.fn().mockResolvedValue(resolvedValue),
    then: (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject),
  };

  return builder;
};

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
    expect(rolesByUser).toEqual({
      data: [{ user_id: 'user-id', team_id: 'team-id', role: 'member' }],
    });
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
});
