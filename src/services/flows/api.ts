import { validateDatasetRuleVerification } from '@/pages/Utils/review';
import {
  classificationToString,
  genClassificationZH,
  getLangText,
  jsonToList,
} from '../general/util';

import { supabase } from '@/services/supabase';
import { normalizeDeleteCommandResult } from '@/services/supabase/data';
import { FunctionRegion } from '@supabase/supabase-js';
import { SortOrder } from 'antd/lib/table/interface';
import { getCachedFlowCategorizationAll } from '../classifications/cache';
import {
  attachLangNormalizationMetadata,
  buildLangNormalizationMetadata,
  getDataDetail,
  getTeamIdByUserId,
  invokeDatasetCommand,
  normalizeLangPayloadForSave,
  type NormalizeLangPayloadForSaveOptions,
} from '../general/api';
import { getILCDLocationByValues } from '../locations/api';
import { getCachedLocationData } from '../locations/cache';
import { genFlowJsonOrdered, genFlowName } from './util';
function normalizeLocationData(response: any): any[] {
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  return [];
}

async function fetchLocationLookup(lang: string, locations: Array<string | null | undefined>) {
  const codes = Array.from(
    new Set(
      locations.filter(
        (code): code is string => typeof code === 'string' && code.trim().length > 0,
      ),
    ),
  );

  if (codes.length === 0) {
    await getCachedLocationData(lang, []);
    return [];
  }

  let locationData = normalizeLocationData(await getCachedLocationData(lang, codes));

  if (locationData.length === 0) {
    const fallback = await getILCDLocationByValues(lang, codes);
    locationData = normalizeLocationData(fallback);
  }

  return locationData;
}

function resolveLocationOfSupply(
  code: string | undefined,
  locationData: Array<Record<string, any>>,
) {
  if (!code) {
    return '-';
  }
  const match = locationData.find((item) => item?.['@value'] === code);
  return match?.['#text'] ?? code;
}

type FlowClassificationFilter = {
  scope: 'elementary' | 'classification';
  code: string;
};

type FlowSearchFilters = {
  flowType?: string;
  asInput?: boolean;
  classification?: FlowClassificationFilter[];
};

type FlowListRpcRow = {
  id?: string;
  json?: any;
  version?: string;
  modified_at?: string;
  team_id?: string;
  version_count?: number | string | null;
  total_count?: number | string | null;
};

function normalizeFlowVersionCount(row: FlowListRpcRow): number | undefined {
  const versionCount = Number(row.version_count ?? 0);
  if (!Number.isFinite(versionCount) || versionCount <= 0) {
    return undefined;
  }
  return versionCount;
}

function normalizeFlowTotalCount(row?: FlowListRpcRow): number {
  return Number(row?.total_count ?? 0) || 0;
}

function normalizeFlowResultTotalCount(resultData: FlowListRpcRow[], resultBody?: any): number {
  return (
    normalizeFlowTotalCount(resultData[0]) ||
    Number((resultData as any).total_count ?? 0) ||
    Number(resultBody?.total_count ?? 0) ||
    0
  );
}

function normalizeFlowSortBy(sortBy: string): string {
  if (sortBy === 'modifiedAt') {
    return 'modified_at';
  }
  if (sortBy === 'createdAt') {
    return 'created_at';
  }
  return sortBy;
}

function normalizeFlowSortDirection(orderBy: SortOrder): 'asc' | 'desc' {
  return orderBy === 'ascend' ? 'asc' : 'desc';
}

function getOptionalTeamId(tid: string | []): string | null {
  if (typeof tid === 'string' && tid.length > 0) {
    return tid;
  }
  return null;
}

async function getFlowTeamFilter(dataSource: string, tid: string | []): Promise<string | null> {
  if (dataSource === 'te') {
    return (await getTeamIdByUserId()) ?? null;
  }
  return getOptionalTeamId(tid);
}

export async function createFlows(
  id: string,
  data: any,
  options?: NormalizeLangPayloadForSaveOptions,
) {
  const rawData = genFlowJsonOrdered(id, data);
  const normalizedResult = await normalizeLangPayloadForSave(rawData, options);
  const newData = normalizedResult?.payload ?? rawData;
  const validationError = normalizedResult?.validationError;
  const langMetadata = buildLangNormalizationMetadata(normalizedResult, rawData);
  if (validationError) {
    return attachLangNormalizationMetadata(
      {
        data: null,
        error: {
          message: validationError,
          code: 'LANG_VALIDATION_ERROR',
          details: '',
          hint: '',
          name: 'LangValidationError',
        },
        status: 400,
        statusText: 'LANG_VALIDATION_ERROR',
        count: null,
      },
      langMetadata,
      options,
    );
  }
  const userTeamId = (await getTeamIdByUserId()) ?? '';
  const { ruleVerification: rule_verification } = await validateDatasetRuleVerification(
    'flow data set',
    newData,
    userTeamId,
  );
  const result = await invokeDatasetCommand(
    'app_dataset_create',
    {
      id,
      table: 'flows',
      jsonOrdered: newData,
      ruleVerification: rule_verification,
    },
    {
      ruleVerification: rule_verification,
    },
  );
  return attachLangNormalizationMetadata(result, langMetadata, options);
}

export async function updateFlows(
  id: string,
  version: string,
  data: any,
  options?: NormalizeLangPayloadForSaveOptions,
) {
  const rawData = genFlowJsonOrdered(id, data);
  const normalizedResult = await normalizeLangPayloadForSave(rawData, options);
  const newData = normalizedResult?.payload ?? rawData;
  const validationError = normalizedResult?.validationError;
  const langMetadata = buildLangNormalizationMetadata(normalizedResult, rawData);
  if (validationError) {
    return attachLangNormalizationMetadata(
      {
        data: null,
        error: {
          message: validationError,
          code: 'LANG_VALIDATION_ERROR',
          details: '',
          hint: '',
          name: 'LangValidationError',
        },
        status: 400,
        statusText: 'LANG_VALIDATION_ERROR',
        count: null,
      },
      langMetadata,
      options,
    );
  }
  const userTeamId = (await getTeamIdByUserId()) ?? '';
  const { ruleVerification: rule_verification } = await validateDatasetRuleVerification(
    'flow data set',
    newData,
    userTeamId,
  );
  const result = await invokeDatasetCommand(
    'app_dataset_save_draft',
    {
      id,
      version,
      table: 'flows',
      jsonOrdered: newData,
      ruleVerification: rule_verification,
    },
    {
      ruleVerification: rule_verification,
    },
  );
  return attachLangNormalizationMetadata(result, langMetadata, options);
}

export async function deleteFlows(id: string, version: string) {
  const result = await invokeDatasetCommand('app_dataset_delete', {
    id,
    version,
    table: 'flows',
  });
  return normalizeDeleteCommandResult(result);
}

export async function getFlowTableAll(
  params: {
    current?: number;
    pageSize?: number;
  },
  sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
  tid: string | [],
  filters?: FlowSearchFilters,
  stateCode?: string | number,
) {
  const sortBy = Object.keys(sort)[0] ?? 'modified_at';
  const orderBy = sort[sortBy] ?? 'descend';

  const session = await supabase.auth.getSession();
  if (dataSource === 'my' && !session.data.session) {
    return Promise.resolve({
      data: [],
      success: false,
    });
  }

  const teamId = await getFlowTeamFilter(dataSource, tid);
  if (dataSource === 'te' && !teamId) {
    return Promise.resolve({
      data: [],
      success: true,
    });
  }

  const rpcResult = await supabase.rpc('get_latest_flow_versions', {
    page_size: params.pageSize ?? 10,
    page_current: params.current ?? 1,
    data_source: dataSource,
    this_user_id: session.data.session?.user?.id ?? '',
    team_id_filter: teamId,
    state_code_filter: typeof stateCode === 'number' ? stateCode : null,
    filter_condition: filters ?? {},
    sort_by: normalizeFlowSortBy(sortBy),
    sort_direction: normalizeFlowSortDirection(orderBy),
  });

  const result = {
    ...rpcResult,
    count:
      normalizeFlowTotalCount(rpcResult.data?.[0]) ||
      rpcResult.count ||
      rpcResult.data?.length ||
      0,
    data: rpcResult.data?.map((i: FlowListRpcRow) => ({
      id: i.id,
      name: i.json?.flowDataSet?.flowInformation?.dataSetInformation?.name ?? (i as any).name,
      classificationInformation:
        i.json?.flowDataSet?.flowInformation?.dataSetInformation?.classificationInformation ??
        (i as any).classificationInformation,
      'common:synonyms':
        i.json?.flowDataSet?.flowInformation?.dataSetInformation?.['common:synonyms'] ??
        (i as any)['common:synonyms'],
      CASNumber:
        i.json?.flowDataSet?.flowInformation?.dataSetInformation?.CASNumber ?? (i as any).CASNumber,
      locationOfSupply:
        i.json?.flowDataSet?.flowInformation?.geography?.locationOfSupply ??
        (i as any).locationOfSupply,
      typeOfDataSet:
        i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet ??
        (i as any).typeOfDataSet,
      referenceToFlowPropertyDataSet:
        i.json?.flowDataSet?.flowProperties?.flowProperty?.referenceToFlowPropertyDataSet ??
        (i as any).referenceToFlowPropertyDataSet,
      version: i.version,
      modified_at: i.modified_at,
      team_id: i.team_id,
      version_count: i.version_count,
    })),
  };

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

    const locations = result.data.map((i: any) => i['locationOfSupply']);

    const [locationData, categorizationData] = await Promise.all([
      fetchLocationLookup(lang, locations),
      lang === 'zh' ? getCachedFlowCategorizationAll(lang) : Promise.resolve(null),
    ]);

    let data: any[] = [];

    if (lang === 'zh' && categorizationData) {
      data = result.data.map((i: any) => {
        try {
          let classificationData: any = {};
          let thisClass: any[] = [];
          if (i?.typeOfDataSet === 'Elementary flow') {
            classificationData =
              i?.classificationInformation?.['common:elementaryFlowCategorization']?.[
                'common:category'
              ];
            thisClass = categorizationData?.categoryElementaryFlow;
          } else {
            classificationData =
              i?.classificationInformation?.['common:classification']?.['common:class'];
            thisClass = categorizationData?.category;
          }

          const classifications = jsonToList(classificationData);
          const classificationZH = genClassificationZH(classifications, thisClass);

          return {
            key: i.id + ':' + i.version,
            id: i.id,
            name: genFlowName(i?.name ?? {}, lang),
            flowType: i?.typeOfDataSet ?? '-',
            classification: classificationToString(classificationZH),
            synonyms: getLangText(i?.['common:synonyms'], lang),
            CASNumber: i?.CASNumber ?? '-',
            refFlowPropertyId: i?.referenceToFlowPropertyDataSet?.['@refObjectId'] ?? '-',
            locationOfSupply: resolveLocationOfSupply(i['locationOfSupply'], locationData),
            version: i.version,
            modifiedAt: new Date(i?.modified_at),
            teamId: i?.team_id,
            versionCount: normalizeFlowVersionCount(i),
          };
        } catch (e) {
          console.error(e);
          return {
            id: i.id,
          };
        }
      });
    } else {
      data = result.data.map((i: any) => {
        try {
          let classificationData: any = {};
          if (i?.typeOfDataSet === 'Elementary flow') {
            classificationData =
              i?.classificationInformation?.['common:elementaryFlowCategorization']?.[
                'common:category'
              ];
          } else {
            classificationData =
              i?.classificationInformation?.['common:classification']?.['common:class'];
          }

          const classifications = jsonToList(classificationData);

          return {
            key: i.id + ':' + i.version,
            id: i.id,
            name: genFlowName(i?.name ?? {}, lang),
            flowType: i.typeOfDataSet ?? '-',
            classification: classificationToString(classifications),
            synonyms: getLangText(i['common:synonyms'], lang),
            CASNumber: i.CASNumber ?? '-',
            refFlowPropertyId: i.referenceToFlowPropertyDataSet?.['@refObjectId'] ?? '-',
            locationOfSupply: resolveLocationOfSupply(i['locationOfSupply'], locationData),
            version: i.version,
            modifiedAt: new Date(i.modified_at),
            teamId: i?.team_id,
            versionCount: normalizeFlowVersionCount(i),
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
      total: result.count,
    });
  }
  return Promise.resolve({
    data: [],
    success: false,
  });
}

export async function getFlowTablePgroongaSearch(
  params: {
    current?: number;
    pageSize?: number;
  },
  // sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
  queryText: string,
  filter: FlowSearchFilters,
  stateCode?: string | number,
  orderBy?: { key: 'common:class' | 'baseName'; lang?: 'en' | 'zh'; order: 'asc' | 'desc' },
  tid: string | [] = [],
) {
  let result: any = {};
  const session = await supabase.auth.getSession();

  if (session.data.session) {
    const teamId = await getFlowTeamFilter(dataSource, tid);
    if (dataSource === 'te' && !teamId) {
      return Promise.resolve({
        data: [],
        success: true,
      });
    }

    result = await supabase.rpc(
      'pgroonga_search_flows_latest',
      typeof stateCode === 'number'
        ? {
            query_text: queryText,
            filter_condition: filter,
            order_by: orderBy ?? {},
            page_size: params.pageSize ?? 10,
            page_current: params.current ?? 1,
            data_source: dataSource,
            this_user_id: session.data.session.user?.id,
            team_id_filter: teamId,
            state_code_filter: stateCode,
          }
        : {
            query_text: queryText,
            filter_condition: filter,
            order_by: orderBy ?? {},
            page_size: params.pageSize ?? 10,
            page_current: params.current ?? 1,
            data_source: dataSource,
            this_user_id: session.data.session.user?.id,
            team_id_filter: teamId,
            state_code_filter: null,
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

    const [locationData, categorizationData] = await Promise.all([
      fetchLocationLookup(
        lang,
        result.data.map(
          (i: any) => i.json?.flowDataSet?.flowInformation?.geography?.locationOfSupply,
        ),
      ),
      lang === 'zh' ? getCachedFlowCategorizationAll(lang) : Promise.resolve(null),
    ]);

    let data: any[] = [];

    if (lang === 'zh' && categorizationData) {
      data = result.data.map((i: any) => {
        try {
          const typeOfDataSet =
            i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet;
          const dataInfo = i.json?.flowDataSet?.flowInformation?.dataSetInformation;

          let classificationData: any = {};
          let thisClass: any[] = [];
          if (typeOfDataSet === 'Elementary flow') {
            classificationData =
              dataInfo?.classificationInformation?.['common:elementaryFlowCategorization']?.[
                'common:category'
              ];
            thisClass = categorizationData?.categoryElementaryFlow;
          } else {
            classificationData =
              dataInfo?.classificationInformation?.['common:classification']?.['common:class'];
            thisClass = categorizationData?.category;
          }

          const classifications = jsonToList(classificationData);

          const classificationZH = genClassificationZH(classifications, thisClass);

          return {
            key: i.id + ':' + i.version,
            id: i.id,
            name: genFlowName(dataInfo?.name ?? {}, lang),
            synonyms: getLangText(dataInfo?.['common:synonyms'] ?? {}, lang),
            flowType: typeOfDataSet ?? '-',
            classification: classificationToString(classificationZH),
            CASNumber: dataInfo?.CASNumber ?? '-',
            locationOfSupply: resolveLocationOfSupply(
              i.json?.flowDataSet?.flowInformation?.geography?.locationOfSupply,
              locationData,
            ),
            version: i.version,
            modifiedAt: new Date(i?.modified_at),
            teamId: i?.team_id,
            versionCount: normalizeFlowVersionCount(i),
          };
        } catch (e) {
          console.error(e);
          return {
            id: i.id,
          };
        }
      });
    } else {
      data = result.data.map((i: any) => {
        try {
          const dataInfo = i.json?.flowDataSet?.flowInformation?.dataSetInformation;
          const typeOfDataSet =
            i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet;
          const classificationSource =
            typeOfDataSet === 'Elementary flow'
              ? dataInfo?.classificationInformation?.['common:elementaryFlowCategorization']?.[
                  'common:category'
                ]
              : dataInfo?.classificationInformation?.['common:classification']?.['common:class'];
          const classifications = jsonToList(classificationSource);
          return {
            key: i.id + ':' + i.version,
            id: i.id,
            name: genFlowName(dataInfo?.name ?? {}, lang),
            synonyms: getLangText(dataInfo?.['common:synonyms'] ?? {}, lang),
            classification: classificationToString(classifications),
            flowType: typeOfDataSet ?? '-',
            CASNumber: dataInfo?.CASNumber ?? '-',
            locationOfSupply: resolveLocationOfSupply(
              i.json?.flowDataSet?.flowInformation?.geography?.locationOfSupply,
              locationData,
            ),
            version: i.version,
            modifiedAt: new Date(i?.modified_at),
            teamId: i?.team_id,
            versionCount: normalizeFlowVersionCount(i),
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
  return Promise.resolve({
    data: [],
    success: false,
  });
}

export async function flow_hybrid_search(
  params: {
    current?: number;
    pageSize?: number;
  },
  // sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
  query: string,
  filter: FlowSearchFilters,
  stateCode?: string | number,
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('flow_hybrid_search', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body:
        typeof stateCode === 'number'
          ? { query: query, filter: filter, state_code: stateCode }
          : { query: query, filter: filter },
      region: FunctionRegion.UsEast1,
    });
  }
  if (result.error) {
    console.log('error', result.error);
  }
  if (Array.isArray(result.data?.data)) {
    const resultData = result.data.data;
    const totalCount = normalizeFlowResultTotalCount(resultData, result.data);

    if (resultData.length === 0) {
      return Promise.resolve({
        data: [],
        success: true,
        total: totalCount,
        page: params.current ?? 1,
      });
    }

    const [locationData, categorizationData] = await Promise.all([
      fetchLocationLookup(
        lang,
        resultData.map(
          (i: any) => i.json?.flowDataSet?.flowInformation?.geography?.locationOfSupply,
        ),
      ),
      lang === 'zh' ? getCachedFlowCategorizationAll(lang) : Promise.resolve(null),
    ]);

    let data: any[] = [];

    if (lang === 'zh' && categorizationData) {
      data = resultData.map((i: any) => {
        try {
          const typeOfDataSet =
            i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet;
          const dataInfo = i.json?.flowDataSet?.flowInformation?.dataSetInformation;

          let classificationData: any = {};
          let thisClass: any[] = [];
          if (typeOfDataSet === 'Elementary flow') {
            classificationData =
              dataInfo?.classificationInformation?.['common:elementaryFlowCategorization']?.[
                'common:category'
              ];
            thisClass = categorizationData?.categoryElementaryFlow;
          } else {
            classificationData =
              dataInfo?.classificationInformation?.['common:classification']?.['common:class'];
            thisClass = categorizationData?.category;
          }

          const classifications = jsonToList(classificationData);

          const classificationZH = genClassificationZH(classifications, thisClass);

          return {
            key: i.id + ':' + i.version,
            id: i.id,
            name: genFlowName(dataInfo?.name ?? {}, lang),
            synonyms: getLangText(dataInfo?.['common:synonyms'] ?? {}, lang),
            flowType: typeOfDataSet ?? '-',
            classification: classificationToString(classificationZH),
            CASNumber: dataInfo?.CASNumber ?? '-',
            locationOfSupply: resolveLocationOfSupply(
              i.json?.flowDataSet?.flowInformation?.geography?.locationOfSupply,
              locationData,
            ),
            version: i.version,
            modifiedAt: new Date(i?.modified_at),
            teamId: i?.team_id,
            versionCount: normalizeFlowVersionCount(i),
          };
        } catch (e) {
          console.error(e);
          return {
            id: i.id,
          };
        }
      });
    } else {
      data = resultData.map((i: any) => {
        try {
          const dataInfo = i.json?.flowDataSet?.flowInformation?.dataSetInformation;
          const typeOfDataSet =
            i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet;
          const classificationSource =
            typeOfDataSet === 'Elementary flow'
              ? dataInfo?.classificationInformation?.['common:elementaryFlowCategorization']?.[
                  'common:category'
                ]
              : dataInfo?.classificationInformation?.['common:classification']?.['common:class'];
          const classifications = jsonToList(classificationSource);
          return {
            key: i.id + ':' + i.version,
            id: i.id,
            name: genFlowName(dataInfo?.name ?? {}, lang),
            synonyms: getLangText(dataInfo?.['common:synonyms'] ?? {}, lang),
            classification: classificationToString(classifications),
            flowType: typeOfDataSet ?? '-',
            CASNumber: dataInfo?.CASNumber ?? '-',
            locationOfSupply: resolveLocationOfSupply(
              i.json?.flowDataSet?.flowInformation?.geography?.locationOfSupply,
              locationData,
            ),
            version: i.version,
            modifiedAt: new Date(i?.modified_at),
            teamId: i?.team_id,
            versionCount: normalizeFlowVersionCount(i),
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
      total: totalCount,
    });
  }
  return Promise.resolve({
    data: [],
    success: false,
  });
}

export async function getFlowDetail(id: string, version: string) {
  return getDataDetail(id, version, 'flows');
}

export async function getFlowProperties(params: { id: string; version: string }[]) {
  let result: any = [];
  const selectStr = `
        id,
        version,
        json->flowDataSet->flowInformation->dataSetInformation->name,
        json->flowDataSet->modellingAndValidation->LCIMethod->>typeOfDataSet,
        json->flowDataSet->flowInformation->quantitativeReference->referenceToReferenceFlowProperty,
        json->flowDataSet->flowProperties->flowProperty
    `;

  let _ids = params.map((item) => item.id);
  let ids = _ids.filter((id) => id && id.length === 36);

  if (ids.length > 0) {
    const { data } = await supabase
      .from('flows')
      .select(selectStr)
      .in('id', ids)
      .order('version', { ascending: false });

    if (data && data.length > 0) {
      result = params.map((item: any) => {
        let property: any = data.find((i: any) => i.id === item.id && i.version === item.version);
        if (!property) {
          property = data.find((i: any) => i.id === item.id);
        }

        const dataList = jsonToList(property?.flowProperty);
        const refData = dataList.find(
          (item) => item?.['@dataSetInternalID'] === property?.referenceToReferenceFlowProperty,
        );

        return {
          id: property?.id,
          version: property?.version,
          name: property?.name ?? '-',
          typeOfDataSet: property?.typeOfDataSet ?? '-',
          refFlowPropertytId: refData?.referenceToFlowPropertyDataSet?.['@refObjectId'] ?? '-',
          refFlowPropertyShortDescription:
            refData?.referenceToFlowPropertyDataSet?.['shortDescription'] ?? {},
        };
      });
      return Promise.resolve({
        data: result,
        success: true,
      });
    }
  }
  return Promise.resolve({
    data: [],
    success: false,
  });
}

export async function getReferenceProperty(id: string, version: string) {
  let result: any = {};
  const selectStr = `
        id,
        version,
        json->flowDataSet->flowInformation->dataSetInformation->name,
        json->flowDataSet->flowInformation->quantitativeReference->referenceToReferenceFlowProperty,
        json->flowDataSet->flowProperties->flowProperty
    `;
  if (id && id.length === 36) {
    if (version && version.length === 9) {
      result = await supabase.from('flows').select(selectStr).eq('id', id).eq('version', version);
      if (result.data === null || result.data.length === 0) {
        result = await supabase
          .from('flows')
          .select(selectStr)
          .eq('id', id)
          .order('version', { ascending: false })
          .range(0, 0);
      }
    } else {
      result = await supabase
        .from('flows')
        .select(selectStr)
        .eq('id', id)
        .order('version', { ascending: false })
        .range(0, 0);
    }
    if (result?.data && result.data.length > 0) {
      const data = result.data[0];
      const dataList = jsonToList(data?.flowProperty);
      const refData = dataList.find(
        (item) => item?.['@dataSetInternalID'] === data?.referenceToReferenceFlowProperty,
      );
      return Promise.resolve({
        data: {
          id: data.id,
          version: data.version,
          name: data?.name ?? '-',
          refFlowPropertytId: refData?.referenceToFlowPropertyDataSet?.['@refObjectId'] ?? '-',
          refFlowPropertyShortDescription:
            refData?.referenceToFlowPropertyDataSet?.['shortDescription'] ?? {},
        },
        success: true,
      });
    }
    return Promise.resolve({
      data: null,
      success: false,
    });
  }
}
export async function getFlowStateCodeByIdsAndVersions(
  params: { id: string; version: string }[],
  lang: string,
) {
  if (!params || params.length === 0) {
    return { error: null, data: [] };
  }
  const filter = params.map((p) => `and(id.eq.${p.id},version.eq.${p.version})`).join(',');
  const result = await supabase
    .from('flows')
    .select(
      `
      state_code,
      id,
      version,
      json->flowDataSet->flowInformation->dataSetInformation->name,
      json->flowDataSet->flowInformation->dataSetInformation->classificationInformation,
      json->flowDataSet->flowInformation->dataSetInformation->"common:synonyms",
      json->flowDataSet->flowInformation->dataSetInformation->>CASNumber,
      json->flowDataSet->flowInformation->geography->>locationOfSupply,
      json->flowDataSet->modellingAndValidation->LCIMethod->>typeOfDataSet,
      json->flowDataSet->flowProperties->flowProperty->referenceToFlowPropertyDataSet,
      modified_at,
      team_id
      `,
    )
    .or(filter);

  if (!result || !result.data || !result.data.length) {
    return { error: result.error, data: [] };
  }
  const locations = result.data.map((i: any) => i['locationOfSupply']);

  const [locationData, categorizationData] = await Promise.all([
    fetchLocationLookup(lang, locations),
    lang === 'zh' ? getCachedFlowCategorizationAll(lang) : Promise.resolve(null),
  ]);

  let data: any[] = [];

  if (lang === 'zh' && categorizationData) {
    data = result.data.map((i: any) => {
      try {
        let classificationData: any = {};
        let thisClass: any[] = [];
        if (i?.typeOfDataSet === 'Elementary flow') {
          classificationData =
            i?.classificationInformation?.['common:elementaryFlowCategorization']?.[
              'common:category'
            ];
          thisClass = categorizationData?.categoryElementaryFlow;
        } else {
          classificationData =
            i?.classificationInformation?.['common:classification']?.['common:class'];
          thisClass = categorizationData?.category;
        }

        const classifications = jsonToList(classificationData);
        const classificationZH = genClassificationZH(classifications, thisClass);

        return {
          key: i.id + ':' + i.version,
          id: i.id,
          version: i.version,
          stateCode: i.state_code,
          classification: classificationToString(classificationZH),
          locationOfSupply: resolveLocationOfSupply(
            i.json?.flowDataSet?.flowInformation?.geography?.locationOfSupply,
            locationData,
          ),
        };
      } catch (e) {
        console.error(e);
        return {
          id: i.id,
        };
      }
    });
  } else {
    data = result.data.map((i: any) => {
      try {
        let classificationData: any = {};
        if (i?.typeOfDataSet === 'Elementary flow') {
          classificationData =
            i?.classificationInformation?.['common:elementaryFlowCategorization']?.[
              'common:category'
            ];
        } else {
          classificationData =
            i?.classificationInformation?.['common:classification']?.['common:class'];
        }

        const classifications = jsonToList(classificationData);

        return {
          key: i.id + ':' + i.version,
          id: i.id,
          version: i.version,
          stateCode: i.state_code,
          classification: classificationToString(classifications),
        };
      } catch (e) {
        console.error(e);
        return {
          id: i.id,
        };
      }
    });
  }
  return { error: null, data };
}
