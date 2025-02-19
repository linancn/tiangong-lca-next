import { supabase } from '@/services/supabase';

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
    .eq('user_id', session?.data?.session?.user?.id);

  return Promise.resolve({
    data: result.data ?? [],
    success: true,
  });
}

// Get the team id of the user when the user is not an invited user
export async function getTeamIdByUserId() {
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
    .eq('user_id', session?.data?.session?.user?.id);
  if (data && data.length > 0 && data[0].role !== 'is_invited') {
    return data[0].team_id;
  }
  return null;
}

