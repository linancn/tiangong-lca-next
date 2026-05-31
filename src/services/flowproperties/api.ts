import { validateDatasetRuleVerification } from '@/pages/Utils/review';
import {
  classificationToString,
  genClassificationZH,
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
  normalizeLangPayloadForSave,
  type NormalizeLangPayloadForSaveOptions,
} from '../general/api';
import { genFlowpropertyJsonOrdered } from './util';

type FlowpropertyListRpcRow = {
  id?: string;
  json?: any;
  version?: string;
  modified_at?: string;
  team_id?: string;
  total_count?: number | string | null;
};

function normalizeFlowpropertyTotalCount(row?: FlowpropertyListRpcRow): number {
  return Number(row?.total_count ?? 0) || 0;
}

function normalizeFlowpropertySortBy(sortBy: string): string {
  if (sortBy === 'modifiedAt') {
    return 'modified_at';
  }
  if (sortBy === 'createdAt') {
    return 'created_at';
  }
  return sortBy;
}

function normalizeFlowpropertySortDirection(orderBy: SortOrder): 'asc' | 'desc' {
  return orderBy === 'ascend' ? 'asc' : 'desc';
}

function getOptionalTeamId(tid: string | []): string | null {
  if (typeof tid === 'string' && tid.length > 0) {
    return tid;
  }
  return null;
}

async function getFlowpropertyTeamFilter(dataSource: string, tid: string | []) {
  if (dataSource === 'te') {
    return await getTeamIdByUserId();
  }
  if (dataSource === 'tg' || dataSource === 'co') {
    return getOptionalTeamId(tid);
  }
  return null;
}

async function mapFlowpropertyListRows(
  rows: FlowpropertyListRpcRow[],
  lang: string,
): Promise<any[]> {
  if (lang === 'zh') {
    const classificationData = await getCachedClassificationData('FlowProperty', lang, ['all']);
    return rows.map((i) => {
      try {
        const dataInfo = i.json?.flowPropertyDataSet?.flowPropertiesInformation;
        const classifications = jsonToList(
          dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
            'common:class'
          ],
        );
        const classificationZH = genClassificationZH(classifications, classificationData);
        const referenceUnitGroup = dataInfo?.quantitativeReference?.referenceToReferenceUnitGroup;

        return {
          key: i.id + ':' + i.version,
          id: i.id,
          name: getLangText(dataInfo?.dataSetInformation?.['common:name'] ?? {}, lang),
          classification: classificationToString(classificationZH),
          generalComment: getLangText(
            dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
            lang,
          ),
          refUnitGroupId: referenceUnitGroup?.['@refObjectId'] ?? '-',
          refUnitGroup: getLangText(referenceUnitGroup?.['common:shortDescription'] ?? {}, lang),
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

  return rows.map((i) => {
    try {
      const dataInfo = i.json?.flowPropertyDataSet?.flowPropertiesInformation;
      const classifications = jsonToList(
        dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
          'common:class'
        ],
      );
      const referenceUnitGroup = dataInfo?.quantitativeReference?.referenceToReferenceUnitGroup;
      return {
        key: i.id + ':' + i.version,
        id: i.id,
        name: getLangText(dataInfo?.dataSetInformation?.['common:name'] ?? {}, lang),
        classification: classificationToString(classifications),
        generalComment: getLangText(
          dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
          lang,
        ),
        refUnitGroupId: referenceUnitGroup?.['@refObjectId'] ?? '-',
        refUnitGroup: getLangText(referenceUnitGroup?.['common:shortDescription'] ?? {}, lang),
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

export async function createFlowproperties(
  id: string,
  data: any,
  options?: NormalizeLangPayloadForSaveOptions,
) {
  const rawData = genFlowpropertyJsonOrdered(id, data);
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
    'flow property data set',
    newData,
    userTeamId,
  );
  const result = await invokeDatasetCommand(
    'app_dataset_create',
    {
      id,
      table: 'flowproperties',
      jsonOrdered: newData,
      ruleVerification: rule_verification,
    },
    {
      ruleVerification: rule_verification,
    },
  );
  return attachLangNormalizationMetadata(result, langMetadata, options);
}

export async function updateFlowproperties(
  id: string,
  version: string,
  data: any,
  options?: NormalizeLangPayloadForSaveOptions,
) {
  const rawData = genFlowpropertyJsonOrdered(id, data);
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
    'flow property data set',
    newData,
    userTeamId,
  );

  const result = await invokeDatasetCommand(
    'app_dataset_save_draft',
    {
      id,
      version,
      table: 'flowproperties',
      jsonOrdered: newData,
      ruleVerification: rule_verification,
    },
    {
      ruleVerification: rule_verification,
    },
  );
  return attachLangNormalizationMetadata(result, langMetadata, options);
}

export async function deleteFlowproperties(id: string, version: string) {
  const result = await invokeDatasetCommand('app_dataset_delete', {
    id,
    version,
    table: 'flowproperties',
  });
  return normalizeDeleteCommandResult(result);
}

export async function getFlowpropertyTableAll(
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

  const teamId = await getFlowpropertyTeamFilter(dataSource, tid);
  if (dataSource === 'te' && !teamId) {
    return Promise.resolve({
      data: [],
      success: true,
    });
  }

  const result = await supabase.rpc('get_latest_flowproperty_versions', {
    page_size: params.pageSize ?? 10,
    page_current: params.current ?? 1,
    data_source: dataSource,
    this_user_id: session.data.session?.user?.id ?? '',
    team_id_filter: teamId,
    state_code_filter: typeof stateCode === 'number' ? stateCode : null,
    sort_by: normalizeFlowpropertySortBy(sortBy),
    sort_direction: normalizeFlowpropertySortDirection(orderBy),
  });

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

    const data = await mapFlowpropertyListRows(result.data, lang);

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: normalizeFlowpropertyTotalCount(result.data[0]),
    });
  }
  return Promise.resolve({
    data: [],
    success: false,
  });
}

export async function getFlowpropertyTablePgroongaSearch(
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
    const teamId = await getFlowpropertyTeamFilter(dataSource, tid);
    if (dataSource === 'te' && !teamId) {
      return Promise.resolve({
        data: [],
        success: true,
      });
    }

    result = await supabase.rpc(
      'search_flowproperties_latest',
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
    const data = await mapFlowpropertyListRows(result.data, lang);

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: normalizeFlowpropertyTotalCount(result.data[0]),
    });
  }

  return result;
}

export async function getFlowpropertyTableUuidMentionSearch(
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
    sourceEntityKinds: ['flowproperty'],
    stateCode,
    teamId: normalizeDatasetUuidMentionTeamId(tid),
    uuid,
  });
  if (!result.success) {
    return { ...result, data: [] };
  }

  return {
    ...result,
    data: await mapFlowpropertyListRows(mapDatasetUuidMentionRowsToListRows(result.data), lang),
  };
}

export async function getFlowpropertyDetail(id: string, version: string) {
  if (!id || id.length !== 36) {
    return Promise.resolve({
      data: null,
      success: false,
    });
  }
  return getDataDetail(id, version, 'flowproperties');
}

// Same function as getReferenceUnitGroup function, imported parameter and return value are different

export async function getReferenceUnitGroups(params: { id: string; version: string }[]) {
  const _ids = params.map((item: any) => {
    return item.id;
  });
  const ids = _ids.filter((id) => id && id.length === 36);

  let result: any = [];
  const selectStr = `
        id,
        version,
        json->flowPropertyDataSet->flowPropertiesInformation->dataSetInformation->"common:name",
        json->flowPropertyDataSet->flowPropertiesInformation->quantitativeReference->referenceToReferenceUnitGroup
    `;
  if (ids.length) {
    const { data } = await supabase
      .from('flowproperties')
      .select(selectStr)
      .in('id', ids)
      .order('version', { ascending: false });

    if (data && data.length > 0) {
      result = params.map((item: any) => {
        let unitGroup: any = data.find((i: any) => i.id === item.id && i.version === item.version);
        if (!unitGroup) {
          unitGroup = data.find((i: any) => i.id === item.id);
        }

        return {
          id: unitGroup?.id,
          version: unitGroup?.version,
          name: unitGroup?.['common:name'] ?? '-',
          refUnitGroupId: unitGroup?.referenceToReferenceUnitGroup?.['@refObjectId'] ?? '-',
          refUnitGroupVersion: unitGroup?.referenceToReferenceUnitGroup?.['@version'] ?? '-',
          refUnitGroupShortDescription:
            unitGroup?.referenceToReferenceUnitGroup?.['common:shortDescription'] ?? {},
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

export async function getReferenceUnitGroup(id: string, version: string) {
  let result: any = {};
  const selectStr = `
        id,
        version,
        json->flowPropertyDataSet->flowPropertiesInformation->dataSetInformation->"common:name",
        json->flowPropertyDataSet->flowPropertiesInformation->quantitativeReference->referenceToReferenceUnitGroup
    `;
  if (id && id.length === 36) {
    if (version && version.length === 9) {
      result = await supabase
        .from('flowproperties')
        .select(selectStr)
        .eq('id', id)
        .eq('version', version);
      if (result.data === null || result.data.length === 0) {
        result = await supabase
          .from('flowproperties')
          .select(selectStr)
          .eq('id', id)
          .order('version', { ascending: false })
          .range(0, 0);
      }
    } else {
      result = await supabase
        .from('flowproperties')
        .select(selectStr)
        .eq('id', id)
        .order('version', { ascending: false })
        .range(0, 0);
    }
    if (result?.data && result.data.length > 0) {
      const data = result.data[0];

      return Promise.resolve({
        data: {
          id: data.id,
          version: data.version,
          name: data?.['common:name'] ?? '-',
          refUnitGroupId: data?.referenceToReferenceUnitGroup?.['@refObjectId'] ?? '-',
          refUnitGroupShortDescription:
            data?.referenceToReferenceUnitGroup?.['common:shortDescription'] ?? {},
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
