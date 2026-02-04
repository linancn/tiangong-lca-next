import { getLifeCyclesByIdAndVersion } from '@/services/lifeCycleModels/api';
import { supabase } from '@/services/supabase';
import { getUserId } from '@/services/users/api';
import { FunctionRegion } from '@supabase/supabase-js';
import { getPendingComment, getRejectedComment, getReviewedComment } from '../comments/api';
import { getLangText } from '../general/util';
import { getProcessDetailByIdAndVersion } from '../processes/api';
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
  const session = await supabase.auth.getSession();
  const newData =
    data?.state_code && [-1, 2, 1].includes(data.state_code)
      ? { ...data, modified_at: new Date().toISOString() }
      : data;
  if (!session.data.session) {
    return undefined;
  }
  const result = await supabase.functions.invoke('update_review', {
    headers: {
      Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
    },
    body: { reviewIds, data: newData },
    region: FunctionRegion.UsEast1,
  });

  if (result.error) {
    return { error: result.error };
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

export async function getReviewsTableDataOfReviewMember(
  params: { pageSize: number; current: number },
  sort: any,
  type: 'reviewed' | 'pending' | 'reviewer-rejected',
  lang: string,
  userData?: { user_id: string | undefined },
) {
  let commentResult: any = [];

  switch (type) {
    case 'reviewed': {
      const userId = userData?.user_id ?? (await getUserId());
      if (userId) {
        commentResult = await getReviewedComment(params, sort, userId);
      }
      break;
    }
    case 'pending': {
      const userId = userData?.user_id ?? (await getUserId());
      if (userId) {
        commentResult = await getPendingComment(params, sort, userId);
      }
      break;
    }
    case 'reviewer-rejected': {
      const userId = userData?.user_id ?? (await getUserId());
      if (userId) {
        commentResult = await getRejectedComment(params, sort, userId);
      }
      break;
    }
  }
  if (commentResult.error || !commentResult.data || !commentResult.data.length) {
    return Promise.resolve({
      data: [],
      success: true,
      total: 0,
    });
  } else {
    const reviews: any[] = [];
    commentResult.data.forEach((c: any) => {
      if (c.reviews) {
        reviews.push({ ...c.reviews });
      }
    });

    const processes: { id: string; version: string }[] = [];
    reviews.forEach((i) => {
      const id = i?.json?.data?.id;
      const version = i?.json?.data?.version;
      if (id) {
        processes.push({ id, version });
      }
    });
    const modelResult = await getLifeCyclesByIdAndVersion(processes);
    let data = reviews.map((i: any) => {
      const model = modelResult?.data?.find(
        (j) => j.id === i?.json?.data?.id && j.version === i?.json?.data?.version,
      );
      const modelName =
        model?.json?.lifeCycleModelDataSet?.lifeCycleModelInformation?.dataSetInformation?.name;
      return {
        key: i.id,
        id: i.id,
        isFromLifeCycle: model ? true : false,
        name:
          (model
            ? genProcessName(modelName ?? {}, lang)
            : genProcessName(i?.json?.data?.name ?? {}, lang)) || '-',
        teamName: getLangText(i?.json?.team?.name ?? {}, lang),
        userName: i?.json?.user?.name ?? i?.json?.user?.email ?? '-',
        createAt: new Date(i.created_at).toISOString(),
        modifiedAt: new Date(i?.modified_at).toISOString(),
        deadline: i?.deadline ? new Date(i?.deadline).toISOString() : i?.deadline,
        json: i?.json,
        // Store complete model data for subtable preloading
        modelData: model
          ? { id: model.id, version: model.version, json: model.json, json_tg: model.json_tg }
          : null,
      };
    });

    return Promise.resolve({
      data: data,
      page: params?.current ?? 1,
      success: true,
      total: commentResult?.count ?? 0,
    });
  }
}

export async function getReviewsTableDataOfReviewAdmin(
  params: { pageSize: number; current: number },
  sort: any,
  type: 'unassigned' | 'assigned' | 'admin-rejected',
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
      query = query
        .eq('state_code', 1)
        .select('*, comments(state_code)')
        .filter('comments.state_code', 'gte', 0);
      break;
    }
    case 'admin-rejected': {
      query = query.eq('state_code', -1);
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
    const processes: { id: string; version: string }[] = [];
    result?.data.forEach((i) => {
      const id = i?.json?.data?.id;
      const version = i?.json?.data?.version;
      if (id) {
        processes.push({ id, version });
      }
    });
    const modelResult = await getLifeCyclesByIdAndVersion(processes);
    let data = result?.data.map((i: any) => {
      const model = modelResult?.data?.find(
        (j) => j.id === i?.json?.data?.id && j.version === i?.json?.data?.version,
      );
      const modelName =
        model?.json?.lifeCycleModelDataSet?.lifeCycleModelInformation?.dataSetInformation?.name;
      return {
        key: i.id,
        id: i.id,
        isFromLifeCycle: model ? true : false,
        name:
          (model
            ? genProcessName(modelName ?? {}, lang)
            : genProcessName(i?.json?.data?.name ?? {}, lang)) || '-',
        teamName: getLangText(i?.json?.team?.name ?? {}, lang),
        userName: i?.json?.user?.name ?? i?.json?.user?.email ?? '-',
        createAt: new Date(i.created_at).toISOString(),
        modifiedAt: new Date(i?.modified_at).toISOString(),
        deadline: i?.deadline ? new Date(i?.deadline).toISOString() : i?.deadline,
        json: i?.json,
        comments: i?.comments,
        modelData: model
          ? { id: model.id, version: model.version, json: model.json, json_tg: model.json_tg }
          : null,
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

export async function getReviewsByProcess(processId: string, processVersion: string) {
  const result = await supabase
    .from('reviews')
    .select('*')
    .filter('json->data->>id', 'eq', processId)
    .filter('json->data->>version', 'eq', processVersion);
  return result;
}

export async function getRejectReviewsByProcess(processId: string, processVersion: string) {
  const result = await supabase
    .from('reviews')
    .select('id')
    .filter('json->data->>id', 'eq', processId)
    .filter('json->data->>version', 'eq', processVersion)
    .eq('state_code', -1);
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

    const processIdAndVersions: { id: string; version: string }[] = [];
    result?.data.forEach((i) => {
      const id = i?.json?.data?.id;
      const version = i?.json?.data?.version;
      if (id && version) {
        processIdAndVersions.push({ id, version });
      }
    });
    const modelResult = await getLifeCyclesByIdAndVersion(processIdAndVersions);
    let data = result?.data.map((i: any) => {
      const model = modelResult?.data?.find(
        (j) => j.id === i?.json?.data?.id && j.version === i?.json?.data?.version,
      );
      const name =
        model?.json?.lifeCycleModelDataSet?.lifeCycleModelInformation?.dataSetInformation?.name;
      return {
        key: i.id,
        id: i.id,
        isFromLifeCycle: model ? true : false,
        name:
          (model
            ? genProcessName(name ?? {}, lang)
            : genProcessName(i?.json?.data?.name ?? {}, lang)) || '-',
        teamName: getLangText(i?.json?.team?.name ?? {}, lang),
        userName: i?.json?.user?.name ?? i?.json?.user?.email ?? '-',
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

export async function getNotifyReviewsCount(timeFilter: number = 3, lastViewTime?: number) {
  const userId = await getUserId();

  if (!userId) {
    return Promise.resolve({
      success: false,
      total: 0,
    });
  }

  let query = supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .filter('json->user->>id', 'eq', userId)
    .in('state_code', [1, -1, 2]);

  if (lastViewTime && lastViewTime > 0) {
    query = query.gt('modified_at', new Date(lastViewTime).toISOString());
  } else if (timeFilter > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeFilter);
    query = query.gte('modified_at', cutoffDate.toISOString());
  }

  const { count, error } = await query;

  return Promise.resolve({
    success: !error,
    total: count ?? 0,
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
    .limit(1);

  return data;
}

/**
 * Batch fetch subtable data for LifecycleModel
 * Collect and merge data from processInstance and json_tg.submodels
 * @param modelDatas - lifecyclemodel data array
 * @param lang - language
 * @returns Subtable data grouped by reviewId
 */
export async function getLifeCycleModelSubTableDataBatch(
  modelDatas: Array<{
    reviewId: string;
    modelData: {
      id: string;
      version: string;
      json: any;
      json_tg: any;
    };
  }>,
  lang: string,
): Promise<{
  data: Record<
    string,
    Array<{
      key: string;
      id: string;
      version: string;
      name: string;
      generalComment: string;
      sourceType: 'processInstance' | 'submodel';
      submodelType: string;
    }>
  >;
  success: boolean;
}> {
  if (!modelDatas.length) {
    return { data: {}, success: true };
  }

  // 1. Collect all process id and version that need to be fetched, and record data source and type
  const processParamMap = new Map<string, string[]>(); // key: "id:version", value: reviewId[]
  const processSourceMap = new Map<
    string,
    { source: 'processInstance' | 'submodel'; type?: string }
  >(); // key: "id:version", value: source info

  modelDatas.forEach(({ reviewId, modelData }) => {
    if (!modelData) return;

    const { json, json_tg, version } = modelData;

    // Extract from json.processInstance
    const processInstances =
      json?.lifeCycleModelDataSet?.lifeCycleModelInformation?.technology?.processes
        ?.processInstance ?? [];
    processInstances.forEach((instance: any) => {
      const refObjectId = instance?.referenceToProcess?.['@refObjectId'];
      const refVersion = instance?.referenceToProcess?.['@version'];
      if (refObjectId && refVersion) {
        const key = `${refObjectId}:${refVersion}`;
        if (!processParamMap.has(key)) {
          processParamMap.set(key, []);
        }
        processParamMap.get(key)!.push(reviewId);
        // Record source as processInstance
        if (!processSourceMap.has(key)) {
          processSourceMap.set(key, { source: 'processInstance' });
        }
      }
    });

    // Extract from json_tg.submodels
    const submodels = json_tg?.submodels ?? [];
    submodels.forEach((submodel: any) => {
      const submodelId = submodel?.id;
      const submodelType = submodel?.type; // primary or secondary
      if (submodelId) {
        const key = `${submodelId}:${version}`;
        if (!processParamMap.has(key)) {
          processParamMap.set(key, []);
        }
        processParamMap.get(key)!.push(reviewId);
        // Record source as submodel and its type
        if (!processSourceMap.has(key)) {
          processSourceMap.set(key, { source: 'submodel', type: submodelType });
        }
      }
    });
  });

  // 2. Batch fetch all process details
  const processParams = Array.from(processParamMap.keys()).map((key) => {
    const [id, version] = key.split(':');
    return { id, version };
  });

  if (processParams.length === 0) {
    return { data: {}, success: true };
  }

  const processesResult = await getProcessDetailByIdAndVersion(processParams);

  if (!processesResult.success || !processesResult.data) {
    return { data: {}, success: false };
  }

  // 3. Group and format process data by reviewId
  const resultData: Record<string, any[]> = {};

  processesResult.data.forEach((process: any) => {
    if (process.state_code !== 20) {
      return;
    }

    const key = `${process.id}:${process.version}`;
    const relatedReviewIds = processParamMap.get(key) ?? [];
    const sourceInfo = processSourceMap.get(key);

    relatedReviewIds.forEach((reviewId) => {
      if (!resultData[reviewId]) {
        resultData[reviewId] = [];
      }

      // Avoid adding the same process multiple times
      if (!resultData[reviewId].some((item: any) => item.id === process.id)) {
        resultData[reviewId].push({
          key: process.id,
          id: process.id,
          version: process.version,
          name: genProcessName(
            process.json?.processDataSet?.processInformation?.dataSetInformation?.name ?? {},
            lang,
          ),
          sourceType: sourceInfo?.source,
          submodelType: sourceInfo?.type,
        });
      }
    });
  });

  return { data: resultData, success: true };
}
