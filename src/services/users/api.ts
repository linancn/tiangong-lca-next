import { getCurrentUser } from '@/services/auth';
import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';

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
    result = await supabase.functions.invoke('update_user', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { userId, data: { contact: contactInfo } },
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
