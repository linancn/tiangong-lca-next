import { createLegacyMutationRemovedError, invokeDatasetCommand } from '@/services/general/api';
import { supabase } from '@/services/supabase';
import { getUserId } from '@/services/users/api';
import { SortOrder } from 'antd/lib/table/interface';

type ReviewCommentCommandFunctionName =
  | 'app_review_save_comment_draft'
  | 'app_review_submit_comment';

async function invokeReviewCommentCommand<Row extends Record<string, unknown>>(
  functionName: ReviewCommentCommandFunctionName,
  body: Record<string, unknown>,
) {
  return invokeDatasetCommand<Row>(functionName as never, body);
}

export async function addCommentApi(data: any) {
  void data;
  return { error: createLegacyMutationRemovedError('addCommentApi') };
}

export async function updateCommentByreviewerApi(reviewId: string, reviewerId: string, data: any) {
  void reviewId;
  void reviewerId;
  void data;
  return { error: createLegacyMutationRemovedError('updateCommentByreviewerApi') };
}

export async function updateCommentApi(
  reviewId: string,
  data: any,
  tabType: 'assigned' | 'review' | 'reviewer-rejected' | 'admin-rejected',
) {
  void reviewId;
  void data;
  void tabType;
  return {
    error: createLegacyMutationRemovedError('updateCommentApi'),
  };
}

export async function saveReviewCommentDraftApi<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(reviewId: string, json: unknown) {
  return invokeReviewCommentCommand<Row>('app_review_save_comment_draft', {
    reviewId,
    json,
  });
}

export async function submitReviewCommentApi<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(reviewId: string, json: unknown, commentState: 1 | -3 = 1) {
  return invokeReviewCommentCommand<Row>('app_review_submit_comment', {
    reviewId,
    json,
    ...(commentState === 1 ? {} : { commentState }),
  });
}

export async function getCommentApi(
  reviewId: string,
  actionType: 'assigned' | 'review' | 'reviewer-rejected' | 'admin-rejected',
) {
  if (['review', 'reviewer-rejected', 'admin-rejected'].includes(actionType)) {
    const userId = await getUserId();

    if (!userId) {
      return { error: true, data: [] };
    }
    let query = supabase.from('comments').select('*').eq('review_id', reviewId);

    if (actionType === 'admin-rejected') {
      const { data, error } = await query;
      return { data, error };
    }
    if (actionType === 'review' || actionType === 'reviewer-rejected') {
      query = query.eq('reviewer_id', userId);
      const { data, error } = await query;
      return { data, error };
    }
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
  } = {},
  sort: Record<string, SortOrder> = {},
  user_id?: string,
) {
  const normalizedSort = sort ?? {};
  const sortBy = Object.keys(normalizedSort)[0] ?? 'modified_at';
  const orderBy = normalizedSort[sortBy] ?? 'descend';

  const userId = user_id ?? (await getUserId());

  if (!userId) {
    return { error: true, data: [] };
  }

  const pageSize = params.pageSize ?? 10;
  const currentPage = params.current ?? 1;

  const result = await supabase
    .from('comments')
    .select('review_id, reviews!inner(*)', { count: 'exact' })
    .eq('reviewer_id', userId)
    .in('state_code', [1, 2, -3])
    .filter('reviews.state_code', 'gt', 0)
    .order(sortBy, { ascending: orderBy === 'ascend' })
    .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
  return result;
}

export async function getPendingComment(
  params: {
    current?: number;
    pageSize?: number;
  } = {},
  sort: Record<string, SortOrder> = {},
  user_id?: string,
) {
  const normalizedSort = sort ?? {};
  const sortBy = Object.keys(normalizedSort)[0] ?? 'modified_at';
  const orderBy = normalizedSort[sortBy] ?? 'descend';
  const userId = user_id ?? (await getUserId());

  if (!userId) {
    return { error: true, data: [] };
  }

  const pageSize = params.pageSize ?? 10;
  const currentPage = params.current ?? 1;

  const result = await supabase
    .from('comments')
    .select('review_id, reviews!inner(*)', { count: 'exact' })
    .eq('reviewer_id', userId)
    .eq('state_code', 0)
    .filter('reviews.state_code', 'gt', 0)
    .order(sortBy, { ascending: orderBy === 'ascend' })
    .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
  return result;
}

export async function getRejectedComment(
  params: {
    current?: number;
    pageSize?: number;
  } = {},
  sort: Record<string, SortOrder> = {},
  user_id?: string,
) {
  const normalizedSort = sort ?? {};
  const sortBy = Object.keys(normalizedSort)[0] ?? 'modified_at';
  const orderBy = normalizedSort[sortBy] ?? 'descend';
  const userId = user_id ?? (await getUserId());

  if (!userId) {
    return { error: true, data: [] };
  }

  const pageSize = params.pageSize ?? 10;
  const currentPage = params.current ?? 1;

  const result = await supabase
    .from('comments')
    .select('review_id, reviews!inner(*)', { count: 'exact' })
    .eq('reviewer_id', userId)
    .eq('state_code', -1)
    .eq('reviews.state_code', -1)
    .order(sortBy, { ascending: orderBy === 'ascend' })
    .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
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

export async function getRejectedCommentsByReviewIds(reviewIds: string[]) {
  const result = await supabase
    .from('comments')
    .select('json')
    .in('review_id', reviewIds)
    .eq('state_code', -1);
  return result;
}
