import { supabase } from '@/services/supabase';

export async function getAuth() {
  const { data } = await supabase.auth.getUser();
  return data;
}
