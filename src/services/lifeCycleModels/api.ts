import {
  getAllRefObj,
  getRefTableName,
  validateDatasetRuleVerification,
} from '@/pages/Utils/review';
import { getCurrentUser } from '@/services/auth';
import { contributeSource, getRefData, normalizeLangPayloadForSave } from '@/services/general/api';
import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';
import { SortOrder } from 'antd/lib/table/interface';
import { getILCDClassification } from '../classifications/api';
import { getTeamIdByUserId } from '../general/api';
import {
  classificationToString,
  genClassificationZH,
  getLangText,
  jsonToList,
} from '../general/util';
import { getProcessDetailByIdsAndVersion } from '../processes/api';
import { genProcessName } from '../processes/util';
import type {
  LifeCycleModelJsonTg,
  LifeCycleModelMutationResult,
  LifeCycleModelPersistencePlan,
} from './data';
import {
  buildDeleteLifeCycleModelBundlePayload,
  buildReviewUpdateLifeCycleModelPersistencePlan,
  buildSaveLifeCycleModelPersistencePlan,
} from './persistencePlan';
import { genLifeCycleModelJsonOrdered } from './util';
import { genLifeCycleModelProcesses } from './util_calculate';

function buildMutationError(
  code: string,
  message: string,
  details?: unknown,
): LifeCycleModelMutationResult {
  return {
    ok: false,
    code,
    message,
    details,
  };
}

function buildLangValidationError(validationError: string): LifeCycleModelMutationResult {
  return buildMutationError('LANG_VALIDATION_ERROR', validationError);
}

function isLifecycleModelMutationResult(value: unknown): value is LifeCycleModelMutationResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    typeof (value as { ok?: unknown }).ok === 'boolean'
  );
}

async function parseFunctionInvokeError(error: any): Promise<LifeCycleModelMutationResult> {
  const status = Number(error?.context?.status ?? 0);
  const response = error?.context;

  if (response && typeof response.clone === 'function') {
    try {
      const payload = await response.clone().json();
      if (isLifecycleModelMutationResult(payload)) {
        return payload;
      }

      if (payload && typeof payload === 'object') {
        const record = payload as Record<string, unknown>;
        if (typeof record.code === 'string' && typeof record.message === 'string') {
          return buildMutationError(record.code, record.message, record.details);
        }
      }
    } catch (_jsonError) {
      // ignore JSON parse failures and fall back to text / generic handling.
    }
  }

  if (response && typeof response.clone === 'function') {
    try {
      const text = await response.clone().text();
      if (status === 401) {
        return buildMutationError('AUTH_REQUIRED', text || 'Authentication required');
      }
      if (status === 403) {
        return buildMutationError('FORBIDDEN', text || 'Forbidden');
      }
      if (status === 404) {
        return buildMutationError('MODEL_NOT_FOUND', text || 'Lifecycle model not found');
      }
      if (text) {
        return buildMutationError('FUNCTION_ERROR', text, { status });
      }
    } catch (_textError) {
      // ignore text parse failures and fall through to generic handling.
    }
  }

  if (status === 401) {
    return buildMutationError('AUTH_REQUIRED', 'Authentication required');
  }
  if (status === 403) {
    return buildMutationError('FORBIDDEN', 'Forbidden');
  }
  if (status === 404) {
    return buildMutationError('MODEL_NOT_FOUND', 'Lifecycle model not found');
  }

  return buildMutationError(
    'FUNCTION_ERROR',
    error?.message ?? 'Lifecycle model bundle request failed',
    error,
  );
}

async function invokeLifecycleModelBundleFunction(
  functionName: 'save_lifecycle_model_bundle' | 'delete_lifecycle_model_bundle',
  body: Record<string, unknown>,
): Promise<LifeCycleModelMutationResult> {
  try {
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;
    if (!accessToken) {
      return buildMutationError('AUTH_REQUIRED', 'Authentication required');
    }

    const result = await supabase.functions.invoke(functionName, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body,
      region: FunctionRegion.UsEast1,
    });

    if (!result) {
      return buildMutationError('FUNCTION_ERROR', 'Lifecycle model bundle request failed');
    }

    if (result.error) {
      return parseFunctionInvokeError(result.error);
    }

    if (isLifecycleModelMutationResult(result.data)) {
      return result.data;
    }

    return buildMutationError(
      'INVALID_RESPONSE',
      'Lifecycle model bundle endpoint returned an invalid response',
      result.data,
    );
  } catch (error: any) {
    return buildMutationError(
      'FUNCTION_ERROR',
      error?.message ?? 'Lifecycle model bundle request failed',
      error,
    );
  }
}

async function applyReferenceAwareRuleVerification(
  plan: LifeCycleModelPersistencePlan,
  userTeamId: string,
): Promise<LifeCycleModelPersistencePlan> {
  const parentValidation = await validateDatasetRuleVerification(
    'lifeCycleModel data set',
    plan.parent.jsonOrdered,
    userTeamId,
  );

  const processMutations = await Promise.all(
    plan.processMutations.map(async (mutation) => {
      if (mutation.op === 'delete') {
        return mutation;
      }

      const processValidation = await validateDatasetRuleVerification(
        'process data set',
        mutation.jsonOrdered,
        userTeamId,
      );

      return {
        ...mutation,
        ruleVerification: processValidation.ruleVerification,
      };
    }),
  );

  return {
    ...plan,
    parent: {
      ...plan.parent,
      ruleVerification: parentValidation.ruleVerification,
    },
    processMutations,
  };
}

export async function createLifeCycleModel(data: any): Promise<LifeCycleModelMutationResult> {
  const rawLifeCycleModelJsonOrdered = genLifeCycleModelJsonOrdered(data.id, data);
  const normalizedCreateResult = await normalizeLangPayloadForSave(rawLifeCycleModelJsonOrdered);
  const newLifeCycleModelJsonOrdered =
    normalizedCreateResult?.payload ?? rawLifeCycleModelJsonOrdered;
  const validationError = normalizedCreateResult?.validationError;
  if (validationError) {
    return buildLangValidationError(validationError);
  }

  const { lifeCycleModelProcesses, up2DownEdges } = await genLifeCycleModelProcesses(
    data.id,
    data?.model?.nodes ?? [],
    newLifeCycleModelJsonOrdered,
    [],
  );

  const planResult = await buildSaveLifeCycleModelPersistencePlan({
    mode: 'create',
    modelId: data.id,
    lifeCycleModelJsonOrdered: newLifeCycleModelJsonOrdered,
    nodes: data?.model?.nodes ?? [],
    edges: data?.model?.edges ?? [],
    up2DownEdges,
    lifeCycleModelProcesses,
  });

  if (!planResult.ok) {
    return buildMutationError(planResult.code, planResult.message, planResult.details);
  }
  const userTeamId = (await getTeamIdByUserId()) ?? '';
  const plan = await applyReferenceAwareRuleVerification(planResult.plan, userTeamId);
  return invokeLifecycleModelBundleFunction('save_lifecycle_model_bundle', plan);
}

export async function updateLifeCycleModel(data: any): Promise<LifeCycleModelMutationResult> {
  const currentModelResult = await supabase
    .from('lifecyclemodels')
    .select('id, json_tg->submodels')
    .eq('id', data.id)
    .eq('version', data.version);

  if (currentModelResult.error) {
    return buildMutationError(
      'MODEL_LOOKUP_FAILED',
      'Failed to load lifecycle model before saving',
      currentModelResult.error,
    );
  }

  if (!currentModelResult.data || currentModelResult.data.length !== 1) {
    return buildMutationError('MODEL_NOT_FOUND', 'Lifecycle model not found');
  }

  const oldSubmodels = jsonToList(currentModelResult.data[0].submodels);
  const rawLifeCycleModelJsonOrdered = genLifeCycleModelJsonOrdered(data.id, data);
  const normalizedUpdateResult = await normalizeLangPayloadForSave(rawLifeCycleModelJsonOrdered);
  const newLifeCycleModelJsonOrdered =
    normalizedUpdateResult?.payload ?? rawLifeCycleModelJsonOrdered;
  const validationError = normalizedUpdateResult?.validationError;
  if (validationError) {
    return buildLangValidationError(validationError);
  }

  const { lifeCycleModelProcesses, up2DownEdges } = await genLifeCycleModelProcesses(
    data.id,
    data?.model?.nodes ?? [],
    newLifeCycleModelJsonOrdered,
    oldSubmodels,
  );

  const oldProcessesResult = await getProcessDetailByIdsAndVersion(
    lifeCycleModelProcesses.map((process: any) => process.modelInfo.id),
    data.version,
  );
  const oldProcesses = oldProcessesResult?.data ?? [];

  const planResult = await buildSaveLifeCycleModelPersistencePlan({
    mode: 'update',
    modelId: data.id,
    version: data.version,
    lifeCycleModelJsonOrdered: newLifeCycleModelJsonOrdered,
    nodes: data?.model?.nodes ?? [],
    edges: data?.model?.edges ?? [],
    up2DownEdges,
    lifeCycleModelProcesses,
    oldSubmodels,
    oldProcesses,
  });

  if (!planResult.ok) {
    return buildMutationError(planResult.code, planResult.message, planResult.details);
  }
  const userTeamId = (await getTeamIdByUserId()) ?? '';
  const plan = await applyReferenceAwareRuleVerification(planResult.plan, userTeamId);
  return invokeLifecycleModelBundleFunction('save_lifecycle_model_bundle', plan);
}

export async function updateLifeCycleModelJsonApi(
  id: string,
  version: string,
  data: any,
  options: { commentReview?: any[]; commentCompliance?: any[] } = {},
): Promise<LifeCycleModelMutationResult> {
  const normalizedResult = await normalizeLangPayloadForSave(data);
  const normalizedData = normalizedResult?.payload ?? data;
  const validationError = normalizedResult?.validationError;
  if (validationError) {
    return buildLangValidationError(validationError);
  }

  const currentModelResult = await supabase
    .from('lifecyclemodels')
    .select('json_tg, rule_verification')
    .eq('id', id)
    .eq('version', version);

  if (currentModelResult.error) {
    return buildMutationError(
      'MODEL_LOOKUP_FAILED',
      'Failed to load lifecycle model before review update',
      currentModelResult.error,
    );
  }

  if (!currentModelResult.data || currentModelResult.data.length !== 1) {
    return buildMutationError('MODEL_NOT_FOUND', 'Lifecycle model not found');
  }

  const currentModel = currentModelResult.data[0];
  const currentJsonTg = (currentModel.json_tg ?? {}) as LifeCycleModelJsonTg;
  const submodels = jsonToList(currentJsonTg?.submodels);
  const submodelIds = submodels.map((item: any) => item.id).filter(Boolean);

  let currentProcesses: Array<{
    id: string;
    version: string;
    json_ordered: any;
    rule_verification?: boolean | null;
  }> = [];

  if (submodelIds.length > 0) {
    const currentProcessesResult = await supabase
      .from('processes')
      .select('id, version, json_ordered, rule_verification')
      .eq('version', version)
      .in('id', submodelIds);

    if (currentProcessesResult.error) {
      return buildMutationError(
        'PROCESS_LOOKUP_FAILED',
        'Failed to load current submodel processes before review update',
        currentProcessesResult.error,
      );
    }

    currentProcesses = currentProcessesResult.data ?? [];
  }

  const planResult = await buildReviewUpdateLifeCycleModelPersistencePlan({
    modelId: id,
    version,
    lifeCycleModelJsonOrdered: normalizedData,
    currentJsonTg,
    currentRuleVerification: Boolean(currentModel.rule_verification),
    submodels,
    currentProcesses,
    commentReview: options.commentReview,
    commentCompliance: options.commentCompliance,
  });

  if (!planResult.ok) {
    return buildMutationError(planResult.code, planResult.message, planResult.details);
  }

  return invokeLifecycleModelBundleFunction('save_lifecycle_model_bundle', planResult.plan);
}

export async function deleteLifeCycleModel(
  id: string,
  version: string,
): Promise<LifeCycleModelMutationResult> {
  return invokeLifecycleModelBundleFunction(
    'delete_lifecycle_model_bundle',
    buildDeleteLifeCycleModelBundlePayload(id, version),
  );
}

export async function getLifeCycleModelTableAll(
  params: {
    current?: number;
    pageSize?: number;
  },
  sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
  tid: string,
  stateCode?: string | number,
) {
  const sortBy = Object.keys(sort)[0] ?? 'modified_at';
  const orderBy = sort[sortBy] ?? 'descend';

  const selectStr = `
    id,
    json->lifeCycleModelDataSet->lifeCycleModelInformation->dataSetInformation->name,
    json->lifeCycleModelDataSet->lifeCycleModelInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
    json->lifeCycleModelDataSet->lifeCycleModelInformation->dataSetInformation->"common:generalComment",
    version,
    modified_at,
    team_id
  `;

  const tableName = 'lifecyclemodels';

  let query = supabase
    .from(tableName)
    .select(selectStr, { count: 'exact' })
    .order(sortBy, { ascending: orderBy === 'ascend' })
    .range(
      ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
      (params.current ?? 1) * (params.pageSize ?? 10) - 1,
    );

  if (dataSource === 'tg') {
    query = query.eq('state_code', 100);
    if (tid.length > 0) {
      query = query.eq('team_id', tid);
    }
  } else if (dataSource === 'co') {
    query = query.eq('state_code', 200);
    if (tid.length > 0) {
      query = query.eq('team_id', tid);
    }
  } else if (dataSource === 'my') {
    if (typeof stateCode === 'number') {
      query = query.eq('state_code', stateCode);
    }
    const session = await supabase.auth.getSession();
    if (session.data.session) {
      query = query.eq('user_id', session?.data?.session?.user?.id);
    } else {
      return Promise.resolve({
        data: [],
        success: false,
      });
    }
  } else if (dataSource === 'te') {
    const teamId = await getTeamIdByUserId();
    if (teamId) {
      query = query.eq('team_id', teamId);
    } else {
      return Promise.resolve({
        data: [],
        success: true,
      });
    }
  }

  const result = await query;

  if (result.error) {
    console.log('error', result.error);
  }

  if (result.data) {
    if (result.data.length === 0) {
      return Promise.resolve({
        data: [],
        success: true,
      });
    }

    let data: any[] = [];
    if (lang === 'zh') {
      await getILCDClassification('LifeCycleModel', lang, ['all']).then((res) => {
        data = result.data.map((i: any) => {
          try {
            const classifications = jsonToList(i['common:class']);
            const classificationZH = genClassificationZH(classifications, res?.data);

            return {
              key: i.id,
              id: i.id,
              name: genProcessName(i.name ?? {}, lang),
              generalComment: getLangText(i?.['common:generalComment'], lang),
              classification: classificationToString(classificationZH ?? {}),
              version: i?.version,
              modifiedAt: new Date(i?.modified_at),
              teamId: i?.team_id,
            };
          } catch (e) {
            console.error(e);
            return {
              id: i.id,
            };
          }
        });
      });
    } else {
      data = result.data.map((i: any) => {
        try {
          const classifications = jsonToList(i['common:class']);
          return {
            key: i.id,
            id: i.id,
            name: genProcessName(i.name ?? {}, lang),
            generalComment: getLangText(i?.['common:generalComment'], lang),
            classification: classificationToString(classifications),
            version: i?.version,
            modifiedAt: new Date(i?.modified_at),
            teamId: i?.team_id,
          };
        } catch (e) {
          console.error(e);
          return {
            id: i.id,
          };
        }
      });
    }

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: result.count ?? 0,
    });
  }
  return Promise.resolve({
    data: [],
    success: false,
  });
}

export async function getLifeCycleModelTablePgroongaSearch(
  params: {
    current?: number;
    pageSize?: number;
  },
  // sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
  queryText: string,
  filterCondition: any,
  stateCode?: string | number,
  orderBy?: { key: 'common:class' | 'baseName'; lang?: 'en' | 'zh'; order: 'asc' | 'desc' },
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.rpc(
      'pgroonga_search_lifecyclemodels_v1',
      typeof stateCode === 'number'
        ? {
            query_text: queryText,
            filter_condition: filterCondition,
            page_size: params.pageSize ?? 10,
            page_current: params.current ?? 1,
            data_source: dataSource,
            order_by: orderBy,
            // this_user_id: session.data.session.user?.id,
            state_code: stateCode,
          }
        : {
            query_text: queryText,
            filter_condition: filterCondition,
            page_size: params.pageSize ?? 10,
            page_current: params.current ?? 1,
            data_source: dataSource,
            order_by: orderBy,
            // this_user_id: session.data.session.user?.id,
          },
    );
  }
  if (result.error) {
    console.log('error', result.error);
  }
  if (result.data) {
    if (result.data.length === 0) {
      return Promise.resolve({
        data: [],
        success: true,
      });
    }
    const totalCount = result.data[0].total_count;

    let data: any[] = [];
    if (lang === 'zh') {
      await getILCDClassification('LifeCycleModel', lang, ['all']).then((res) => {
        data = result.data.map((i: any) => {
          try {
            const dataInfo = i.json?.lifeCycleModelDataSet?.lifeCycleModelInformation;

            const classifications = jsonToList(
              dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
                'common:class'
              ],
            );
            const classificationZH = genClassificationZH(classifications, res?.data);

            return {
              key: i.id,
              id: i.id,
              name: genProcessName(dataInfo?.dataSetInformation?.name ?? {}, lang),
              generalComment: getLangText(
                dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
                lang,
              ),
              classification: classificationToString(classificationZH),
              version: i?.version,
              modifiedAt: new Date(i?.modified_at),
              teamId: i?.team_id,
            };
          } catch (e) {
            console.error(e);
            return {
              id: i.id,
            };
          }
        });
      });
    } else {
      data = result.data.map((i: any) => {
        try {
          const dataInfo = i.json?.lifeCycleModelDataSet?.lifeCycleModelInformation;
          const classifications = jsonToList(
            dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
              'common:class'
            ],
          );
          return {
            key: i.id,
            id: i.id,
            name: genProcessName(dataInfo?.dataSetInformation?.name ?? {}, lang),
            generalComment: getLangText(
              dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
              lang,
            ),
            classification: classificationToString(classifications),
            version: i?.version,
            modifiedAt: new Date(i?.modified_at),
            teamId: i?.team_id,
          };
        } catch (e) {
          console.error(e);
          return {
            id: i.id,
          };
        }
      });
    }

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: totalCount ?? 0,
    });
  }

  return result;
}
export async function lifeCycleModel_hybrid_search(
  params: {
    current?: number;
    pageSize?: number;
  },
  // sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
  queryText: string,
  filterCondition: any,
  stateCode?: string | number,
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('lifecyclemodel_hybrid_search', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body:
        typeof stateCode === 'number'
          ? { query: queryText, filter: filterCondition, state_code: stateCode }
          : { query: queryText, filter: filterCondition },
      region: FunctionRegion.UsEast1,
    });
  }
  if (result.error) {
    console.log('error', result.error);
  }
  if (result.data?.data) {
    if (result.data?.data.length === 0) {
      return Promise.resolve({
        data: [],
        success: true,
      });
    }
    const resultData = result.data.data;
    const totalCount = resultData.total_count;

    let data: any[] = [];
    if (lang === 'zh') {
      await getILCDClassification('LifeCycleModel', lang, ['all']).then((res) => {
        data = resultData.map((i: any) => {
          try {
            const dataInfo = i.json?.lifeCycleModelDataSet?.lifeCycleModelInformation;

            const classifications = jsonToList(
              dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
                'common:class'
              ],
            );
            const classificationZH = genClassificationZH(classifications, res?.data);

            return {
              key: i.id,
              id: i.id,
              name: genProcessName(dataInfo?.dataSetInformation?.name ?? {}, lang),
              generalComment: getLangText(
                dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
                lang,
              ),
              classification: classificationToString(classificationZH),
              version: i?.version,
              modifiedAt: new Date(i?.modified_at),
              teamId: i?.team_id,
            };
          } catch (e) {
            console.error(e);
            return {
              id: i.id,
            };
          }
        });
      });
    } else {
      data = resultData.map((i: any) => {
        try {
          const dataInfo = i.json?.lifeCycleModelDataSet?.lifeCycleModelInformation;
          const classifications = jsonToList(
            dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
              'common:class'
            ],
          );
          return {
            key: i.id,
            id: i.id,
            name: genProcessName(dataInfo?.dataSetInformation?.name ?? {}, lang),
            generalComment: getLangText(
              dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
              lang,
            ),
            classification: classificationToString(classifications),
            version: i?.version,
            modifiedAt: new Date(i?.modified_at),
            teamId: i?.team_id,
          };
        } catch (e) {
          console.error(e);
          return {
            id: i.id,
          };
        }
      });
    }

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: totalCount ?? 0,
    });
  }

  return result;
}
export async function getLifeCyclesByIdAndVersion(params: { id: string; version: string }[]) {
  if (!params.length) {
    return { data: [] };
  }

  const orConditions = params.map((k) => `and(id.eq.${k.id},version.eq.${k.version})`).join(',');

  const result = await supabase
    .from('lifecyclemodels')
    .select('id, version, json, json_tg, modified_at, team_id')
    .or(orConditions);

  return result;
}

export async function getLifeCycleModelDetail(
  id: string,
  version: string,
): Promise<
  | {
      data: {
        id: string;
        version: string;
        json: any;
        json_tg: any;
        stateCode: number;
        ruleVerification: any;
      };
      success: true;
    }
  | {
      data: object;
      success: false;
    }
> {
  const result = await supabase
    .from('lifecyclemodels')
    .select('json, json_tg,state_code,rule_verification,team_id')
    .eq('id', id)
    .eq('version', version);
  if (result.data && result.data.length > 0) {
    const data = result.data[0];

    return Promise.resolve({
      data: {
        id: id,
        version: version,
        json: data.json,
        json_tg: data?.json_tg,
        stateCode: data?.state_code,
        ruleVerification: data?.rule_verification,
        teamId: data?.team_id,
      },
      success: true,
    });
  }
  return Promise.resolve({
    data: {},
    success: false,
  });
}

export async function contributeLifeCycleModel(id: string, version: string) {
  const currentUser = await getCurrentUser();
  const userid = currentUser?.userid;

  if (!userid) {
    console.error('Failed to get current user');
    return { error: true, message: 'Failed to get current user' };
  }

  const modelDetail = await getLifeCycleModelDetail(id, version);
  const refs = getAllRefObj(modelDetail);

  const needContributeMap = new Map<string, any>();
  const processedRefsSet = new Set<string>();

  const modelRefsRecursively = async (refsList: any[]): Promise<void> => {
    const uniqueRefsMap = new Map<string, any>();
    refsList.forEach((ref: any) => {
      const key = `${ref['@refObjectId']}:${ref['@version']}:${ref['@type']}`;
      if (!processedRefsSet.has(key)) {
        uniqueRefsMap.set(key, ref);
        processedRefsSet.add(key);
      }
    });

    if (uniqueRefsMap.size === 0) {
      return;
    }

    const uniqueRefs = Array.from(uniqueRefsMap.values());
    const refDataPromises = uniqueRefs.map(async (ref: any) => {
      const tableName = getRefTableName(ref['@type']);

      if (!tableName) {
        return null;
      }

      try {
        const refData = await getRefData(ref['@refObjectId'], ref['@version'], tableName);
        return {
          ref,
          refData: refData?.data,
          success: refData?.success,
        };
      } catch (error) {
        console.error('Error fetching ref data:', error);
        return null;
      }
    });

    const refResults = await Promise.all(refDataPromises);

    const nextLevelRefs: any[] = [];

    refResults.forEach((item) => {
      if (item && item.success && item.refData) {
        const refKey = `${item.ref['@refObjectId']}:${item.ref['@version']}:${item.ref['@type']}`;

        if (
          item.refData.stateCode !== 100 &&
          item.refData.stateCode !== 200 &&
          item.refData.userId === userid
        ) {
          if (!needContributeMap.has(refKey)) {
            needContributeMap.set(refKey, {
              type: item.ref['@type'],
              ...item.refData,
              id: item.ref['@refObjectId'],
              version: item.ref['@version'],
            });
          }
        }

        if (item.refData.json) {
          const subRefs = getAllRefObj(item.refData.json);
          if (subRefs && subRefs.length > 0) {
            nextLevelRefs.push(...subRefs);
          }
        }
      }
    });

    if (nextLevelRefs.length > 0) {
      await modelRefsRecursively(nextLevelRefs);
    }
  };

  await modelRefsRecursively(refs);

  const result = Array.from(needContributeMap.values());
  result.push({
    id: id,
    version: version,
    type: 'lifeCycleModel data set',
  });

  const contributePromises = result.map(async (item) => {
    const tableName = getRefTableName(item.type);
    if (!tableName) {
      return {
        success: false,
        error: 'Invalid table name',
        id: item.id,
        version: item.version,
      };
    }

    try {
      const contributeResult = await contributeSource(tableName, item.id, item.version);
      return {
        success: true,
        data: contributeResult,
        id: item.id,
        version: item.version,
        type: item.type,
      };
    } catch (error) {
      console.error('Error contributing data:', error);
      return {
        success: false,
        error,
        id: item.id,
        version: item.version,
      };
    }
  });

  const contributeResults = await Promise.all(contributePromises);

  return {
    success: true,
    needContribute: result,
    contributeResults,
  };
}
