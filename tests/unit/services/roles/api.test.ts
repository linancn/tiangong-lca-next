import {
  acceptTeamInvitationApi,
  addSystemMemberApi,
  delRoleApi,
  getSystemMembersApi,
  getTeamInvitationCountApi,
  getTeamInvitationStatusApi,
  getTeamRoles,
  getUserManageTableData,
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
const { getUserIdByEmail } = jest.requireMock('@/services/users/api');

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
});
