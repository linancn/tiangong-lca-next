import { supabase } from '@/services/supabase';

export async function getUserRoles() {
  const session = await supabase.auth.getSession();
  const result = await supabase
    .from('roles')
    .select(
      `
      user_id,
      team_id,
      role
      `,
    )
    .eq('user_id', session?.data?.session?.user?.id)
    .neq('team_id', '00000000-0000-0000-0000-000000000000');

  return Promise.resolve({
    data: result.data ?? [],
    success: true,
  });
}

export const getUserIdsByTeamIds = async (teamIds: string[]) => {
  const result = await supabase.from('roles').select('user_id,team_id').in('team_id', teamIds);
  return result.data ?? [];
};

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
      .neq('team_id', '00000000-0000-0000-0000-000000000000')
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

export async function createTeamMessage(id: string, data: any) {
  const session = await supabase.auth.getSession();
  await supabase
    .from('roles')
    .delete()
    .eq('user_id', session?.data?.session?.user?.id)
    .eq('role', 'rejected');

  const { error } = await supabase.from('teams').insert({ id, json: data });
  if (!error) {
    const session = await supabase.auth.getSession();
    const { error: roleError } = await supabase.from('roles').insert({
      team_id: id,
      user_id: session?.data?.session?.user?.id,
      role: 'owner',
    });
    return roleError;
  }
  return error;
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

export async function reInvitedApi(userId: string, teamId: string) {
  const { error } = await supabase
    .from('roles')
    .update({ role: 'is_invited' })
    .eq('user_id', userId)
    .eq('team_id', teamId);
  return error;
}

export async function rejectTeamInvitationApi(teamId: string, userId: string) {
  const { error } = await supabase
    .from('roles')
    .update({ role: 'rejected' })
    .eq('user_id', userId)
    .eq('team_id', teamId);

  if (error) {
    return {
      success: false,
      error,
    };
  }
  return {
    success: true,
  };
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
