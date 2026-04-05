import { supabase } from '@/services/supabase';
import { addTeam } from '@/services/teams/api';
import { getUserId, getUserIdByEmail } from '@/services/users/api';
import { FunctionRegion } from '@supabase/supabase-js';
import { SortOrder } from 'antd/lib/table/interface';

const SYSTEM_TEAM_ID = '00000000-0000-0000-0000-000000000000';

type MemberListRow = {
  user_id: string;
  team_id?: string;
  role: string;
  email?: string;
  display_name?: string;
  pendingCount?: number;
  reviewedCount?: number;
  pending_count?: number;
  reviewed_count?: number;
  total?: number;
  total_count?: number;
  __total?: number;
};

type TeamNotificationRpcRow = {
  user_id: string;
  team_id: string;
  role: string;
  team_title?: unknown;
  modified_at?: string | null;
};

const getSortParams = (sort: Record<string, SortOrder>) => {
  const sortBy = Object.keys(sort)[0] ?? 'created_at';
  const sortOrder = (sort[sortBy] ?? 'descend') === 'ascend' ? 'asc' : 'desc';
  return { sortBy, sortOrder };
};

const getPaginationParams = (params: { pageSize?: number; current?: number }) => ({
  page: params.current ?? 1,
  pageSize: params.pageSize ?? 10,
});

const getTotalFromRows = (rows: MemberListRow[]) => {
  if (!rows.length) {
    return 0;
  }
  const [first] = rows;
  return Number(first.total ?? first.total_count ?? first.__total ?? rows.length) || 0;
};

const mapMemberRows = (rows: MemberListRow[], defaultTeamId: string) =>
  rows.map((row) => ({
    user_id: row.user_id,
    role: row.role,
    email: row.email ?? '',
    display_name: row.display_name ?? '-',
    team_id: row.team_id ?? defaultTeamId,
    pendingCount: Number(row.pendingCount ?? row.pending_count ?? 0) || 0,
    reviewedCount: Number(row.reviewedCount ?? row.reviewed_count ?? 0) || 0,
  }));

const mapTeamNotificationRow = (row: TeamNotificationRpcRow) => ({
  user_id: row.user_id,
  team_id: row.team_id,
  role: row.role,
  teamTitle: row.team_title ?? [],
  modifiedAt: row.modified_at ?? null,
});

const getNotificationLastViewAt = (lastViewTime?: number) =>
  lastViewTime && lastViewTime > 0 ? new Date(lastViewTime).toISOString() : null;

async function invokeMembershipCommand(command: string, body: Record<string, unknown>) {
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
    .neq('team_id', SYSTEM_TEAM_ID);

  return data?.[0]?.team_id;
}

export async function getTeamRoles(
  params: { pageSize: number; current: number },
  sort: Record<string, SortOrder>,
  teamId: string,
) {
  const { page, pageSize } = getPaginationParams(params);
  const { sortBy, sortOrder } = getSortParams(sort);
  return supabase.rpc('qry_team_get_member_list', {
    p_team_id: teamId,
    p_page: page,
    p_page_size: pageSize,
    p_sort_by: sortBy,
    p_sort_order: sortOrder,
  });
}
export async function addRoleApi(userId: string, teamId: string, role: string) {
  const result =
    teamId === SYSTEM_TEAM_ID
      ? role.startsWith('review-')
        ? await invokeMembershipCommand('admin_review_change_member_role', {
            userId,
            role,
            action: 'set',
          })
        : await invokeMembershipCommand('admin_system_change_member_role', {
            userId,
            role,
            action: 'set',
          })
      : await invokeMembershipCommand('admin_team_change_member_role', {
          teamId,
          userId,
          role,
          action: 'set',
        });
  return getCommandError(result);
}
export async function getRoleByuserId(userId: string) {
  return await supabase
    .from('roles')
    .select('*')
    .eq('user_id', userId)
    .neq('team_id', SYSTEM_TEAM_ID);
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
    .neq('team_id', SYSTEM_TEAM_ID);

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
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    return {
      success: false,
      data: null,
    };
  }

  const { data, error } = await supabase.rpc('qry_notification_get_my_team_items', {
    p_days: timeFilter,
  });

  if (error || !Array.isArray(data)) {
    return {
      success: false,
      data: null,
    };
  }

  return {
    success: true,
    data: data.length > 0 ? mapTeamNotificationRow(data[0] as TeamNotificationRpcRow) : null,
  };
}

export async function getTeamInvitationCountApi(timeFilter: number = 3, lastViewTime?: number) {
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    return {
      success: false,
      data: [],
      total: 0,
    };
  }

  const { data, error } = await supabase.rpc('qry_notification_get_my_team_count', {
    p_days: timeFilter,
    p_last_view_at: getNotificationLastViewAt(lastViewTime),
  });

  if (error) {
    return {
      success: false,
      data: [],
      total: 0,
    };
  }
  return {
    success: true,
    data: [],
    total: Number(data ?? 0) || 0,
  };
}

export async function createTeamMessage(id: string, data: any, rank: number, is_public: boolean) {
  const error = await addTeam(id, data, rank, is_public);
  return error;
}

export async function updateRoleApi(
  teamId: string,
  userId: string,
  role: 'admin' | 'member' | 'review-admin' | 'review-member',
) {
  const result = role.startsWith('review-')
    ? await invokeMembershipCommand('admin_review_change_member_role', {
        userId,
        role,
        action: 'set',
      })
    : teamId === SYSTEM_TEAM_ID
      ? await invokeMembershipCommand('admin_system_change_member_role', {
          userId,
          role,
          action: 'set',
        })
      : await invokeMembershipCommand('admin_team_change_member_role', {
          teamId,
          userId,
          role,
          action: 'set',
        });
  const error = getCommandError(result);
  if (result.error) {
    console.log('error', result.error);
  }
  return {
    ...(result?.data ?? {}),
    error,
  };
}

export async function delRoleApi(teamId: string, userId: string, role?: string) {
  let result: any;
  if (teamId !== SYSTEM_TEAM_ID) {
    result = await invokeMembershipCommand('admin_team_change_member_role', {
      teamId,
      userId,
      action: 'remove',
    });
  } else if (role?.startsWith('review-')) {
    result = await invokeMembershipCommand('admin_review_change_member_role', {
      userId,
      action: 'remove',
    });
  } else if (role) {
    result = await invokeMembershipCommand('admin_system_change_member_role', {
      userId,
      action: 'remove',
    });
  } else {
    result = await invokeMembershipCommand('admin_system_change_member_role', {
      userId,
      action: 'remove',
    });
    if (getCommandError(result)) {
      result = await invokeMembershipCommand('admin_review_change_member_role', {
        userId,
        action: 'remove',
      });
    }
  }
  const error = getCommandError(result);
  return {
    ...(result?.data ?? {}),
    error,
  };
}

export async function reInvitedApi(userId: string, teamId: string) {
  const result = await invokeMembershipCommand('admin_team_reinvite_member', {
    teamId,
    userId,
  });
  const error = getCommandError(result);
  if (error) {
    console.log('error', error);
  }
  return error;
}

export async function rejectTeamInvitationApi(teamId: string, userId: string) {
  void userId;
  const result = await invokeMembershipCommand('app_team_reject_invitation', {
    teamId,
  });
  const error = getCommandError(result);
  if (error) {
    console.log('error', error);
  }
  return {
    success: !error,
    error,
  };
}

export async function acceptTeamInvitationApi(teamId: string, userId: string) {
  void userId;
  const result = await invokeMembershipCommand('app_team_accept_invitation', {
    teamId,
  });
  const error = getCommandError(result);
  if (error) {
    console.log('error', error);
  }
  return {
    success: !error,
    ...(result?.data ?? {}),
    error,
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
      .eq('team_id', SYSTEM_TEAM_ID)
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
    const { sortBy, sortOrder } = getSortParams(sort ?? {});
    const { page, pageSize } = getPaginationParams(params ?? {});
    const { data, error } = await supabase.rpc('qry_system_get_member_list', {
      p_page: page,
      p_page_size: pageSize,
      p_sort_by: sortBy,
      p_sort_order: sortOrder,
    });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as MemberListRow[];
    return {
      data: mapMemberRows(rows, SYSTEM_TEAM_ID),
      success: true,
      total: getTotalFromRows(rows),
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
    if (!userId) {
      return {
        success: false,
        error: 'notRegistered',
      };
    }

    const result = await invokeMembershipCommand('admin_system_change_member_role', {
      userId,
      role: 'member',
      action: 'set',
    });
    const error = getCommandError(result);
    if (error) {
      throw error;
    }
    return {
      success: true,
    };
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
      .eq('team_id', SYSTEM_TEAM_ID)
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

export async function getUserManageTableData(params: any, sort: any, role?: string) {
  try {
    const { sortBy, sortOrder } = getSortParams(sort ?? {});
    const { page, pageSize } = getPaginationParams(params ?? {});
    const { data, error } = await supabase.rpc('qry_review_get_member_workload', {
      p_page: page,
      p_page_size: pageSize,
      p_sort_by: sortBy,
      p_sort_order: sortOrder,
      p_role: role ?? null,
    });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as MemberListRow[];
    return {
      data: mapMemberRows(rows, SYSTEM_TEAM_ID),
      success: true,
      total: getTotalFromRows(rows),
    };
  } catch (error) {
    return {
      data: [],
      total: 0,
      success: true,
    };
  }
}
export async function getReviewMembersApi(params: any, sort: any, role?: string) {
  try {
    const { sortBy, sortOrder } = getSortParams(sort ?? {});
    const { page, pageSize } = getPaginationParams(params ?? {});
    const { data, error } = await supabase.rpc('qry_review_get_member_list', {
      p_page: page,
      p_page_size: pageSize,
      p_sort_by: sortBy,
      p_sort_order: sortOrder,
      p_role: role ?? null,
    });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as MemberListRow[];
    return {
      data: mapMemberRows(rows, SYSTEM_TEAM_ID),
      success: true,
      total: getTotalFromRows(rows),
    };
  } catch (error) {
    return {
      data: [],
      total: 0,
      success: true,
    };
  }
}

export async function addReviewMemberApi(userId: string) {
  try {
    if (userId) {
      const result = await invokeMembershipCommand('admin_review_change_member_role', {
        userId,
        role: 'review-member',
        action: 'set',
      });
      const error = getCommandError(result);
      return {
        success: !error,
        error,
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
  const userId = await getUserId();

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
    .maybeSingle();

  return data;
}

export async function getRoleByUserId() {
  const userId = await getUserId();
  const { data } = await supabase.from('roles').select('team_id,role').eq('user_id', userId);
  return data;
}
