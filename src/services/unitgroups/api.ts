import { validateDatasetRuleVerification } from '@/pages/Utils/review';
import {
  classificationToString,
  genLocalizedClassification,
  getLangText,
  jsonToList,
} from '../general/util';

import { supabase } from '@/services/supabase';
import { normalizeDeleteCommandResult } from '@/services/supabase/data';
import { SortOrder } from 'antd/lib/table/interface';
import { getCachedClassificationData } from '../classifications/cache';
import {
  mapDatasetUuidMentionRowsToListRows,
  normalizeDatasetUuidMentionTeamId,
  searchDatasetJsonUuidMentionPage,
} from '../datasetUuidMentionSearch/api';
import {
  attachLangNormalizationMetadata,
  buildLangNormalizationMetadata,
  getDataDetail,
  getTeamIdByUserId,
  invokeDatasetCommand,
  invokeDatasetCreateVersion,
  normalizeLangPayloadForSave,
  type NormalizeLangPayloadForSaveOptions,
} from '../general/api';
import { genUnitGroupJsonOrdered } from './util';

type UnitGroupListRpcRow = {
  id?: string;
  json?: any;
  version?: string;
  modified_at?: string;
  team_id?: string;
  total_count?: number | string | null;
};

function normalizeUnitGroupTotalCount(row?: UnitGroupListRpcRow): number {
  return Number(row?.total_count ?? 0) || 0;
}

function normalizeUnitGroupSortBy(sortBy: string): string {
  if (sortBy === 'modifiedAt') {
    return 'modified_at';
  }
  if (sortBy === 'createdAt') {
    return 'created_at';
  }
  return sortBy;
}

function normalizeUnitGroupSortDirection(orderBy: SortOrder): 'asc' | 'desc' {
  return orderBy === 'ascend' ? 'asc' : 'desc';
}

function getOptionalTeamId(tid: string | []): string | null {
  if (typeof tid === 'string' && tid.length > 0) {
    return tid;
  }
  return null;
}

async function getUnitGroupTeamFilter(dataSource: string, tid: string | []) {
  if (dataSource === 'te') {
    return await getTeamIdByUserId();
  }
  if (dataSource === 'tg' || dataSource === 'co') {
    return getOptionalTeamId(tid);
  }
  return null;
}

async function mapUnitGroupListRows(rows: UnitGroupListRpcRow[], lang: string): Promise<any[]> {
  const classificationData = await getCachedClassificationData('UnitGroup', lang, ['all']);

  return rows.map((i) => {
    try {
      const dataSet = i.json?.unitGroupDataSet;
      const dataInfo = dataSet?.unitGroupInformation;
      const classifications = jsonToList(
        dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
          'common:class'
        ],
      );
      const refUnitId = dataInfo?.quantitativeReference?.referenceToReferenceUnit ?? '-';
      const unitList = jsonToList(dataSet?.units?.unit);
      const refUnit = unitList.find((item) => item?.['@dataSetInternalID'] === refUnitId);

      return {
        key: i.id + ':' + i.version,
        id: i.id,
        name: getLangText(dataInfo?.dataSetInformation?.['common:name'], lang),
        classification: classificationToString(
          genLocalizedClassification(classifications, classificationData),
        ),
        refUnitId,
        refUnitName: refUnit?.name ?? '-',
        refUnitGeneralComment: getLangText(refUnit?.generalComment, lang),
        version: i.version,
        modifiedAt: new Date(i.modified_at ?? ''),
        teamId: i.team_id,
      };
    } catch (e) {
      console.error(e);
      return {
        id: i.id,
      };
    }
  });
}

export async function createUnitGroup(
  id: string,
  data: any,
  options?: NormalizeLangPayloadForSaveOptions,
) {
  const rawData = genUnitGroupJsonOrdered(id, data);
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
    'unit group data set',
    newData,
    userTeamId,
  );
  const result = await invokeDatasetCommand(
    'app_dataset_create',
    {
      id,
      table: 'unitgroups',
      jsonOrdered: newData,
      ruleVerification: rule_verification,
    },
    {
      ruleVerification: rule_verification,
    },
  );
  return attachLangNormalizationMetadata(result, langMetadata, options);
}

export async function createUnitGroupVersion(
  id: string,
  sourceVersion: string,
  data: any,
  options?: NormalizeLangPayloadForSaveOptions,
) {
  const rawData = genUnitGroupJsonOrdered(id, data);
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
    'unit group data set',
    newData,
    userTeamId,
  );
  const result = await invokeDatasetCreateVersion(
    {
      id,
      table: 'unitgroups',
      sourceVersion,
      jsonOrdered: newData,
      ruleVerification: rule_verification,
    },
    {
      ruleVerification: rule_verification,
    },
  );
  return attachLangNormalizationMetadata(result, langMetadata, options);
}

export async function updateUnitGroup(
  id: string,
  version: string,
  data: any,
  options?: NormalizeLangPayloadForSaveOptions,
) {
  const rawData = genUnitGroupJsonOrdered(id, data);
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
    'unit group data set',
    newData,
    userTeamId,
  );

  const result = await invokeDatasetCommand(
    'app_dataset_save_draft',
    {
      id,
      version,
      table: 'unitgroups',
      jsonOrdered: newData,
      ruleVerification: rule_verification,
    },
    {
      ruleVerification: rule_verification,
    },
  );
  return attachLangNormalizationMetadata(result, langMetadata, options);
}

export async function deleteUnitGroup(id: string, version: string) {
  const result = await invokeDatasetCommand('app_dataset_delete', {
    id,
    version,
    table: 'unitgroups',
  });
  return normalizeDeleteCommandResult(result);
}

export async function getUnitGroupTableAll(
  params: {
    current?: number;
    pageSize?: number;
  },
  sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
  tid: string | [],
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

  const teamId = await getUnitGroupTeamFilter(dataSource, tid);
  if (dataSource === 'te' && !teamId) {
    return Promise.resolve({
      data: [],
      success: true,
    });
  }

  const result = await supabase.rpc('get_latest_unitgroup_versions', {
    page_size: params.pageSize ?? 10,
    page_current: params.current ?? 1,
    data_source: dataSource,
    this_user_id: session.data.session?.user?.id ?? '',
    team_id_filter: teamId,
    state_code_filter: typeof stateCode === 'number' ? stateCode : null,
    sort_by: normalizeUnitGroupSortBy(sortBy),
    sort_direction: normalizeUnitGroupSortDirection(orderBy),
  });

  if (result?.error) {
    console.log('error', result?.error);
  }

  if (result?.data) {
    if (result?.data?.length === 0) {
      return Promise.resolve({
        data: [],
        success: true,
      });
    }

    const data = await mapUnitGroupListRows(result.data, lang);

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: normalizeUnitGroupTotalCount(result.data[0]),
    });
  }
  return Promise.resolve({
    data: [],
    success: false,
  });
}

export async function getUnitGroupTablePgroongaSearch(
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
  tid: string | [] = [],
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    const teamId = await getUnitGroupTeamFilter(dataSource, tid);
    if (dataSource === 'te' && !teamId) {
      return Promise.resolve({
        data: [],
        success: true,
      });
    }

    result = await supabase.rpc(
      'search_unitgroups_latest',
      typeof stateCode === 'number'
        ? {
            query_text: queryText,
            filter_condition: filterCondition,
            page_size: params.pageSize ?? 10,
            page_current: params.current ?? 1,
            data_source: dataSource,
            this_user_id: session.data.session.user?.id,
            team_id_filter: teamId,
            state_code_filter: stateCode,
          }
        : {
            query_text: queryText,
            filter_condition: filterCondition,
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
    const data = await mapUnitGroupListRows(result.data, lang);

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: normalizeUnitGroupTotalCount(result.data[0]),
    });
  }

  return result;
}

export async function getUnitGroupTableUuidMentionSearch(
  params: {
    current?: number;
    pageSize?: number;
  },
  lang: string,
  dataSource: string,
  uuid: string,
  stateCode?: string | number,
  tid?: string | [],
) {
  const result = await searchDatasetJsonUuidMentionPage({
    dataSource,
    pageCurrent: params.current,
    pageSize: params.pageSize,
    sourceEntityKinds: ['unitgroup'],
    stateCode,
    teamId: normalizeDatasetUuidMentionTeamId(tid),
    uuid,
  });
  if (!result.success) {
    return { ...result, data: [] };
  }

  return {
    ...result,
    data: await mapUnitGroupListRows(mapDatasetUuidMentionRowsToListRows(result.data), lang),
  };
}
export async function getUnitGroupDetail(id: string, version: string) {
  return getDataDetail(id, version, 'unitgroups');
}

// Same function as getReferenceUnit function, imported parameter and return value are different
export async function getReferenceUnits(params: { id: string; version: string }[]) {
  let result: any = [];
  const selectStr = `
        id,
        version,
        json->unitGroupDataSet->unitGroupInformation->dataSetInformation->"common:name",
        json->unitGroupDataSet->unitGroupInformation->quantitativeReference->referenceToReferenceUnit,
        json->unitGroupDataSet->units->unit
    `;
  const _ids = params.map((item: any) => {
    return item.id;
  });

  const ids = _ids.filter((id) => id && id.length === 36);
  if (ids.length > 0) {
    const { data } = await supabase
      .from('unitgroups')
      .select(selectStr)
      .in('id', ids)
      .order('version', { ascending: false });

    if (data && data.length > 0) {
      result = params.map((item: any) => {
        let unitRes: any = data.find((i: any) => i.id === item.id && i.version === item.version);
        if (!unitRes) {
          unitRes = data.find((i: any) => i.id === item.id);
        }
        const dataList = jsonToList(unitRes?.unit);
        const refData = dataList.find(
          (item) => item?.['@dataSetInternalID'] === unitRes?.referenceToReferenceUnit,
        );

        return {
          id: unitRes?.id,
          version: unitRes?.version,
          name: unitRes?.['common:name'],
          refUnitId: unitRes?.referenceToReferenceUnit ?? '-',
          refUnitName: refData?.name ?? '-',
          refUnitGeneralComment: refData?.generalComment,
          unit: dataList,
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

export async function getReferenceUnit(id: string, version: string) {
  let result: any = {};
  const selectStr = `
        id,
        version,
        json->unitGroupDataSet->unitGroupInformation->dataSetInformation->"common:name",
        json->unitGroupDataSet->unitGroupInformation->quantitativeReference->referenceToReferenceUnit,
        json->unitGroupDataSet->units->unit
    `;
  if (id && id.length === 36) {
    if (version && version.length === 9) {
      result = await supabase
        .from('unitgroups')
        .select(selectStr)
        .eq('id', id)
        .eq('version', version);
      if (result.data === null || result.data.length === 0) {
        result = await supabase
          .from('unitgroups')
          .select(selectStr)
          .eq('id', id)
          .order('version', { ascending: false })
          .range(0, 0);
      }
    } else {
      result = await supabase
        .from('unitgroups')
        .select(selectStr)
        .eq('id', id)
        .order('version', { ascending: false })
        .range(0, 0);
    }
    if (result?.data && result.data.length > 0) {
      const data = result.data[0];
      const dataList = jsonToList(data?.unit);
      const refData = dataList.find(
        (item) => item?.['@dataSetInternalID'] === data?.referenceToReferenceUnit,
      );
      return Promise.resolve({
        data: {
          id: data.id,
          version: data.version,
          name: data['common:name'],
          refUnitId: data?.referenceToReferenceUnit ?? '-',
          refUnitName: refData?.name ?? '-',
          refUnitGeneralComment: refData?.generalComment,
          unit: dataList,
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
