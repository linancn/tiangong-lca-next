import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import { v4 } from 'uuid';
import { addRoleApi, getRoleByuserId, getTeamRoles, getUserIdsByTeamIds } from '../roles/api';
import { getUserEmailByUserIds, getUserIdByEmail, getUsersByIds } from '../users/api';

interface TeamMember {
  user_id: string;
  team_id: string;
  email: any;
  role: 'admin' | 'member' | 'is_invited';
  team_title?: string;
}

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
  const result = await supabase.from('teams').update({ rank }).eq('id', id);
  return result;
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
  if (typeof rank !== 'undefined') {
    const result = await supabase
      .from('teams')
      .update({ json: data, rank, is_public })
      .eq('id', id)
      .select();
    return result;
  } else {
    const result = await supabase
      .from('teams')
      .update({ json: data, is_public })
      .eq('id', id)
      .select();
    return result;
  }
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

    if (!error) {
      const ids = rolesResult.map((item) => item.user_id);

      const usersResult = await getUsersByIds(ids);

      if (usersResult) {
        const result: TeamMember[] = rolesResult.map((role) => {
          const user = usersResult?.find((u) => u.id === role.user_id);
          return {
            user_id: role.user_id,
            team_id: role.team_id,
            email: user?.email ?? '',
            role: role.role,
            display_name: user?.display_name ?? '-',
          };
        });

        // get team title
        // const teams = await getTeamsByIds(rolesResult.map((r) => r.team_id));
        // if (teams) {
        //   result.forEach((r) => {
        //     const team = teams.find((t) => t.id === r.team_id);
        //     if (team) {
        //       r.team_title = team.json?.title;
        //     }
        //   });
        // }

        return {
          success: true,
          data: result,
        };
      }
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

  // Check if the user is already on the team
  const { data: existingUser, error: roleCheckError } = await getRoleByuserId(id);
  if (!roleCheckError) {
    if (existingUser.length === 0) {
      // The user is not on the team, add an invitation record
      const adderror = await addRoleApi(id, teamId, 'is_invited');

      return { error: adderror };
    } else {
      return {
        error: {
          message: 'exists',
        },
      };
    }
  }
}

export async function uploadLogoApi(name: string, file: File) {
  const res = await supabase.storage.from('sys-files').upload(`logo/${v4()}`, file);

  if (res.error) {
    throw res.error;
  } else {
    return res;
  }
}

export async function addTeam(id: string, data: any, rank: number, is_public: boolean) {
  const { error } = await supabase.from('teams').insert({ id, json: data, rank, is_public });
  return error;
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
      data: teams ?? [],
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
