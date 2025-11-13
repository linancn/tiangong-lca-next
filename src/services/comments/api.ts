import { supabase } from '@/services/supabase';
import { getUserId } from '@/services/users/api';
import { FunctionRegion } from '@supabase/supabase-js';
import { SortOrder } from 'antd/lib/table/interface';

export async function addCommentApi(data: any) {
  const { error } = await supabase.from('comments').upsert(data).select();
  return { error };
}

export async function updateCommentByreviewerApi(reviewId: string, reviewerId: string, data: any) {
  const { error } = await supabase
    .from('comments')
    .update(data)
    .eq('reviewer_id', reviewerId)
    .eq('review_id', reviewId);
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

export async function getReviewedComment(
  params: {
    current?: number;
    pageSize?: number;
  },
  sort: Record<string, SortOrder>,
  user_id?: string,
) {
  const sortBy = Object.keys(sort)[0] ?? 'modified_at';
  const orderBy = sort[sortBy] ?? 'descend';

  const userId = user_id ?? (await getUserId());

  if (!userId) {
    return { error: true, data: [] };
  }

  const result = await supabase
    .from('comments')
    .select('review_id, reviews!inner(*)', { count: 'exact' })
    .eq('reviewer_id', userId)
    .in('state_code', [1, 2])
    .filter('reviews.state_code', 'gt', 0)
    .order(sortBy, { ascending: orderBy === 'ascend' })
    .range(
      ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
      (params.current ?? 1) * (params.pageSize ?? 10) - 1,
    );
  return result;
}

export async function getPendingComment(
  params: {
    current?: number;
    pageSize?: number;
  },
  sort: Record<string, SortOrder>,
  user_id?: string,
) {
  const sortBy = Object.keys(sort)[0] ?? 'modified_at';
  const orderBy = sort[sortBy] ?? 'descend';
  const userId = user_id ?? (await getUserId());

  if (!userId) {
    return { error: true, data: [] };
  }

  const result = await supabase
    .from('comments')
    .select('review_id, reviews!inner(*)', { count: 'exact' })
    .eq('reviewer_id', userId)
    .eq('state_code', 0)
    .filter('reviews.state_code', 'gt', 0)
    .order(sortBy, { ascending: orderBy === 'ascend' })
    .range(
      ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
      (params.current ?? 1) * (params.pageSize ?? 10) - 1,
    );
  return result;
}

export async function getUserManageComments() {
  const result = await supabase
    .from('comments')
    .select('review_id,state_code,reviewer_id,reviews!inner(state_code)')
    .in('state_code', [0, 1, 2])
    .filter('reviews.state_code', 'gt', 0);
  return result;
}

export async function getReviewerIdsByReviewId(reviewId: string) {
  const { data } = await supabase
    .from('comments')
    .select('state_code,reviewer_id')
    .eq('review_id', reviewId);
  return data;
}
