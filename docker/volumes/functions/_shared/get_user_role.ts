import { SupabaseClient } from '@supabase/supabase-js@2';

async function getUserRole(id: string, supabase: SupabaseClient) {
  const result = await supabase.from('roles').select('role,team_id').eq('user_id', id);
  return Promise.resolve(result);
}

export default getUserRole;
