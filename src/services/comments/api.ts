import { supabase } from '@/services/supabase';
import { getUserId } from '@/services/users/api';
import { FunctionRegion } from '@supabase/supabase-js';

export async function addCommentApi(data: any) {
  const { error } = await supabase.from('comments').upsert(data).select();
  return { error };
}

export async function updateCommentByreviewerApi(reviewerId: string, data: any) {
  const { error } = await supabase.from('comments').update(data).eq('reviewer_id', reviewerId);
  return { error };
}

export async function updateCommentApi(
  reviewId: string,
  data: any,
  tabType: 'assigned' | 'review',
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('update_comment', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { id: reviewId, data, tabType },
      region: FunctionRegion.UsEast1,
    });
  }
  if (result.error) {
    console.log('error', result.error);
  }
  return result?.data;
}

export async function getCommentApi(reviewId: string, actionType: 'assigned' | 'review') {
  if (actionType === 'review') {
    const userId = await getUserId();

    if (!userId) {
      return { error: true, data: [] };
    }

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('review_id', reviewId)
      .eq('reviewer_id', userId);
    return { data, error };
  }
  if (actionType === 'assigned') {
    const { data, error } = await supabase.from('comments').select('*').eq('review_id', reviewId);
    return { data, error };
  }
  return { data: [], error: true };
}

export async function getReviewedComment(user_id?: string) {
  const userId = user_id ?? (await getUserId());

  if (!userId) {
    return { error: true, data: [] };
  }

  const result = await supabase
    .from('comments')
    .select('review_id')
    .eq('reviewer_id', userId)
    .eq('state_code', 1);
  return result;
}

export async function getPendingComment(user_id?: string) {
  const userId = user_id ?? (await getUserId());

  if (!userId) {
    return { error: true, data: [] };
  }

  const result = await supabase
    .from('comments')
    .select('review_id')
    .eq('reviewer_id', userId)
    .eq('state_code', 0);
  return result;
}

export async function getUserManageComments(userIds: string[]) {
  const result = await supabase
    .from('comments')
    .select('state_code,reviewer_id')
    .in('reviewer_id', userIds)
    .in('state_code', [0, 1]);
  return result;
}
