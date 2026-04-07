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

const createQueryBuilder = <T>(resolvedValue: T) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    then: (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject),
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
  });

  it('returns null when command routing lacks a session', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
    });

    const result = await updateTeamRank('team-id', 9);

    expect(result).toBeNull();
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('loads ranked teams ordered by rank', async () => {
    const queryBuilder = createQueryBuilder({
      data: [{ id: 'team-1', rank: 1 }],
    });
    supabase.from.mockReturnValueOnce(queryBuilder);

    const result = await getTeams();

    expect(supabase.from).toHaveBeenCalledWith('teams');
    expect(queryBuilder.gt).toHaveBeenCalledWith('rank', 0);
    expect(queryBuilder.order).toHaveBeenCalledWith('rank', { ascending: true });
    expect(result).toEqual({
      data: [{ id: 'team-1', rank: 1 }],
      success: true,
    });
  });

  it('searches teams by keyword and reports failures', async () => {
    const successBuilder = createQueryBuilder({
      data: [{ id: 'team-2' }],
      error: null,
    });
    const failureBuilder = createQueryBuilder({
      data: null,
      error: { message: 'boom' },
    });
    supabase.from.mockReturnValueOnce(successBuilder).mockReturnValueOnce(failureBuilder);

    const successResult = await getTeamsByKeyword('alpha');
    const failureResult = await getTeamsByKeyword('beta');

    expect(successBuilder.or).toHaveBeenCalledWith(
      'json->title->0->>#text.ilike.%alpha%,json->title->1->>#text.ilike.%alpha%',
    );
    expect(successResult).toEqual({
      data: [{ id: 'team-2' }],
      success: true,
    });
    expect(failureResult).toEqual({
      data: [],
      success: false,
    });
  });

  it('loads join-team table rows and enriches owner email', async () => {
    const teams = [
      { id: 'team-1', json: { title: 'Team One' }, rank: 1, is_public: true },
      { id: 'team-2', json: { title: 'Team Two' }, rank: 2, is_public: true },
    ];
    const queryBuilder = createQueryBuilder({
      data: teams,
      count: 2,
    });
    supabase.from.mockReturnValueOnce(queryBuilder);
    getUserIdsByTeamIds.mockResolvedValueOnce([
      { team_id: 'team-1', user_id: 'owner-1', role: 'owner' },
      { team_id: 'team-2', user_id: 'member-2', role: 'member' },
    ]);
    getUserEmailByUserIds.mockResolvedValueOnce([
      { id: 'owner-1', email: 'owner-1@example.com' },
      { id: 'member-2', email: 'member-2@example.com' },
    ]);

    const result = await getAllTableTeams({ current: 1, pageSize: 10 }, 'joinTeam');

    expect(queryBuilder.eq).toHaveBeenCalledWith('is_public', true);
    expect(getUserIdsByTeamIds).toHaveBeenCalledWith(['team-1', 'team-2']);
    expect(getUserEmailByUserIds).toHaveBeenCalledWith(['owner-1', 'member-2']);
    expect(result).toEqual({
      data: [
        {
          id: 'team-1',
          json: { title: 'Team One' },
          rank: 1,
          is_public: true,
          user_id: 'owner-1',
          ownerEmail: 'owner-1@example.com',
        },
        {
          id: 'team-2',
          json: { title: 'Team Two' },
          rank: 2,
          is_public: true,
        },
      ],
      success: true,
      total: 2,
    });
  });

  it('loads manage-system table rows and returns a failure payload when lookup throws', async () => {
    const queryBuilder = createQueryBuilder({
      data: [{ id: 'team-3', rank: 3 }],
      count: 1,
    });
    supabase.from.mockReturnValueOnce(queryBuilder).mockImplementationOnce(() => {
      throw new Error('query failed');
    });
    getUserIdsByTeamIds.mockResolvedValueOnce([]);
    getUserEmailByUserIds.mockResolvedValueOnce([]);

    const successResult = await getAllTableTeams({ current: 2, pageSize: 5 }, 'manageSystem');
    const failureResult = await getAllTableTeams({ current: 1, pageSize: 10 }, 'joinTeam');

    expect(queryBuilder.gt).toHaveBeenCalledWith('rank', 0);
    expect(successResult).toEqual({
      data: [{ id: 'team-3', rank: 3 }],
      success: true,
      total: 1,
    });
    expect(failureResult).toEqual({
      data: [],
      success: false,
      total: 0,
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

  it('routes addTeam to app_team_create and surfaces command payload errors', async () => {
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({
        data: {
          ok: false,
          code: 'TEAM_EXISTS',
          message: 'already exists',
        },
        error: null,
      });

    const successError = await addTeam('team-id', { title: 'T' }, 1, true);
    const commandError = await addTeam('team-id', { title: 'T' }, 1, true);

    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(
      1,
      'app_team_create',
      expect.objectContaining({
        body: { teamId: 'team-id', json: { title: 'T' }, rank: 1, isPublic: true },
      }),
    );
    expect(successError).toBeNull();
    expect(commandError).toEqual({
      ok: false,
      code: 'TEAM_EXISTS',
      message: 'already exists',
    });
  });

  it('returns getTeamById results and short-circuits empty ids', async () => {
    const queryBuilder = createQueryBuilder({
      data: [{ id: 'team-id', json: { title: 'Team' }, rank: 8 }],
    });
    supabase.from.mockReturnValueOnce(queryBuilder);

    const emptyIdResult = await getTeamById('');
    const queryResult = await getTeamById('team-id');

    expect(emptyIdResult).toEqual({
      data: [],
      success: false,
    });
    expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'team-id');
    expect(queryResult).toEqual({
      data: [{ id: 'team-id', json: { title: 'Team' }, rank: 8 }],
      success: true,
    });
  });

  it('returns profile-only updates and surfaces profile or rank errors', async () => {
    supabase.functions.invoke
      .mockResolvedValueOnce({
        data: {
          ok: false,
          code: 'FORBIDDEN',
          message: 'forbidden',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ok: true, stage: 'profile' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ok: true, stage: 'profile' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ok: false,
          code: 'RANK_FORBIDDEN',
          message: 'rank forbidden',
        },
        error: null,
      });

    const profileError = await editTeamMessage('team-id', { title: 'T1' });
    const profileOnly = await editTeamMessage('team-id', { title: 'T2' });
    const rankError = await editTeamMessage('team-id', { title: 'T3' }, 7, false);

    expect(profileError).toEqual({
      error: {
        ok: false,
        code: 'FORBIDDEN',
        message: 'forbidden',
      },
    });
    expect(profileOnly).toEqual({ ok: true, stage: 'profile' });
    expect(rankError).toEqual({
      error: {
        ok: false,
        code: 'RANK_FORBIDDEN',
        message: 'rank forbidden',
      },
    });
  });

  it('loads raw team message rows by id', async () => {
    const queryBuilder = createQueryBuilder({
      data: [{ id: 'team-id', title: 'Team' }],
      error: null,
    });
    supabase.from.mockReturnValueOnce(queryBuilder);

    const result = await getTeamMessageApi('team-id');

    expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'team-id');
    expect(result).toEqual({
      data: [{ id: 'team-id', title: 'Team' }],
      error: null,
    });
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

  it('returns failure results when member-role lookups fail or throw', async () => {
    getTeamRoles.mockResolvedValueOnce({
      error: { message: 'rpc failed' },
      data: null,
    });
    getTeamRoles.mockRejectedValueOnce(new Error('unexpected'));

    const failedResult = await getTeamMembersApi(
      { current: 1, pageSize: 10 },
      { created_at: 'descend' } as any,
      'team-id',
    );
    const thrownResult = await getTeamMembersApi(
      { current: 1, pageSize: 10 },
      { created_at: 'descend' } as any,
      'team-id',
    );

    expect(failedResult).toEqual({
      success: false,
      data: null,
    });
    expect(thrownResult).toEqual({
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

  it('returns raw command errors when addTeamMemberApi fails for other reasons', async () => {
    getUserIdByEmail.mockResolvedValueOnce('user-id');
    supabase.functions.invoke.mockResolvedValueOnce({
      data: {
        ok: false,
        code: 'FORBIDDEN',
        message: 'forbidden',
      },
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

  it('returns notRegistered when email has no user', async () => {
    getUserIdByEmail.mockResolvedValue(null);

    const result = await addTeamMemberApi('team-id', 'unknown@example.com');

    expect(result).toEqual({
      error: {
        message: 'notRegistered',
      },
    });
  });

  it('loads unranked teams and falls back cleanly when none exist', async () => {
    const successBuilder = createQueryBuilder({
      data: [{ id: 'team-unranked', rank: 0 }],
      count: 1,
    });
    const emptyBuilder = createQueryBuilder({
      data: [],
      count: 0,
    });
    supabase.from.mockReturnValueOnce(successBuilder).mockReturnValueOnce(emptyBuilder);
    getUserIdsByTeamIds.mockResolvedValueOnce([
      { team_id: 'team-unranked', user_id: 'owner-unranked', role: 'owner' },
    ]);
    getUserEmailByUserIds.mockResolvedValueOnce([
      { id: 'owner-unranked', email: 'owner-unranked@example.com' },
    ]);

    const successResult = await getUnrankedTeams({ current: 1, pageSize: 10 });
    const emptyResult = await getUnrankedTeams({ current: 1, pageSize: 10 });

    expect(successBuilder.eq).toHaveBeenCalledWith('rank', 0);
    expect(successBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(successResult).toEqual({
      data: [
        {
          id: 'team-unranked',
          rank: 0,
          user_id: 'owner-unranked',
          ownerEmail: 'owner-unranked@example.com',
        },
      ],
      success: true,
      total: 1,
    });
    expect(emptyResult).toEqual({
      data: [],
      success: true,
      total: 0,
    });
  });

  it('uses fallback auth, pagination, and empty result branches across team helpers', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {},
      },
    });
    supabase.functions.invoke.mockResolvedValueOnce({ data: null, error: null });

    const sortResult = await updateSort([{ id: 'team-1', rank: 1 }]);

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'admin_team_set_rank',
      expect.objectContaining({
        headers: { Authorization: 'Bearer ' },
      }),
    );
    expect(sortResult).toEqual({
      data: [null],
      error: null,
    });

    const rankedBuilder = createQueryBuilder({
      data: null,
    });
    const keywordBuilder = createQueryBuilder({
      data: null,
      error: null,
    });
    const manageBuilder = createQueryBuilder({
      data: undefined,
      count: undefined,
    });
    const unrankedBuilder = createQueryBuilder({
      data: [{ id: 'team-unranked-2', rank: 0 }],
      count: undefined,
    });
    supabase.from
      .mockReturnValueOnce(rankedBuilder)
      .mockReturnValueOnce(keywordBuilder)
      .mockReturnValueOnce(manageBuilder)
      .mockReturnValueOnce(unrankedBuilder);
    getUserIdsByTeamIds.mockResolvedValueOnce([]);
    getUserEmailByUserIds.mockResolvedValueOnce([]);

    const rankedResult = await getTeams();
    const keywordResult = await getTeamsByKeyword('fallback');
    const manageResult = await getAllTableTeams(
      { current: undefined as any, pageSize: undefined as any } as any,
      'manageSystem',
    );
    const unrankedResult = await getUnrankedTeams({});

    expect(rankedResult).toEqual({ data: [], success: true });
    expect(keywordResult).toEqual({ data: [], success: true });
    expect(manageBuilder.range).toHaveBeenCalledWith(0, 9);
    expect(manageResult).toEqual({
      data: [],
      success: true,
      total: 0,
    });
    expect(unrankedBuilder.range).toHaveBeenCalledWith(0, 9);
    expect(unrankedResult).toEqual({
      data: [{ id: 'team-unranked-2', rank: 0 }],
      success: true,
      total: 0,
    });
  });

  it('maps team member defaults and handles add-member command error fallbacks', async () => {
    getTeamRoles.mockResolvedValueOnce({
      error: null,
      data: [{ user_id: 'u2', role: 'member' }],
    });

    const teamMembers = await getTeamMembersApi(
      { current: 1, pageSize: 10 },
      { created_at: 'descend' } as any,
      'team-id',
    );

    expect(teamMembers).toEqual({
      success: true,
      data: [
        {
          user_id: 'u2',
          team_id: 'team-id',
          email: '',
          role: 'member',
          display_name: '-',
        },
      ],
    });

    getUserIdByEmail.mockResolvedValueOnce('user-id').mockResolvedValueOnce('user-id-2');
    supabase.functions.invoke
      .mockResolvedValueOnce({
        data: { ok: false, message: 'already conflict' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ok: false },
        error: null,
      });

    const duplicateByMessage = await addTeamMemberApi('team-id', 'a@example.com');
    const emptyErrorCodeFallback = await addTeamMemberApi('team-id', 'b@example.com');

    expect(duplicateByMessage).toEqual({ error: { message: 'exists' } });
    expect(emptyErrorCodeFallback).toEqual({
      error: { ok: false },
    });
  });
});
