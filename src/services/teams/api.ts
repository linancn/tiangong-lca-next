import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';
import type { SortOrder } from 'antd/es/table/interface';
import { getTeamRoles, getUserIdsByTeamIds } from '../roles/api';
import { findTeamInvitableUserByEmail, getUserEmailByUserIds } from '../users/api';

interface TeamMember {
  user_id: string;
  team_id: string;
  email: any;
  role: string;
  team_title?: string;
}

type TeamMemberRpcRow = {
  user_id: string;
  team_id?: string;
  email?: string;
  role: 'admin' | 'member' | 'is_invited' | string;
  display_name?: string;
};

type TeamTableType = 'joinTeam' | 'manageSystem';

type TeamListRpcRow = {
  id: string;
  json: any;
  rank: number;
  is_public: boolean;
  created_at?: string;
  modified_at?: string;
  owner_user_id?: string;
  owner_email?: string;
  total_count?: number | string;
};

const mapTeamListRows = (rows: TeamListRpcRow[]) =>
  rows.map(({ owner_user_id, owner_email, ...team }) => {
    delete team.total_count;
    return {
      ...team,
      ...(owner_user_id ? { user_id: owner_user_id } : {}),
      ...(owner_email ? { ownerEmail: owner_email } : {}),
    };
  });

const enrichMissingTeamOwners = async (teams: ReturnType<typeof mapTeamListRows>) => {
  const missingOwnerTeams = teams.filter((team) => !team.user_id);
  if (missingOwnerTeams.length === 0) {
    return teams;
  }

  const memberships = await getUserIdsByTeamIds(missingOwnerTeams.map((team) => team.id));
  memberships.forEach((membership) => {
    if (membership.role !== 'owner') return;
    const team = teams.find((item) => item.id === membership.team_id);
    if (team) team.user_id = membership.user_id;
  });
  const identities = await getUserEmailByUserIds(
    memberships.map((membership) => membership.user_id),
  );
  identities.forEach((identity) => {
    const team = teams.find((item) => item.user_id === identity.id);
    if (team) team.ownerEmail = identity.email;
  });
  return teams;
};

const getTeamListMode = (tableType?: TeamTableType) =>
  tableType === 'joinTeam' ? 'public' : 'ranked';

async function invokeTeamCommand(command: string, body: Record<string, unknown>) {
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    return {
      data: null,
      error: { message: 'No session' },
    };
  }
  return supabase.functions.invoke(command, {
    headers: {
      Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
    },
    body,
    region: FunctionRegion.UsEast1,
  });
}

const getCommandError = (result: { data: any; error: any }) =>
  result.error ?? (result.data?.ok === false ? result.data : null);

const TEAM_INVITE_ERROR_MESSAGE_BY_CODE: Record<string, string> = {
  USER_NOT_FOUND: 'notRegistered',
  USER_ALREADY_IN_TEAM: 'alreadyInTeam',
  USER_ALREADY_INVITED_TO_TEAM: 'alreadyInvitedToTeam',
  TEAM_MEMBER_ALREADY_EXISTS: 'exists',
  REINVITE_REQUIRED: 'reinviteRequired',
  FORBIDDEN: 'forbidden',
};

const normalizeTeamInviteError = (error: any) => {
  const code = String(error?.code ?? '').toUpperCase();
  const mappedMessage = TEAM_INVITE_ERROR_MESSAGE_BY_CODE[code];
  if (mappedMessage) {
    return {
      ...error,
      message: mappedMessage,
    };
  }

  const fallback = String(error?.code ?? error?.message ?? '').toLowerCase();
  if (fallback.includes('already') || fallback.includes('exist') || fallback.includes('conflict')) {
    return {
      ...error,
      message: 'exists',
    };
  }

  return error;
};

export async function getTeams() {
  const { data, error } = await supabase.rpc('qry_team_list', {
    p_mode: 'ranked',
    p_keyword: null,
    p_page: 1,
    p_page_size: 100,
  });
  if (error) {
    return Promise.resolve({
      data: [],
      success: false,
    });
  }
  return Promise.resolve({
    data: mapTeamListRows((data ?? []) as TeamListRpcRow[]),
    success: true,
  });
}

export async function getTeamsByKeyword(keyword: string, tableType?: TeamTableType) {
  const result = await supabase.rpc('qry_team_list', {
    p_mode: getTeamListMode(tableType),
    p_keyword: keyword,
    p_page: 1,
    p_page_size: 100,
  });

  if (result.error) {
    return Promise.resolve({
      data: [],
      success: false,
    });
  }

  return Promise.resolve({
    data: mapTeamListRows((result.data ?? []) as TeamListRpcRow[]),
    success: true,
  });
}

export async function getAllTableTeams(
  params: { pageSize: number; current: number },
  tableType: TeamTableType,
  // sort: Record<string, SortOrder>,
) {
  try {
    const { data, error } = await supabase.rpc('qry_team_list', {
      p_mode: getTeamListMode(tableType),
      p_keyword: null,
      p_page: params.current ?? 1,
      p_page_size: params.pageSize ?? 10,
    });
    if (error) {
      throw error;
    }
    const rows = (data ?? []) as TeamListRpcRow[];
    const teams = await enrichMissingTeamOwners(mapTeamListRows(rows));
    return Promise.resolve({
      data: teams,
      success: true,
      total: Number(rows[0]?.total_count ?? 0) || 0,
    });
  } catch (error) {
    return Promise.resolve({
      data: [],
      success: false,
      total: 0,
    });
  }
}
export async function updateTeamRank(id: string, rank: number) {
  const result = await invokeTeamCommand('admin_team_set_rank', {
    teamId: id,
    rank,
  });
  return result?.data;
}

export async function updateSort(params: { id: string; rank: number }[]) {
  const results: any[] = [];

  for (const { id, rank } of params) {
    const result = await invokeTeamCommand('admin_team_set_rank', {
      teamId: id,
      rank,
    });
    const commandError = getCommandError(result);

    if (commandError) {
      return {
        data: null,
        error: commandError,
      };
    }

    results.push(result?.data ?? null);
  }

  return {
    data: results,
    error: null,
  };
}

export async function getTeamById(id: string) {
  if (!id) {
    return Promise.resolve({
      data: [],
      success: false,
    });
  }
  const result = await supabase.rpc('qry_team_get', { p_team_id: id });
  return Promise.resolve({
    data: result.data ?? [],
    success: true,
  });
}

export async function editTeamMessage(id: string, data: any, rank?: number, is_public?: boolean) {
  const profileResult = await invokeTeamCommand('app_team_update_profile', {
    teamId: id,
    json: data,
    isPublic: is_public ?? false,
  });
  const profileError = getCommandError(profileResult);
  if (profileError) {
    return { error: profileError };
  }

  if (typeof rank !== 'undefined') {
    const rankResult = await invokeTeamCommand('admin_team_set_rank', {
      teamId: id,
      rank,
    });
    const rankError = getCommandError(rankResult);
    if (rankError) {
      return { error: rankError };
    }
    return rankResult?.data;
  }
  return profileResult?.data;
}

export async function getTeamMessageApi(id: string) {
  return supabase.rpc('qry_team_get', { p_team_id: id });
}

export async function getTeamMembersApi(
  params: { pageSize: number; current: number },
  sort: Record<string, SortOrder>,
  teamId: string,
) {
  try {
    const { error, data: rolesResult } = await getTeamRoles(params, sort, teamId);

    if (!error && rolesResult) {
      const result: TeamMember[] = (rolesResult as TeamMemberRpcRow[]).map((role) => ({
        user_id: role.user_id,
        team_id: role.team_id ?? teamId,
        email: role.email ?? '',
        role: role.role,
        display_name: role.display_name ?? '-',
      }));

      return {
        success: true,
        data: result,
      };
    }

    return {
      success: false,
      data: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
    };
  }
}

export async function addTeamMemberApi(teamId: string, email: string) {
  const lookup = await findTeamInvitableUserByEmail(teamId, email);

  if (lookup.error) {
    return {
      error: normalizeTeamInviteError(lookup.error),
    };
  }

  const userId = lookup.data?.id;
  if (!userId) {
    return {
      error: {
        message: 'notRegistered',
      },
    };
  }

  const result = await invokeTeamCommand('admin_team_change_member_role', {
    teamId,
    userId,
    role: 'is_invited',
    action: 'set',
  });
  const commandError = getCommandError(result);
  if (!commandError) {
    return { error: null };
  }

  return { error: normalizeTeamInviteError(commandError) };
}

export async function addTeam(id: string, data: any, rank: number, is_public: boolean) {
  const result = await invokeTeamCommand('app_team_create', {
    teamId: id,
    json: data,
    rank,
    isPublic: is_public,
  });
  return getCommandError(result);
}

export async function getUnrankedTeams(params: { pageSize?: number; current?: number }) {
  try {
    const { data, error } = await supabase.rpc('qry_team_list', {
      p_mode: 'unranked',
      p_keyword: null,
      p_page: params.current ?? 1,
      p_page_size: params.pageSize ?? 10,
    });
    if (error) {
      throw error;
    }
    const rows = (data ?? []) as TeamListRpcRow[];
    const teams = await enrichMissingTeamOwners(mapTeamListRows(rows));
    if (teams.length === 0) {
      throw new Error('No teams found');
    }

    return Promise.resolve({
      data: teams,
      success: true,
      total: Number(rows[0].total_count ?? 0) || 0,
    });
  } catch (error) {
    return Promise.resolve({
      data: [],
      success: true,
      total: 0,
    });
  }
}
