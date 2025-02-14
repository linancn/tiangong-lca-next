import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';

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

export async function updateRoleApi(teamId: string, userId: string, role: 'admin' | 'member') {
  const result = await supabase
    .from('roles')
    .update({ role })
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .select();
  return result;
}

export async function delRoleApi(teamId: string, userId: string) {
  const result = await supabase.from('roles').delete().eq('team_id', teamId).eq('user_id', userId);
  return result;
}

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
      .order(sortBy, { ascending: orderBy === 'ascend' })
      .range(
        ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
        (params.current ?? 1) * (params.pageSize ?? 10) - 1,
      );

    if (!error) {
      const ids = rolesResult.map((item) => item.user_id);

      const { error, data: usersResult } = await supabase
        .from('users')
        .select('id, raw_user_meta_data->email')
        .in('id', ids);

      if (!error) {
        const result = rolesResult.map((role) => {
          const user = usersResult?.find((u) => u.id === role.user_id);
          return {
            user_id: role.user_id,
            team_id: role.team_id,
            email: user?.email,
            role: role.role,
          };
        });

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

  // Check if the user is already on the team
  const { data: existingUser, error: roleCheckError } = await supabase
    .from('roles')
    .select('*')
    .eq('user_id', id);

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

export async function acceptTeamInvitationApi(teamId: string, userId: string) {
  const { data, error } = await supabase
    .from('roles')
    .update({ role: 'member' })
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) {
    return {
      success: false,
      error,
    };
  }

  return {
    success: true,
    data,
  };
}

export async function rejectTeamInvitationApi(teamId: string, userId: string) {
  const { error: deleteError } = await supabase
    .from('roles')
    .delete()
    .eq('user_id', userId)
    .eq('team_id', teamId);

  if (deleteError) {
    return {
      success: false,
      error: deleteError,
    };
  }
  return {
    success: true,
  };
}

export async function getTeamInvitationStatusApi() {
  const { error, data: userResult } = await supabase.auth.getUser();
  if (error) {
    return {
      success: false,
      data: null,
    };
  } else {
    const { data: roleResult, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('user_id', userResult.user.id)
      .single();

    if (roleError) {
      return {
        success: false,
        data: null,
      };
    }
    return {
      success: true,
      data: roleResult,
    };
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
