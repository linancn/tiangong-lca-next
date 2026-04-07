import {
  addTeam,
  addTeamMemberApi,
  editTeamMessage,
  getAllTableTeams,
  getTeamById,
  getTeamMembersApi,
  getTeamMessageApi,
  getTeams,
  getTeamsByKeyword,
  getUnrankedTeams,
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
const { getTeamRoles, getUserIdsByTeamIds } = jest.requireMock('@/services/roles/api');
const { getUserEmailByUserIds, getUserIdByEmail } = jest.requireMock('@/services/users/api');

const createTeamsQueryBuilder = (
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
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
  };

  return builder;
};

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
    getUserIdsByTeamIds.mockResolvedValue([]);
    getUserEmailByUserIds.mockResolvedValue([]);
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

  it('returns null from updateTeamRank when the current session is missing', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
    });

    const result = await updateTeamRank('team-id', 9);

    expect(result).toBeNull();
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
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

  it('returns direct command errors from addTeam', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'create failed' },
    });

    const result = await addTeam('team-id', { title: 'T' }, 1, true);

    expect(result).toEqual({ message: 'create failed' });
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

  it('returns failure when getTeamMembersApi receives an rpc error payload', async () => {
    getTeamRoles.mockResolvedValueOnce({
      error: new Error('failed'),
      data: null,
    });

    const result = await getTeamMembersApi(
      { current: 1, pageSize: 10 },
      { created_at: 'descend' } as any,
      'team-id',
    );

    expect(result).toEqual({
      success: false,
      data: null,
    });
  });

  it('returns failure when getTeamMembersApi throws unexpectedly', async () => {
    getTeamRoles.mockRejectedValueOnce(new Error('failed'));

    const result = await getTeamMembersApi(
      { current: 1, pageSize: 10 },
      { created_at: 'descend' } as any,
      'team-id',
    );

    expect(result).toEqual({
      success: false,
      data: null,
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

  it('returns the raw command error when adding a team member fails for another reason', async () => {
    getUserIdByEmail.mockResolvedValueOnce('user-id');
    supabase.functions.invoke.mockResolvedValueOnce({
      data: { ok: false, code: 'FORBIDDEN', message: 'forbidden' },
      error: null,
    });

    const result = await addTeamMemberApi('team-id', 'u@example.com');

    expect(result).toEqual({
      error: {
        ok: false,
        code: 'FORBIDDEN',
        message: 'forbidden',
      },
    });
  });

  it('loads ranked teams and falls back to an empty list when the query payload is null', async () => {
    const builder = createTeamsQueryBuilder({ data: null });
    supabase.from.mockReturnValueOnce(builder);

    const result = await getTeams();

    expect(supabase.from).toHaveBeenCalledWith('teams');
    expect(builder.select).toHaveBeenCalled();
    expect(builder.gt).toHaveBeenCalledWith('rank', 0);
    expect(builder.order).toHaveBeenCalledWith('rank', { ascending: true });
    expect(result).toEqual({
      data: [],
      success: true,
    });
  });

  it('searches teams by keyword and returns failure when the query reports an error', async () => {
    const successBuilder = createTeamsQueryBuilder({
      data: [{ id: 'team-1' }],
      error: null,
    });
    supabase.from.mockReturnValueOnce(successBuilder);

    const success = await getTeamsByKeyword('hello');

    expect(successBuilder.select).toHaveBeenCalledWith('*');
    expect(successBuilder.or).toHaveBeenCalledWith(
      'json->title->0->>#text.ilike.%hello%,json->title->1->>#text.ilike.%hello%',
    );
    expect(success).toEqual({
      data: [{ id: 'team-1' }],
      success: true,
    });

    const errorBuilder = createTeamsQueryBuilder({
      data: null,
      error: new Error('query failed'),
    });
    supabase.from.mockReturnValueOnce(errorBuilder);

    const failure = await getTeamsByKeyword('hello');

    expect(failure).toEqual({
      data: [],
      success: false,
    });
  });

  it('maps join-team rows with owner ids and owner emails', async () => {
    const builder = createTeamsQueryBuilder({
      count: 2,
      data: [
        { id: 'team-1', name: 'Team 1' },
        { id: 'team-2', name: 'Team 2' },
      ],
    });
    supabase.from.mockReturnValueOnce(builder);
    getUserIdsByTeamIds.mockResolvedValueOnce([
      { team_id: 'team-1', user_id: 'owner-1', role: 'owner' },
      { team_id: 'team-2', user_id: 'member-2', role: 'member' },
    ]);
    getUserEmailByUserIds.mockResolvedValueOnce([
      { id: 'owner-1', email: 'owner-1@example.com' },
      { id: 'member-2', email: 'member-2@example.com' },
    ]);

    const result = await getAllTableTeams({ current: 2, pageSize: 5 }, 'joinTeam');

    expect(builder.eq).toHaveBeenCalledWith('is_public', true);
    expect(builder.range).toHaveBeenCalledWith(5, 9);
    expect(getUserIdsByTeamIds).toHaveBeenCalledWith(['team-1', 'team-2']);
    expect(getUserEmailByUserIds).toHaveBeenCalledWith(['owner-1', 'member-2']);
    expect(result).toEqual({
      data: [
        { id: 'team-1', name: 'Team 1', ownerEmail: 'owner-1@example.com', user_id: 'owner-1' },
        { id: 'team-2', name: 'Team 2' },
      ],
      success: true,
      total: 2,
    });
  });

  it('maps manage-system rows and filters to ranked teams', async () => {
    const builder = createTeamsQueryBuilder({
      count: null,
      data: [],
    });
    supabase.from.mockReturnValueOnce(builder);

    const result = await getAllTableTeams({ current: 1, pageSize: 10 }, 'manageSystem');

    expect(builder.gt).toHaveBeenCalledWith('rank', 0);
    expect(result).toEqual({
      data: [],
      success: true,
      total: 0,
    });
  });

  it('returns failure when getAllTableTeams throws unexpectedly', async () => {
    supabase.from.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const result = await getAllTableTeams({ current: 1, pageSize: 10 }, 'joinTeam');

    expect(result).toEqual({
      data: [],
      success: false,
      total: 0,
    });
  });

  it('returns failure immediately when getTeamById receives an empty id', async () => {
    const result = await getTeamById('');

    expect(result).toEqual({
      data: [],
      success: false,
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('loads a team by id and falls back to an empty array for missing rows', async () => {
    const builder = createTeamsQueryBuilder({ data: null });
    supabase.from.mockReturnValueOnce(builder);

    const result = await getTeamById('team-1');

    expect(builder.eq).toHaveBeenCalledWith('id', 'team-1');
    expect(result).toEqual({
      data: [],
      success: true,
    });
  });

  it('updates team profiles without a rank change and surfaces profile command errors', async () => {
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: { updated: true }, error: null })
      .mockResolvedValueOnce({
        data: { ok: false, code: 'RANK_BLOCKED', message: 'rank blocked' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ok: false, code: 'PROFILE_BLOCKED', message: 'profile blocked' },
        error: null,
      });

    const noRankResult = await editTeamMessage('team-id', { title: 'A' });
    const rankErrorResult = await editTeamMessage('team-id', { title: 'B' }, 8);
    const profileErrorResult = await editTeamMessage('team-id', { title: 'C' }, 9, true);

    expect(noRankResult).toEqual({ updated: true });
    expect(rankErrorResult).toEqual({
      error: {
        ok: false,
        code: 'RANK_BLOCKED',
        message: 'rank blocked',
      },
    });
    expect(profileErrorResult).toEqual({
      error: {
        ok: false,
        code: 'PROFILE_BLOCKED',
        message: 'profile blocked',
      },
    });
  });

  it('returns the raw team message query result', async () => {
    const builder = createTeamsQueryBuilder({
      data: [{ id: 'team-1' }],
      error: null,
    });
    supabase.from.mockReturnValueOnce(builder);

    const result = await getTeamMessageApi('team-1');

    expect(builder.select).toHaveBeenCalledWith('*');
    expect(builder.eq).toHaveBeenCalledWith('id', 'team-1');
    expect(result).toBe(builder);
  });

  it('loads unranked teams with owner metadata and falls back cleanly when the query returns no rows', async () => {
    const successBuilder = createTeamsQueryBuilder({
      count: 1,
      data: [{ id: 'team-1', name: 'Team 1' }],
    });
    supabase.from.mockReturnValueOnce(successBuilder);
    getUserIdsByTeamIds.mockResolvedValueOnce([
      { team_id: 'team-1', user_id: 'owner-1', role: 'owner' },
    ]);
    getUserEmailByUserIds.mockResolvedValueOnce([{ id: 'owner-1', email: 'owner@example.com' }]);

    const success = await getUnrankedTeams({ current: 1, pageSize: 10 });

    expect(successBuilder.eq).toHaveBeenCalledWith('rank', 0);
    expect(successBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(success).toEqual({
      data: [{ id: 'team-1', name: 'Team 1', ownerEmail: 'owner@example.com', user_id: 'owner-1' }],
      success: true,
      total: 1,
    });

    const emptyBuilder = createTeamsQueryBuilder({
      count: 0,
      data: [],
    });
    supabase.from.mockReturnValueOnce(emptyBuilder);

    const emptyResult = await getUnrankedTeams({ current: 1, pageSize: 10 });

    expect(emptyResult).toEqual({
      data: [],
      success: true,
      total: 0,
    });
  });

  it('uses an empty bearer token and null command-data fallbacks for sparse team mutations', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {},
      },
    });
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: undefined, error: null });

    await updateTeamRank('team-id', 9);
    const result = await updateSort([{ id: 'team-1', rank: 1 }]);

    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      1,
      'admin_team_set_rank',
      expect.objectContaining({
        headers: { Authorization: 'Bearer ' },
        body: { teamId: 'team-id', rank: 9 },
      }),
    );
    expect(result).toEqual({
      data: [null],
      error: null,
    });
  });

  it('uses sparse fallback rows for keyword and table queries with default pagination', async () => {
    const keywordBuilder = createTeamsQueryBuilder({ data: undefined });
    const tableBuilder = createTeamsQueryBuilder({
      count: undefined,
      data: [{ id: 'team-1', json: {} }],
    });
    const emptyTableBuilder = createTeamsQueryBuilder({
      count: undefined,
      data: undefined,
    });
    supabase.from
      .mockReturnValueOnce(keywordBuilder)
      .mockReturnValueOnce(tableBuilder)
      .mockReturnValueOnce(emptyTableBuilder);

    const keywordResult = await getTeamsByKeyword('team');
    const tableResult = await getAllTableTeams({} as any, 'joinTeam');
    const emptyTableResult = await getAllTableTeams({} as any, 'joinTeam');

    expect(keywordResult).toEqual({
      data: [],
      success: true,
    });
    expect(tableBuilder.range).toHaveBeenCalledWith(0, 9);
    expect(tableBuilder.eq).toHaveBeenCalledWith('is_public', true);
    expect(emptyTableBuilder.range).toHaveBeenCalledWith(0, 9);
    expect(emptyTableBuilder.eq).toHaveBeenCalledWith('is_public', true);
    expect(tableResult).toEqual({
      data: [{ id: 'team-1', json: {} }],
      success: true,
      total: 0,
    });
    expect(emptyTableResult).toEqual({
      data: [],
      success: true,
      total: 0,
    });
  });

  it('maps default team-member fields and handles message-only or empty invitation command errors', async () => {
    getTeamRoles.mockResolvedValueOnce({
      error: null,
      data: [
        {
          user_id: 'u-fallback',
          role: 'member',
        },
      ],
    });
    getUserIdByEmail.mockResolvedValueOnce('user-id').mockResolvedValueOnce('user-id');
    supabase.functions.invoke
      .mockResolvedValueOnce({
        data: { ok: false, message: 'already exists' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ok: false },
        error: null,
      });

    const members = await getTeamMembersApi({} as any, {} as any, 'team-id');
    const existsByMessage = await addTeamMemberApi('team-id', 'u@example.com');
    const rawEmptyError = await addTeamMemberApi('team-id', 'u@example.com');

    expect(members).toEqual({
      success: true,
      data: [
        {
          user_id: 'u-fallback',
          team_id: 'team-id',
          email: '',
          role: 'member',
          display_name: '-',
        },
      ],
    });
    expect(existsByMessage).toEqual({
      error: {
        message: 'exists',
      },
    });
    expect(rawEmptyError).toEqual({
      error: {
        ok: false,
      },
    });
  });

  it('uses default unranked-team paging and zero totals when count metadata is missing', async () => {
    const builder = createTeamsQueryBuilder({
      count: undefined,
      data: [{ id: 'team-1', name: 'Team 1' }],
    });
    supabase.from.mockReturnValueOnce(builder);
    getUserIdsByTeamIds.mockResolvedValueOnce([]);
    getUserEmailByUserIds.mockResolvedValueOnce([]);

    const result = await getUnrankedTeams({} as any);

    expect(builder.range).toHaveBeenCalledWith(0, 9);
    expect(result).toEqual({
      data: [{ id: 'team-1', name: 'Team 1' }],
      success: true,
      total: 0,
    });
  });

  it('returns rank-command errors from editTeamMessage after the profile update succeeds', async () => {
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'rank failed' } });

    const result = await editTeamMessage('team-id', { title: 'Ranked' }, 7);

    expect(result).toEqual({
      error: {
        message: 'rank failed',
      },
    });
  });
});
