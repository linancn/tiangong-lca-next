import {
  addTeam,
  addTeamMemberApi,
  editTeamMessage,
  getTeamMembersApi,
  updateSort,
  updateTeamRank,
} from '@/services/teams/api';

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock('@/services/roles/api', () => ({
  getTeamRoles: jest.fn(),
  getUserIdsByTeamIds: jest.fn(),
}));

jest.mock('@/services/users/api', () => ({
  getUserEmailByUserIds: jest.fn(),
  getUserIdByEmail: jest.fn(),
}));

const { supabase } = jest.requireMock('@/services/supabase');
const { getTeamRoles } = jest.requireMock('@/services/roles/api');
const { getUserIdByEmail } = jest.requireMock('@/services/users/api');

describe('teams api task-4 boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token',
        },
      },
    });
  });

  it('routes updateTeamRank to admin_team_set_rank', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    await updateTeamRank('team-id', 9);
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'admin_team_set_rank',
      expect.objectContaining({
        body: { teamId: 'team-id', rank: 9 },
      }),
    );
  });

  it('routes editTeamMessage to profile command and optional rank command', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    await editTeamMessage('team-id', { title: 'T' }, 3, true);
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      1,
      'app_team_update_profile',
      expect.objectContaining({
        body: { teamId: 'team-id', json: { title: 'T' }, isPublic: true },
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      2,
      'admin_team_set_rank',
      expect.objectContaining({
        body: { teamId: 'team-id', rank: 3 },
      }),
    );
  });

  it('routes updateSort through admin_team_set_rank for every team rank change', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });

    const result = await updateSort([
      { id: 'team-1', rank: 1 },
      { id: 'team-2', rank: 2 },
    ]);

    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      1,
      'admin_team_set_rank',
      expect.objectContaining({
        body: { teamId: 'team-1', rank: 1 },
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      2,
      'admin_team_set_rank',
      expect.objectContaining({
        body: { teamId: 'team-2', rank: 2 },
      }),
    );
    expect(result).toEqual({
      data: [{ ok: true }, { ok: true }],
      error: null,
    });
  });

  it('stops updateSort when a rank command fails', async () => {
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({
        data: { ok: false, code: 'FORBIDDEN', message: 'forbidden' },
        error: null,
      });

    const result = await updateSort([
      { id: 'team-1', rank: 1 },
      { id: 'team-2', rank: 2 },
      { id: 'team-3', rank: 3 },
    ]);

    expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      data: null,
      error: {
        ok: false,
        code: 'FORBIDDEN',
        message: 'forbidden',
      },
    });
  });

  it('routes addTeam to app_team_create', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    const error = await addTeam('team-id', { title: 'T' }, 1, true);
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'app_team_create',
      expect.objectContaining({
        body: { teamId: 'team-id', json: { title: 'T' }, rank: 1, isPublic: true },
      }),
    );
    expect(error).toBeNull();
  });

  it('maps getTeamMembersApi from query rpc rows without extra user joins', async () => {
    getTeamRoles.mockResolvedValue({
      error: null,
      data: [
        {
          user_id: 'u1',
          team_id: 'team-id',
          role: 'member',
          email: 'u1@example.com',
          display_name: 'U1',
        },
      ],
    });

    const result = await getTeamMembersApi(
      { current: 1, pageSize: 10 },
      { created_at: 'descend' } as any,
      'team-id',
    );

    expect(getTeamRoles).toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      data: [
        {
          user_id: 'u1',
          team_id: 'team-id',
          role: 'member',
          email: 'u1@example.com',
          display_name: 'U1',
        },
      ],
    });
  });

  it('adds team member via admin_team_change_member_role command', async () => {
    getUserIdByEmail.mockResolvedValue('user-id');
    supabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });

    const result = await addTeamMemberApi('team-id', 'u@example.com');

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'admin_team_change_member_role',
      expect.objectContaining({
        body: { teamId: 'team-id', userId: 'user-id', role: 'is_invited', action: 'set' },
      }),
    );
    expect(result).toEqual({ error: null });
  });

  it('returns exists when command indicates duplicate', async () => {
    getUserIdByEmail.mockResolvedValue('user-id');
    supabase.functions.invoke.mockResolvedValue({
      data: { ok: false, code: 'ROLE_ALREADY_EXISTS', message: 'already exists' },
      error: null,
    });

    const result = await addTeamMemberApi('team-id', 'u@example.com');

    expect(result).toEqual({ error: { message: 'exists' } });
  });

  it('returns notRegistered when email has no user', async () => {
    getUserIdByEmail.mockResolvedValue(null);
    const result = await addTeamMemberApi('team-id', 'unknown@example.com');
    expect(result).toEqual({
      error: {
        message: 'notRegistered',
      },
    });
  });
});
