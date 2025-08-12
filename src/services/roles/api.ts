import { supabase } from '@/services/supabase';
import { addTeam } from '@/services/teams/api';
import { getUserIdByEmail, getUsersByIds } from '@/services/users/api';
import { FunctionRegion } from '@supabase/supabase-js';
import { SortOrder } from 'antd/lib/table/interface';

export async function getUserTeamId() {
  const session = await supabase.auth.getSession();
  const { data } = await supabase
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

  return data?.[0]?.team_id;
}

export async function getTeamRoles(
  params: { pageSize: number; current: number },
  sort: Record<string, SortOrder>,
  teamId: string,
) {
  const sortBy = Object.keys(sort)[0] ?? 'created_at';
  const orderBy = sort[sortBy] ?? 'descend';

  return await supabase
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
}
export async function addRoleApi(userId: string, teamId: string, role: string) {
  const { error } = await supabase.from('roles').insert({
    user_id: userId,
    role,
    team_id: teamId,
  });
  return error;
}
export async function getRoleByuserId(userId: string) {
  return await supabase
    .from('roles')
    .select('*')
    .eq('user_id', userId)
    .neq('team_id', '00000000-0000-0000-0000-000000000000');
}

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
  const result = await supabase.from('roles').select('user_id,team_id,role').in('team_id', teamIds);
  return result.data ?? [];
};

export async function getTeamInvitationStatusApi(timeFilter: number = 3) {
  const { error, data: userResult } = await supabase.auth.getUser();
  if (error) {
    return {
      success: false,
      data: null,
    };
  } else {
    let query = supabase
      .from('roles')
      .select('*')
      .eq('user_id', userResult.user?.id)
      .in('role', ['admin', 'member', 'is_invited'])
      .neq('team_id', '00000000-0000-0000-0000-000000000000')
      .order('modified_at', { ascending: false });

    if (timeFilter > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeFilter);
      query = query.gte('modified_at', cutoffDate.toISOString());
    }

    const { data: roleResult, error: roleError } = await query.maybeSingle();

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

export async function createTeamMessage(id: string, data: any, rank: number, is_public: boolean) {
  const session = await supabase.auth.getSession();
  await supabase
    .from('roles')
    .delete()
    .eq('user_id', session?.data?.session?.user?.id)
    .eq('role', 'rejected')
    .neq('team_id', '00000000-0000-0000-0000-000000000000');

  const error = await addTeam(id, data, rank, is_public);
  if (!error) {
    const roleError = await addRoleApi(session?.data?.session?.user?.id || '', id, 'owner');
    return roleError;
  }
  return error;
}

export async function updateRoleApi(
  teamId: string,
  userId: string,
  role: 'admin' | 'member' | 'review-admin' | 'review-member',
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('update_role', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { teamId, userId, data: { role } },
      region: FunctionRegion.UsEast1,
    });
  }
  if (result.error) {
    console.log('error', result.error);
  }
  return result?.data;
}

export async function delRoleApi(teamId: string, userId: string) {
  const result = await supabase.from('roles').delete().eq('team_id', teamId).eq('user_id', userId);
  return result;
}

export async function reInvitedApi(userId: string, teamId: string) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('update_role', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { teamId, userId, data: { role: 'is_invited' } },
      region: FunctionRegion.UsEast1,
    });
  }
  if (result.error) {
    console.log('error', result.error);
  }
  return result?.data?.error;
}

export async function rejectTeamInvitationApi(teamId: string, userId: string) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('update_role', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { teamId, userId, data: { role: 'rejected' } },
      region: FunctionRegion.UsEast1,
    });
  }
  if (result.error) {
    console.log('error', result.error);
  }
  return {
    success: !result.error,
    error: result?.data?.error,
  };
}

export async function acceptTeamInvitationApi(teamId: string, userId: string) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('update_role', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { teamId, userId, data: { role: 'member' } },
      region: FunctionRegion.UsEast1,
    });
  }
  if (result.error) {
    console.log('error', result.error);
  }
  return {
    success: !result.error,
    ...result?.data,
  };
}

// system api
export async function getSystemUserRoleApi() {
  try {
    const session = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('roles')
      .select('user_id,role')
      .eq('user_id', session?.data?.session?.user?.id)
      .eq('team_id', '00000000-0000-0000-0000-000000000000')
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getSystemMembersApi(params: any, sort: any) {
  try {
    const sortBy = Object.keys(sort)[0] ?? 'created_at';
    const orderBy = sort[sortBy] ?? 'descend';

    let res: any[] = [];

    const { data, error, count } = await supabase
      .from('roles')
      .select('user_id,role', { count: 'exact' })
      .eq('team_id', '00000000-0000-0000-0000-000000000000')
      .in('role', ['admin', 'owner', 'member'])
      .order(sortBy, { ascending: orderBy === 'ascend' })
      .range(
        ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
        (params.current ?? 1) * (params.pageSize ?? 10) - 1,
      );

    if (!error) {
      const users = await getUsersByIds(data.map((item) => item.user_id));
      if (users) {
        res = data.map((roleItem: any) => {
          const user = users.find((user) => user.id === roleItem.user_id);
          return {
            user_id: roleItem.user_id,
            role: roleItem.role,
            email: user?.email,
            display_name: user?.display_name,
            team_id: '00000000-0000-0000-0000-000000000000',
          };
        });
      }
    }

    return {
      data: res || [],
      success: true,
      total: count || 0,
    };
  } catch (error) {
    console.log(error);
    return {
      data: [],
      total: 0,
      success: true,
    };
  }
}

export async function addSystemMemberApi(email: string) {
  try {
    const userId = await getUserIdByEmail(email);
    if (userId) {
      const addRoleError = await addRoleApi(
        userId,
        '00000000-0000-0000-0000-000000000000',
        'member',
      );
      if (addRoleError) {
        throw addRoleError;
      }
      return {
        success: true,
      };
    } else {
      return {
        success: false,
        error: 'notRegistered',
      };
    }
  } catch (error) {
    console.log(error);
    return {
      success: false,
    };
  }
}

// review api
export async function getReviewUserRoleApi() {
  try {
    const session = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('roles')
      .select('user_id,role')
      .eq('user_id', session?.data?.session?.user?.id)
      .eq('team_id', '00000000-0000-0000-0000-000000000000')
      .in('role', ['review-admin', 'review-member'])
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.log(error);
    return null;
  }
}
export async function getReviewMembersApi(params: any, sort: any, role?: string) {
  try {
    const sortBy = Object.keys(sort)[0] ?? 'created_at';
    const orderBy = sort[sortBy] ?? 'descend';

    let res: any[] = [];

    let query = supabase
      .from('roles')
      .select('user_id,role', { count: 'exact' })
      .eq('team_id', '00000000-0000-0000-0000-000000000000')
      .in('role', ['review-admin', 'review-member'])
      .order(sortBy, { ascending: orderBy === 'ascend' })
      .range(
        ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
        (params.current ?? 1) * (params.pageSize ?? 10) - 1,
      );

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error, count } = await query;

    if (!error) {
      const users = await getUsersByIds(data.map((item) => item.user_id));
      if (users) {
        res = data.map((roleItem: any) => {
          const user = users.find((user) => user.id === roleItem.user_id);
          return {
            user_id: roleItem.user_id,
            role: roleItem.role,
            email: user?.email,
            display_name: user?.display_name,
            team_id: '00000000-0000-0000-0000-000000000000',
          };
        });
      }
    }

    return {
      data: res || [],
      success: true,
      total: count || 0,
    };
  } catch (error) {
    return {
      data: [],
      total: 0,
      success: true,
    };
  }
}

export async function addReviewMemberApi(email: string) {
  try {
    const userId = await getUserIdByEmail(email);
    if (userId) {
      const addRoleError = await addRoleApi(
        userId,
        '00000000-0000-0000-0000-000000000000',
        'review-member',
      );
      if (addRoleError) {
        throw addRoleError;
      }
      return {
        success: true,
      };
    } else {
      return {
        success: false,
        error: 'notRegistered',
      };
    }
  } catch (error) {
    console.log(error);
    return {
      success: false,
    };
  }
}

export async function getLatestRolesOfMine() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    return null;
  }

  const { data } = await supabase
    .from('roles')
    .select('*')
    .eq('user_id', userId)
    .in('role', ['admin', 'member', 'is_invited'])
    .order('modified_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}
