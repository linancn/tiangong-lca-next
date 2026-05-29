import { getCurrentUser } from '@/services/auth';
import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';

export type TeamInviteLookupUser = {
  id: string;
  email?: string;
  displayName?: string;
};

export type TeamInviteLookupError = {
  ok?: false;
  code?: string;
  status?: number;
  message?: string;
  details?: unknown;
};

export async function getUsersByIds(userIds: string[]) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, raw_user_meta_data->email,raw_user_meta_data->display_name')
      .in('id', userIds);
    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function findTeamInvitableUserByEmail(
  teamId: string,
  email: string,
): Promise<{ data: TeamInviteLookupUser | null; error: TeamInviteLookupError | null }> {
  try {
    const { data, error } = await supabase.rpc('qry_team_find_invitable_user_by_email', {
      p_team_id: teamId,
      p_email: email,
    });

    if (error) {
      return {
        data: null,
        error,
      };
    }

    if (data?.ok === false) {
      return {
        data: null,
        error: data,
      };
    }

    const user = data?.data ?? data;
    const id = user?.id ?? user?.user_id;
    if (!id) {
      return {
        data: null,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'No registered user was found for this email',
        },
      };
    }

    return {
      data: {
        id,
        email: user?.email,
        displayName: user?.display_name ?? user?.displayName,
      },
      error: null,
    };
  } catch (error: any) {
    return {
      data: null,
      error: {
        code: error?.code,
        message: error?.message ?? 'Failed to look up invitee',
        details: error,
      },
    };
  }
}

export async function getUserIdByEmail(email: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('raw_user_meta_data->>email', email)
      .single();
    if (error) {
      throw error;
    }
    return data?.id;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getUserEmailByUserIds(userIds: string[]) {
  const result = await supabase
    .from('users')
    .select('id,raw_user_meta_data->email')
    .in('id', userIds);
  return result.data ?? [];
}

export async function getUserId() {
  const user = await getCurrentUser();
  return user?.userid ?? '';
}

export async function getUserInfoByEmail(email: string) {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, raw_user_meta_data, contact')
      .eq('raw_user_meta_data->>email', email)
      .single();

    if (userError) {
      throw userError;
    }

    return {
      user: userData,
      contact: userData.contact || null,
      success: true,
    };
  } catch (error) {
    console.log(error);
    return {
      user: null,
      contact: null,
      success: false,
      error,
    };
  }
}

export async function updateUserContact(userId: string, contactInfo: any) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('app_user_update_contact', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { userId, contact: contactInfo },
      region: FunctionRegion.UsEast1,
    });
  }
  return result;
}

export async function getUserDetail() {
  const id = await getUserId();
  const result = await supabase.from('users').select('contact').eq('id', id).single();
  return result;
}
