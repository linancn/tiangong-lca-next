import { supabase } from '@/services/supabase';

export async function addCommentApi(data: any) {
  const { error } = await supabase.from('comments').upsert(data).select();
  return { error };
}

export async function updateCommentApi(
  reviewId: string,
  data: any,
  tabType: 'assigned' | 'review',
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    return { error: true };
  }

  const query = supabase.from('comments').update(data).eq('review_id', reviewId);

  if (tabType === 'review') {
    query.eq('reviewer_id', userId);
  }
  const { error } = await query;
  return { error };
}

export async function getCommentApi(reviewId: string, actionType: 'assigned' | 'review') {
  if (actionType === 'review') {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

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
