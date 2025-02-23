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
