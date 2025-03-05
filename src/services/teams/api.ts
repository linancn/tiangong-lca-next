import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import { getUserIdsByTeamIds } from '../roles/api';

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

const getUserEmailByUserIds = async (userIds: string[]) => {
  const result = await supabase
    .from('users')
    .select('id,raw_user_meta_data->email')
    .in('id', userIds);
  return result.data ?? [];
};

export async function getAllTableTeams(
  params: { pageSize: number; current: number },
  sort: Record<string, SortOrder>,
) {
  try {
    const sortBy = Object.keys(sort)[0] ?? 'created_at';
    const orderBy = sort[sortBy] ?? 'descend';

    const { data: teams, count } = await supabase
      .from('teams')
      .select('*', { count: 'exact' })
      .gte('rank', 0)
      .order(sortBy, { ascending: orderBy === 'ascend' })
      .range(
        ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
        (params.current ?? 1) * (params.pageSize ?? 10) - 1,
      );

    if (teams && teams.length > 0) {
      const teamIds = teams.map((item) => item.id);
      const users = await getUserIdsByTeamIds(teamIds);
      users.forEach((user) => {
        const team = teams.find((item) => item.id === user.team_id);
        if (team) {
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

export async function editTeamMessage(id: string, data: any) {
  const result = await supabase.from('teams').update({ json: data }).eq('id', id).select();
  return result;
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
  const sortBy = Object.keys(sort)[0] ?? 'created_at';
  const orderBy = sort[sortBy] ?? 'descend';
  try {
    const { error, data: rolesResult } = await supabase
      .from('roles')
      .select(
        `
      user_id,
      team_id,
      role
      `,
      )
      .eq('team_id', teamId)
      .neq('team_id', '00000000-0000-0000-0000-000000000000')
      .order(sortBy, { ascending: orderBy === 'ascend' })
      .range(
        ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
        (params.current ?? 1) * (params.pageSize ?? 10) - 1,
      );

    if (!error) {
      const ids = rolesResult.map((item) => item.user_id);

      const { error, data: usersResult } = await supabase
        .from('users')
        .select('id, raw_user_meta_data->email,raw_user_meta_data->display_name')
        .in('id', ids);

      if (!error) {
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
  const { data: userResult } = await supabase
    .from('users')
    .select('id')
    .eq('raw_user_meta_data->>email', email)
    .single();

  const id = userResult?.id;
  if (!userResult) {
    return {
      error: {
        message: 'notRegistered',
      },
    };
  }

  // Check if the user is already on the team
  const { data: existingUser, error: roleCheckError } = await supabase
    .from('roles')
    .select('*')
    .eq('user_id', id)
    .neq('team_id', '00000000-0000-0000-0000-000000000000');

  if (!roleCheckError) {
    if (existingUser.length === 0) {
      // The user is not on the team, add an invitation record
      const result = await supabase.from('roles').insert({
        team_id: teamId,
        user_id: id,
        role: 'is_invited',
      });
      return result;
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
  const res = await supabase.storage
    .from('sys-files')
    .upload(`logo/${Date.now()}-${encodeURIComponent(name)}`, file);

  if (res.error) {
    throw res.error;
  } else {
    return res;
  }
}


export async function addTeam (id: string, data: any) {
  const { error } = await supabase.from('teams').insert({ id, json: data });
  return error
}
