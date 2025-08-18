import { getCurrentUser } from '@/services/auth';
import { supabase } from '@/services/supabase';

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
