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

const SYSTEM_TEAM_ID = '00000000-0000-0000-0000-000000000000';

const createRolesQueryBuilder = (resolvedValue: { data?: any; error?: any } = {}) => {
  const builder: any = {
    data: resolvedValue.data,
    error: resolvedValue.error ?? null,
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest
      .fn()
      .mockResolvedValue({ data: resolvedValue.data, error: resolvedValue.error ?? null }),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
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

  it('returns the first non-system team id for the current user', async () => {
    const builder = createRolesQueryBuilder({
      data: [{ team_id: 'team-id' }],
    });
    supabase.from.mockReturnValueOnce(builder);

    const result = await getUserTeamId();

    expect(builder.select).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('user_id', '11111111-1111-1111-1111-111111111111');
    expect(builder.neq).toHaveBeenCalledWith('team_id', SYSTEM_TEAM_ID);
    expect(result).toBe('team-id');
  });

  it('routes role change by scope-specific commands', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    await updateRoleApi('team-id', 'user-id', 'admin');
    await updateRoleApi('00000000-0000-0000-0000-000000000000', 'user-id', 'member');
    await updateRoleApi('00000000-0000-0000-0000-000000000000', 'user-id', 'review-admin');

    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      1,
      'admin_team_change_member_role',
      expect.objectContaining({
        body: { teamId: 'team-id', userId: 'user-id', role: 'admin', action: 'set' },
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
      'admin_review_change_member_role',
      expect.objectContaining({
        body: { userId: 'user-id', role: 'review-admin', action: 'set' },
      }),
    );
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

  it('routes delete role to review remove command when role is review-*', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    await delRoleApi('00000000-0000-0000-0000-000000000000', 'user-id', 'review-member');
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'admin_review_change_member_role',
      expect.objectContaining({
        body: { userId: 'user-id', action: 'remove' },
      }),
    );
  });

  it('routes delete-role calls for team members, system members, and fallback review removals', async () => {
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'system failed' } })
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });

    const teamResult = await delRoleApi('team-id', 'user-1');
    const systemResult = await delRoleApi(SYSTEM_TEAM_ID, 'user-2', 'member');
    const fallbackResult = await delRoleApi(SYSTEM_TEAM_ID, 'user-3');
    const fallbackNoRetryResult = await delRoleApi(SYSTEM_TEAM_ID, 'user-4');

    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      1,
      'admin_team_change_member_role',
      expect.objectContaining({
        body: { teamId: 'team-id', userId: 'user-1', action: 'remove' },
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      2,
      'admin_system_change_member_role',
      expect.objectContaining({
        body: { userId: 'user-2', action: 'remove' },
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      3,
      'admin_system_change_member_role',
      expect.objectContaining({
        body: { userId: 'user-3', action: 'remove' },
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      4,
      'admin_review_change_member_role',
      expect.objectContaining({
        body: { userId: 'user-3', action: 'remove' },
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      5,
      'admin_system_change_member_role',
      expect.objectContaining({
        body: { userId: 'user-4', action: 'remove' },
      }),
    );
    expect(teamResult).toEqual({ ok: true, error: null });
    expect(systemResult).toEqual({ ok: true, error: null });
    expect(fallbackResult).toEqual({ ok: true, error: null });
    expect(fallbackNoRetryResult).toEqual({ ok: true, error: null });
  });

  it('routes invitation actions to explicit commands', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    await reInvitedApi('user-id', 'team-id');
    await acceptTeamInvitationApi('team-id', 'ignored');
    await rejectTeamInvitationApi('team-id', 'ignored');

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

  it('loads team notification rows via qry_notification_get_my_team_items', async () => {
    supabase.rpc.mockResolvedValue({
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
    });

    const result = await getTeamInvitationStatusApi(7);

    expect(supabase.rpc).toHaveBeenCalledWith('qry_notification_get_my_team_items', {
      p_days: 7,
    });
    expect(result).toEqual({
      success: true,
      data: {
        user_id: 'user-id',
        team_id: 'team-id',
        role: 'is_invited',
        teamTitle: [{ '@xml:lang': 'en', '#text': 'Team Title' }],
        modifiedAt: '2024-05-01T10:00:00.000Z',
      },
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

  it('loads team notification counts via qry_notification_get_my_team_count', async () => {
    supabase.rpc.mockResolvedValue({
      data: 3,
      error: null,
    });

    const lastViewTime = new Date('2024-05-01T00:00:00.000Z').getTime();
    const result = await getTeamInvitationCountApi(3, lastViewTime);

    expect(supabase.rpc).toHaveBeenCalledWith('qry_notification_get_my_team_count', {
      p_days: 3,
      p_last_view_at: new Date(lastViewTime).toISOString(),
    });
    expect(result).toEqual({
      success: true,
      data: [],
      total: 3,
    });
  });

  it('returns failure without a session and zero totals when the team-count rpc fails', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
    });

    const noSession = await getTeamInvitationCountApi(3, 0);

    expect(noSession).toEqual({
      success: false,
      data: [],
      total: 0,
    });

    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('rpc failed'),
    });

    const failed = await getTeamInvitationCountApi();

    expect(failed).toEqual({
      success: false,
      data: [],
      total: 0,
    });
  });

  it('loads system members via qry_system_get_member_list', async () => {
    supabase.rpc.mockResolvedValue({
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
    });

    const result = await getSystemMembersApi({ current: 1, pageSize: 10 }, {});
    expect(supabase.rpc).toHaveBeenCalledWith('qry_system_get_member_list', {
      p_page: 1,
      p_page_size: 10,
      p_sort_by: 'created_at',
      p_sort_order: 'desc',
    });
    expect(result).toEqual({
      data: [
        {
          user_id: 'u1',
          role: 'member',
          email: 'u1@example.com',
          display_name: 'U1',
          team_id: '00000000-0000-0000-0000-000000000000',
          pendingCount: 0,
          reviewedCount: 0,
        },
      ],
      success: true,
      total: 12,
    });
  });

  it('handles empty and failed system-member responses', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    supabase.rpc.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const empty = await getSystemMembersApi(undefined as any, undefined as any);

    expect(empty).toEqual({
      data: [],
      success: true,
      total: 0,
    });

    supabase.rpc.mockResolvedValueOnce({
      data: undefined,
      error: null,
    });

    const missingRows = await getSystemMembersApi(undefined as any, undefined as any);

    expect(missingRows).toEqual({
      data: [],
      success: true,
      total: 0,
    });

    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('rpc failed'),
    });

    const failed = await getSystemMembersApi(undefined as any, undefined as any);

    expect(failed).toEqual({
      data: [],
      total: 0,
      success: true,
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loads review workload from qry_review_get_member_workload', async () => {
    supabase.rpc.mockResolvedValue({
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
    });

    const result = await getUserManageTableData(
      { current: 1, pageSize: 10 },
      { created_at: 'descend' } as any,
      'review-member',
    );

    expect(supabase.rpc).toHaveBeenCalledWith('qry_review_get_member_workload', {
      p_page: 1,
      p_page_size: 10,
      p_sort_by: 'created_at',
      p_sort_order: 'desc',
      p_role: 'review-member',
    });
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        user_id: 'u2',
        pendingCount: 3,
        reviewedCount: 5,
      }),
    );
  });

  it('passes a null role filter to review workload queries and falls back on rpc errors', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [
        {
          user_id: 'u3',
          team_id: 'team-3',
          role: 'review-member',
          email: 'u3@example.com',
          display_name: 'U3',
          pendingCount: 2,
          reviewedCount: 4,
          total: 9,
        },
      ],
      error: null,
    });

    const success = await getUserManageTableData({ current: 2, pageSize: 20 }, {}, undefined);

    expect(supabase.rpc).toHaveBeenCalledWith('qry_review_get_member_workload', {
      p_page: 2,
      p_page_size: 20,
      p_sort_by: 'created_at',
      p_sort_order: 'desc',
      p_role: null,
    });
    expect(success).toEqual({
      data: [
        {
          user_id: 'u3',
          team_id: 'team-3',
          role: 'review-member',
          email: 'u3@example.com',
          display_name: 'U3',
          pendingCount: 2,
          reviewedCount: 4,
        },
      ],
      success: true,
      total: 9,
    });

    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('rpc failed'),
    });

    const failed = await getUserManageTableData({ current: 1, pageSize: 10 }, {}, 'review-member');

    expect(failed).toEqual({
      data: [],
      total: 0,
      success: true,
    });
  });

  it('adds system member through admin_system_change_member_role command', async () => {
    getUserIdByEmail.mockResolvedValue('user-id');
    supabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });

    const result = await addSystemMemberApi('u@example.com');

    expect(getUserIdByEmail).toHaveBeenCalledWith('u@example.com');
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'admin_system_change_member_role',
      expect.objectContaining({
        body: { userId: 'user-id', role: 'member', action: 'set' },
      }),
    );
    expect(result).toEqual({ success: true });
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

    expect(byUser).toBe(byUserBuilder);
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
