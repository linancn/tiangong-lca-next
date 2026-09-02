import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.112.4';

export async function getReviewAdminStatus(
  userId: string,
  supabase: Pick<SupabaseClient, 'rpc'>,
): Promise<{ data: boolean | null; error: { message?: string; code?: string } | null }> {
  const { data, error } = await supabase.rpc('svc_membership_is_review_admin', {
    p_user_id: userId,
  });
  const envelope = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;

  return {
    data: envelope?.ok === true && typeof envelope.data === 'boolean' ? envelope.data : null,
    error,
  };
}
