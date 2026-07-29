import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

export type UserRoleRow = {
  role: string;
  team_id: string | null;
};

/**
 * Get the user role from the roles table
 * The role enumarate values are [member, owner, review-member, review-admin ...]
 * Return the role and team_id
 */
async function getUserRole(id: string, supabase: Pick<SupabaseClient, 'from'>) {
  const result = await supabase.from('roles').select('role,team_id').eq('user_id', id);
  return Promise.resolve(result);
}

export function hasUserRole(
  roles: UserRoleRow[] | null | undefined,
  role: string,
  teamId?: string,
): boolean {
  return (
    Array.isArray(roles) &&
    roles.some((item) => item.role === role && (teamId === undefined || item.team_id === teamId))
  );
}

export default getUserRole;
