import { getLifeCyclesByIds } from '@/services/lifeCycleModels/api';
import { supabase } from '@/services/supabase';
import { getUserId } from '@/services/users/api';
import { FunctionRegion } from '@supabase/supabase-js';
import { getPendingComment, getReviewedComment } from '../comments/api';
import { getLangText } from '../general/util';
import { genProcessName } from '../processes/util';

export async function addReviewsApi(id: string, data: any) {
  const { error } = await supabase
    .from('reviews')
    .insert({
      id: id,
      json: data,
      state_code: 0,
    })
    .select();
  return { error };
}

export async function updateReviewApi(reviewIds: React.Key[], data: any) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  const newData =
    data?.state_code && [-1, 2, 1].includes(data.state_code)
      ? { ...data, modified_at: new Date().toISOString() }
      : data;
  if (session.data.session) {
    result = await supabase.functions.invoke('update_review', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { reviewIds, data: newData },
      region: FunctionRegion.UsEast1,
    });
  }
  return result?.data;
}

export async function getReviewerIdsApi(reviewIds: React.Key[]) {
  const { data } = await supabase
    .from('reviews')
    .select('reviewer_id')
    .in('id', reviewIds)
    .single();

  return data?.reviewer_id ?? [];
}

export async function getReviewsDetail(id: string) {
  const { data } = await supabase.from('reviews').select('*').eq('id', id).single();
  return data;
}

export async function getReviewsDetailByReviewIds(reviewIds: React.Key[]) {
  const { data } = await supabase.from('reviews').select('*').in('id', reviewIds);
  return data;
}

export async function getReviewsTableData(
  params: { pageSize: number; current: number },
  sort: any,
  type: 'unassigned' | 'assigned' | 'reviewed' | 'pending' | 'rejected',
  lang: string,
) {
  const sortBy = Object.keys(sort)[0] ?? 'modified_at';
  const orderBy = sort[sortBy] ?? 'descend';
  let query = supabase
    .from('reviews')
    .select('*', { count: 'exact' })
    .order(sortBy, { ascending: orderBy === 'ascend' })
    .range(
      ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
      (params.current ?? 1) * (params.pageSize ?? 10) - 1,
    );
  switch (type) {
    case 'unassigned': {
      query = query.eq('state_code', 0);
      break;
    }
    case 'assigned': {
      query = query.eq('state_code', 1);
      break;
    }
    case 'reviewed': {
      const userId = await getUserId();
      if (userId) {
        const reviewedComment = await getReviewedComment();
        if (reviewedComment && reviewedComment.data) {
          const reviewIds = reviewedComment.data.map((item: any) => item.review_id);
          query = query.in('id', reviewIds);
        }
      }
      break;
    }
    case 'pending': {
      const userId = await getUserId();
      if (userId) {
        const pendingComment = await getPendingComment();
        if (pendingComment && pendingComment.data) {
          const reviewIds = pendingComment.data.map((item: any) => item.review_id);
          query = query.in('id', reviewIds);
        }
      }
      break;
    }
    case 'rejected': {
      const userId = await getUserId();
      query = query.eq('state_code', -1).filter('json->user->>id', 'eq', userId);
      break;
    }
  }

  const result = await query;

  if (result?.data) {
    if (result?.data.length === 0) {
      return Promise.resolve({
        data: [],
        success: true,
        total: 0,
      });
    }

    const processIds: string[] = [];
    result?.data.forEach((i) => {
      const id = i?.json?.data?.id;
      if (id) {
        processIds.push(id);
      }
    });
    const modelResult = await getLifeCyclesByIds(processIds);
    let data = result?.data.map((i: any) => {
      const model = modelResult?.data?.find(
        (j) => j.id === i?.json?.data?.id && j.version === i?.json?.data?.version,
      );
      return {
        key: i.id,
        id: i.id,
        isFromLifeCycle: model ? true : false,
        name:
          (model
            ? genProcessName(model?.name ?? {}, lang)
            : genProcessName(i?.json?.data?.name ?? {}, lang)) || '-',
        teamName: getLangText(i?.json?.team?.name ?? {}, lang),
        userName: i?.json?.user?.name ?? '-',
        createAt: new Date(i.created_at).toISOString(),
        modifiedAt: new Date(i?.modified_at).toISOString(),
        deadline: i?.deadline ? new Date(i?.deadline).toISOString() : i?.deadline,
        json: i?.json,
      };
    });

    return Promise.resolve({
      data: data,
      page: params?.current ?? 1,
      success: true,
      total: result?.count ?? 0,
    });
  }
  return Promise.resolve({
    data: [],
    success: false,
    total: 0,
  });
}

export async function getReviewsByProcess(processId: string, processVersion: string) {
  const result = await supabase
    .from('reviews')
    .select('*')
    .filter('json->data->>id', 'eq', processId)
    .filter('json->data->>version', 'eq', processVersion);
  return result;
}

export async function getNotifyReviews(
  params: { pageSize: number; current: number },
  lang: string,
  timeFilter: number = 3,
) {
  const userId = await getUserId();

  if (!userId) {
    return Promise.resolve({
      data: [],
      success: false,
      total: 0,
    });
  }

  let query = supabase
    .from('reviews')
    .select('*', { count: 'exact' })
    .filter('json->user->>id', 'eq', userId)
    .in('state_code', [1, -1, 2])
    .order('modified_at', { ascending: false });

  if (timeFilter > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeFilter);
    query = query.gte('modified_at', cutoffDate.toISOString());
  }

  const result = await query.range(
    ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
    (params.current ?? 1) * (params.pageSize ?? 10) - 1,
  );

  if (result?.data) {
    if (result?.data.length === 0) {
      return Promise.resolve({
        data: [],
        success: true,
        total: 0,
      });
    }

    const processIds: string[] = [];
    result?.data.forEach((i) => {
      const id = i?.json?.data?.id;
      if (id) {
        processIds.push(id);
      }
    });
    const modelResult = await getLifeCyclesByIds(processIds);
    let data = result?.data.map((i: any) => {
      const model = modelResult?.data?.find(
        (j) => j.id === i?.json?.data?.id && j.version === i?.json?.data?.version,
      );
      return {
        key: i.id,
        id: i.id,
        isFromLifeCycle: model ? true : false,
        name:
          (model
            ? genProcessName(model?.name ?? {}, lang)
            : genProcessName(i?.json?.data?.name ?? {}, lang)) || '-',
        teamName: getLangText(i?.json?.team?.name ?? {}, lang),
        userName: i?.json?.user?.name ?? '-',
        modifiedAt: new Date(i.modified_at).toISOString(),
        stateCode: i.state_code,
        json: i?.json,
      };
    });

    return Promise.resolve({
      data: data,
      page: params?.current ?? 1,
      success: true,
      total: result?.count ?? 0,
    });
  }
  return Promise.resolve({
    data: [],
    success: false,
    total: 0,
  });
}

export async function getLatestReviewOfMine() {
  const userId = await getUserId();

  if (!userId) {
    return null;
  }

  const { data } = await supabase
    .from('reviews')
    .select('*')
    .filter('json->user->>id', 'eq', userId)
    .in('state_code', [1, 2, -1])
    .order('modified_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}
