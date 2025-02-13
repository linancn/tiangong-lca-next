import { supabase, supabaseAuth } from '@/services/supabase';

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
  if(!id){
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
  const result = await supabase
    .from('teams')
    .update({ json: data })
    .eq('id', id)
    .select();
  return result;
}

export async function getTeamMessageApi(id: string) {
  const result = await supabase
    .from('teams')
    .select("*")
    .eq('id', id);
  return result;
}

export async function updateRoleApi(teamId: string, userId: string, role: 'admin' | 'member') {
  const result = await supabase
    .from('roles')
    .update({ role })
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .select()
  return result;
}

export async function delRoleApi(teamId: string, userId: string,) {
  const result = await supabase
    .from('roles')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId)
  return result;
}

export async function getTeamMembersApi(teamId: string) {
  const { error, data: rolesResult } = await supabase
    .from('roles')
    .select(`
      user_id,
      team_id,
      role
      `)
    .eq('team_id', teamId);
  // console.log('rolesResult', rolesResult);
  if (error) {
    return {
      success: false,
    }
  } else {
    try {
      const userIds = rolesResult.map((role: { user_id: string }) => role.user_id);
      // console.log('用户id', userIds)
      const batchSize = 20; // 设置并发限制为20
      const batches = [];
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const batchPromises = batch.map(async (id) => {
          const { data: userResult } = await supabaseAuth.auth.admin.getUserById(id);
          return userResult.user;
        });
        batches.push(await Promise.all(batchPromises));
      }
      const usersResult = batches.flat();
      const result = rolesResult.map((role: { user_id: string }) => {
        const user = usersResult.find((user: any) => user.id === role.user_id);
        return {
          ...role,
          email: user?.email,
        }
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('获取用户信息失败', error);
      return {
        success: false,
      };;
    }
  }

}

export async function addTeamMemberApi(teamId: string, email: string) {
  const { data: userResult } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();
  // console.log('用户信息--->', userResult)
  const id = userResult?.id

  // 检查用户是否已在团队中
  const { data: existingRole, error: roleCheckError } = await supabase
    .from('roles')
    .select('*')
    .eq('user_id', id)

  if (!roleCheckError && existingRole.length === 0) {
    // 用户不在团队中,添加邀请记录
    const result = await supabase
      .from('roles')
      .insert({
        team_id: teamId,
        user_id: id,
        role: 'is_invited'
      });
    return result;
  } else {
    return {
      error: {
        message: 'exists'
      }
    };
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
      error
    }
  }

  return {
    success: true,
    data
  }
}

export async function rejectTeamInvitationApi(teamId: string, userId: string) {
  const { error: deleteError } = await supabase
    .from('roles')
    .delete()
    .eq('user_id', userId)
    .eq('team_id', teamId)

  if (deleteError) {
    return {
      success: false,
      error: deleteError
    }
  }
  return {
    success: true
  }
}

export async function getTeamInvitationStatusApi() {
  const { error, data: userResult } = await supabase.auth.getUser();
  if (error) {
    return {
      success: false,
      data: null
    }
  } else {
    const { data: roleResult, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('user_id', userResult.user.id)
      .single();

    if (roleError) {
      return {
        success: false,
        data: null
      }
    }
    return {
      success: true,
      data: roleResult
    }
  }

}

export async function uploadLogoApi(name: string, file: File) {
  const res = await supabase
    .storage
    .from('sys-files')
    .upload(`logo/${Date.now()}-${encodeURIComponent(name)}`, file);

  console.log(res);
  if (res.error) {
    throw res.error;
  } else {
    return res
  }
}

// export async function deleteLogoApi(path: string) {
//   const res = await supabase
//     .storage
//     .from('sys-files')
//     .remove([path]);

//   return res
// }
