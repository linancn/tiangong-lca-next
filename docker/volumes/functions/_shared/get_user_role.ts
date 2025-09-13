import { SupabaseClient } from '@supabase/supabase-js@2';

/**
 * Get the user role from the roles table
 * The role enumarate values are [member, owner, review-member, review-admin ...]
 * Return the role and team_id
 */
async function getUserRole(id: string, supabase: SupabaseClient) {
  const result = await supabase.from('roles').select('role,team_id').eq('user_id', id);
  return Promise.resolve(result);
}

export default getUserRole;
