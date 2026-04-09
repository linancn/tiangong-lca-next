import {
  createLegacyMutationRemovedError,
  invokeDatasetCommand,
  type TidasPackageRootTable,
} from '@/services/general/api';
import { getLifeCyclesByIdAndVersion } from '@/services/lifeCycleModels/api';
import { supabase } from '@/services/supabase';
import { getUserId } from '@/services/users/api';
import { getPendingComment, getRejectedComment, getReviewedComment } from '../comments/api';
import { getLangText } from '../general/util';
import { getProcessDetailByIdAndVersion } from '../processes/api';
import { genProcessName } from '../processes/util';
import { isCurrentAssignedReviewerCommentState } from './util';

export type ReviewSubmitDatasetTable = Extract<
  TidasPackageRootTable,
  'processes' | 'lifecyclemodels'
>;
type ReviewWorkflowCommandFunctionName =
  | 'admin_review_save_assignment_draft'
  | 'admin_review_assign_reviewers'
  | 'admin_review_revoke_reviewer'
  | 'admin_review_approve'
  | 'admin_review_reject';

type DataNotificationRpcRow = {
  id: string;
  state_code: number;
  json: any;
  modified_at: string;
  total_count?: number | string | null;
};

async function invokeReviewWorkflowCommand<Row extends Record<string, unknown>>(
  functionName: ReviewWorkflowCommandFunctionName,
  body: Record<string, unknown>,
) {
  return invokeDatasetCommand<Row>(functionName as never, body);
}

async function invokeReviewWorkflowCommandBatch<Row extends Record<string, unknown>>(
  functionName: Exclude<
    ReviewWorkflowCommandFunctionName,
    'admin_review_revoke_reviewer' | 'admin_review_approve' | 'admin_review_reject'
  >,
  reviewIds: React.Key[],
  buildBody: (reviewId: string) => Record<string, unknown>,
) {
  const results = await Promise.all(
    reviewIds.map((reviewId) =>
      invokeReviewWorkflowCommand<Row>(functionName, buildBody(String(reviewId))),
    ),
  );

  const firstError = results.find((result) => result.error);

  return {
    data: results.flatMap((result) => result.data ?? []),
    error: firstError?.error ?? null,
    count: null,
    status: firstError?.status ?? 200,
    statusText: firstError?.statusText ?? 'OK',
  };
}

export async function addReviewsApi(id: string, data: any) {
  void id;
  void data;
  return { error: createLegacyMutationRemovedError('addReviewsApi') };
}

export async function submitDatasetReviewApi<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(tableName: ReviewSubmitDatasetTable, id: string, version: string) {
  return invokeDatasetCommand<Row>('app_dataset_submit_review', {
    id,
    version,
    table: tableName,
  });
}

export async function saveReviewAssignmentDraftApi<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(reviewIds: React.Key[], reviewerIds: string[]) {
  return invokeReviewWorkflowCommandBatch<Row>(
    'admin_review_save_assignment_draft',
    reviewIds,
    (reviewId) => ({
      reviewId,
      reviewerIds,
    }),
  );
}

export async function assignReviewersApi<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(reviewIds: React.Key[], reviewerIds: string[], deadline?: string | null) {
  return invokeReviewWorkflowCommandBatch<Row>(
    'admin_review_assign_reviewers',
    reviewIds,
    (reviewId) => ({
      reviewId,
      reviewerIds,
      deadline: deadline ?? null,
    }),
  );
}

export async function revokeReviewerApi<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(reviewId: string, reviewerId: string) {
  return invokeReviewWorkflowCommand<Row>('admin_review_revoke_reviewer', {
    reviewId,
    reviewerId,
  });
}

export async function approveReviewApi<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(reviewId: string, table: ReviewSubmitDatasetTable) {
  return invokeReviewWorkflowCommand<Row>('admin_review_approve', {
    reviewId,
    table,
  });
}

export async function rejectReviewApi<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(reviewId: string, table: ReviewSubmitDatasetTable, reason: string) {
  return invokeReviewWorkflowCommand<Row>('admin_review_reject', {
    reviewId,
    table,
    reason,
  });
}

export async function updateReviewApi(reviewIds: React.Key[], data: any) {
  void reviewIds;
  void data;
  return {
    error: createLegacyMutationRemovedError('updateReviewApi'),
  };
}

export async function getReviewerIdsApi(reviewIds: React.Key[]) {
  const { data } = await supabase.from('reviews').select('reviewer_id').in('id', reviewIds);

  return Array.from(
    new Set(
      (data ?? []).flatMap((item: any) =>
        Array.isArray(item?.reviewer_id) ? item.reviewer_id : [],
      ),
    ),
  );
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
      query = query.eq('state_code', 1).select('*, comments(state_code)');
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
        comments: Array.isArray(i?.comments)
          ? i.comments.filter((comment: { state_code: number }) =>
              isCurrentAssignedReviewerCommentState(comment.state_code),
            )
          : [],
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
  const session = await supabase.auth.getSession();

  if (!session.data.session) {
    return Promise.resolve({
      data: [],
      success: false,
      total: 0,
    });
  }

  const { data, error } = await supabase.rpc('qry_notification_get_my_data_items', {
    p_page: params.current ?? 1,
    p_page_size: params.pageSize ?? 10,
    p_days: timeFilter,
  });

  if (error || !Array.isArray(data)) {
    return Promise.resolve({
      data: [],
      success: false,
      total: 0,
    });
  }

  if (data.length === 0) {
    return Promise.resolve({
      data: [],
      success: true,
      total: 0,
    });
  }

  const rows = data as DataNotificationRpcRow[];
  const processIdAndVersions: { id: string; version: string }[] = [];
  rows.forEach((row) => {
    const id = row?.json?.data?.id;
    const version = row?.json?.data?.version;
    if (id && version) {
      processIdAndVersions.push({ id, version });
    }
  });
  const modelResult = await getLifeCyclesByIdAndVersion(processIdAndVersions);
  const mappedRows = rows.map((row) => {
    const model = modelResult?.data?.find(
      (candidate) =>
        candidate.id === row?.json?.data?.id && candidate.version === row?.json?.data?.version,
    );
    const name =
      model?.json?.lifeCycleModelDataSet?.lifeCycleModelInformation?.dataSetInformation?.name;
    return {
      key: row.id,
      id: row.id,
      isFromLifeCycle: model ? true : false,
      name:
        (model
          ? genProcessName(name ?? {}, lang)
          : genProcessName(row?.json?.data?.name ?? {}, lang)) || '-',
      teamName: getLangText(row?.json?.team?.name ?? {}, lang),
      userName: row?.json?.user?.name ?? row?.json?.user?.email ?? '-',
      modifiedAt: new Date(row.modified_at).toISOString(),
      stateCode: row.state_code,
      json: row?.json,
    };
  });

  return Promise.resolve({
    data: mappedRows,
    page: params?.current ?? 1,
    success: true,
    total: Number(rows[0]?.total_count ?? 0) || 0,
  });
}

export async function getNotifyReviewsCount(timeFilter: number = 3, lastViewTime?: number) {
  const session = await supabase.auth.getSession();

  if (!session.data.session) {
    return Promise.resolve({
      success: false,
      total: 0,
    });
  }

  const { data, error } = await supabase.rpc('qry_notification_get_my_data_count', {
    p_days: timeFilter,
    p_last_view_at: lastViewTime && lastViewTime > 0 ? new Date(lastViewTime).toISOString() : null,
  });

  return Promise.resolve({
    success: !error,
    total: Number(data ?? 0) || 0,
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
