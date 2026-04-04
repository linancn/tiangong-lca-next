import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';
import { SortOrder } from 'antd/lib/table/interface';
import { getTeamRoles, getUserIdsByTeamIds } from '../roles/api';
import { getUserEmailByUserIds, getUserIdByEmail } from '../users/api';

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

export async function getTeams() {
  const result = await supabase
    .from('teams')
    .select(
      `
      id,
      json,
      rank
      `,
    )
    .gt('rank', 0)
    .order('rank', { ascending: true });
  return Promise.resolve({
    data: result.data ?? [],
    success: true,
  });
}

export async function getTeamsByKeyword(keyword: string) {
  const result = await supabase
    .from('teams')
    .select('*')
    .or(`json->title->0->>#text.ilike.%${keyword}%,json->title->1->>#text.ilike.%${keyword}%`);

  if (result.error) {
    return Promise.resolve({
      data: [],
      success: false,
    });
  }

  return Promise.resolve({
    data: result.data ?? [],
    success: true,
  });
}

export async function getAllTableTeams(
  params: { pageSize: number; current: number },
  tableType: 'joinTeam' | 'manageSystem',
  // sort: Record<string, SortOrder>,
) {
  try {
    const query = supabase
      .from('teams')
      .select('*', { count: 'exact' })
      .order('rank', { ascending: true })
      .range(
        ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
        (params.current ?? 1) * (params.pageSize ?? 10) - 1,
      );
    if (tableType === 'joinTeam') {
      query.eq('is_public', true);
    } else {
      query.gt('rank', 0);
    }
    const { data: teams, count } = await query;

    if (teams && teams.length > 0) {
      const teamIds = teams.map((item) => item.id);
      const users = await getUserIdsByTeamIds(teamIds);
      users.forEach((user) => {
        const team = teams.find((item) => item.id === user.team_id);
        if (team && user.role === 'owner') {
          team.user_id = user.user_id;
        }
      });
      const userEmails = await getUserEmailByUserIds(users.map((item) => item.user_id));
      userEmails.forEach((user) => {
        const team = teams.find((item) => item.user_id === user.id);
        if (team) {
          team.ownerEmail = user.email;
        }
      });
    }
    return Promise.resolve({
      data: teams ?? [],
      success: true,
      total: count ?? 0,
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
  const result = await supabase.from('teams').upsert(params, {
    onConflict: 'id', //A record with the same ID value already exists, update the record, or insert a new record
  });
  return result;
}

export async function getTeamById(id: string) {
  if (!id) {
    return Promise.resolve({
      data: [],
      success: false,
    });
  }
  const result = await supabase
    .from('teams')
    .select(
      `
      id,
      json,
      rank
      `,
    )
    .eq('id', id);
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
  const result = await supabase.from('teams').select('*').eq('id', id);
  return result;
}

// const getTeamsByIds = async (teamIds: string[]) => {
//   try {
//     const { error, data: result } = await supabase.from('teams').select('*').in('id', teamIds);
//     if (error) {
//       throw error;
//     }
//     return result;
//   } catch (error) {
//     console.log(error);
//   }
// };

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
  const id = await getUserIdByEmail(email);

  if (!id) {
    return {
      error: {
        message: 'notRegistered',
      },
    };
  }

  const result = await invokeTeamCommand('admin_team_change_member_role', {
    teamId,
    userId: id,
    role: 'is_invited',
    action: 'set',
  });
  const commandError = getCommandError(result);
  if (!commandError) {
    return { error: null };
  }

  const code = String(commandError?.code ?? commandError?.message ?? '').toLowerCase();
  if (code.includes('already') || code.includes('exist') || code.includes('conflict')) {
    return {
      error: {
        message: 'exists',
      },
    };
  }

  return { error: commandError };
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
    const { data: teams, count } = await supabase
      .from('teams')
      .select('*', { count: 'exact' })
      .eq('rank', 0)
      .order('created_at', { ascending: false })
      .range(
        ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
        (params.current ?? 1) * (params.pageSize ?? 10) - 1,
      );

    if (teams && teams.length > 0) {
      const teamIds = teams.map((item) => item.id);
      const users = await getUserIdsByTeamIds(teamIds);
      users.forEach((user) => {
        const team = teams.find((item) => item.id === user.team_id);
        if (team && user.role === 'owner') {
          team.user_id = user.user_id;
        }
      });
      const userEmails = await getUserEmailByUserIds(users.map((item) => item.user_id));

      userEmails.forEach((user) => {
        const team = teams.find((item) => item.user_id === user.id);
        if (team) {
          team.ownerEmail = user.email;
        }
      });
    } else {
      throw new Error('No teams found');
    }

    return Promise.resolve({
      data: teams,
      success: true,
      total: count || 0,
    });
  } catch (error) {
    return Promise.resolve({
      data: [],
      success: true,
      total: 0,
    });
  }
}
