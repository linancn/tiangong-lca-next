import { getLifeCyclesByIds } from '@/services/lifeCycleModels/api';
import { supabase } from '@/services/supabase';
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
  let query = supabase.from('reviews').update(data).in('id', reviewIds).select();
  const result = await query;
  return result;
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

export async function getReviewsTableData(
  params: { pageSize: number; current: number },
  sort: any,
  type: 'unassigned' | 'assigned' | 'review',
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

  if (type === 'unassigned') {
    query = query.eq('state_code', 0);
  }
  if (type === 'assigned') {
    query = query.eq('state_code', 1);
  }
  if (type === 'review') {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;
    if (userId) {
      query = query.filter('reviewer_id', 'cs', `[${JSON.stringify(userId)}]`).eq('state_code', 1);
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

    const processIds = result?.data.map((i) => i?.json?.data?.id);
    const modelResult = await getLifeCyclesByIds(processIds);

    let data = result?.data.map((i: any) => {
      const model = modelResult?.data?.find((j) => j.id === i.id && j.version === i.version);
      return {
        key: i.id,
        id: i.id,
        isFromLifeCycle: model ? true : false,
        processName: genProcessName(i?.json?.data?.name ?? {}, lang) || '-',
        teamName: getLangText(i?.json?.team?.name ?? {}, lang),
        userName: i?.json?.user?.name ?? '-',
        createAt: new Date(i.created_at).toISOString(),
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
    success: true,
    total: 0,
  });
}
