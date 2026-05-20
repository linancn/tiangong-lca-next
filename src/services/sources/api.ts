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
  attachLangNormalizationMetadata,
  buildLangNormalizationMetadata,
  getDataDetail,
  getTeamIdByUserId,
  invokeDatasetCommand,
  normalizeLangPayloadForSave,
  type NormalizeLangPayloadForSaveOptions,
} from '../general/api';
import { genSourceJsonOrdered } from './util';

type SourceListRpcRow = {
  id?: string;
  json?: any;
  version?: string;
  modified_at?: string;
  team_id?: string;
  version_count?: number | string | null;
  total_count?: number | string | null;
};

function normalizeSourceVersionCount(row: SourceListRpcRow): number | undefined {
  const versionCount = Number(row.version_count ?? 0);
  if (!Number.isFinite(versionCount) || versionCount <= 0) {
    return undefined;
  }
  return versionCount;
}

function normalizeSourceTotalCount(row?: SourceListRpcRow): number {
  return Number(row?.total_count ?? 0) || 0;
}

function normalizeSourceSortBy(sortBy: string): string {
  if (sortBy === 'modifiedAt') {
    return 'modified_at';
  }
  if (sortBy === 'createdAt') {
    return 'created_at';
  }
  return sortBy;
}

function normalizeSourceSortDirection(orderBy: SortOrder): 'asc' | 'desc' {
  return orderBy === 'ascend' ? 'asc' : 'desc';
}

function getOptionalTeamId(tid: string | []): string | null {
  if (typeof tid === 'string' && tid.length > 0) {
    return tid;
  }
  return null;
}

async function getSourceTeamFilter(dataSource: string, tid: string | []) {
  if (dataSource === 'te') {
    return await getTeamIdByUserId();
  }
  if (dataSource === 'tg' || dataSource === 'co') {
    return getOptionalTeamId(tid);
  }
  return null;
}

async function mapSourceListRows(rows: SourceListRpcRow[], lang: string): Promise<any[]> {
  if (lang === 'zh') {
    const classificationData = await getCachedClassificationData('Source', lang, ['all']);
    return rows.map((i) => {
      try {
        const dataInfo = i.json?.sourceDataSet?.sourceInformation?.dataSetInformation;
        const classifications = jsonToList(
          dataInfo?.classificationInformation?.['common:classification']?.['common:class'],
        );
        const classificationZH = genClassificationZH(classifications, classificationData);
        return {
          key: i.id + ':' + i.version,
          id: i.id,
          shortName: getLangText(dataInfo?.['common:shortName'], lang),
          classification: classificationToString(classificationZH),
          sourceCitation: dataInfo?.sourceCitation ?? '-',
          publicationType: dataInfo?.publicationType ?? '-',
          version: i.version,
          versionCount: normalizeSourceVersionCount(i),
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
      const dataInfo = i.json?.sourceDataSet?.sourceInformation?.dataSetInformation;
      const classifications = jsonToList(
        dataInfo?.classificationInformation?.['common:classification']?.['common:class'],
      );
      return {
        key: i.id + ':' + i.version,
        id: i.id,
        shortName: getLangText(dataInfo?.['common:shortName'], lang),
        classification: classificationToString(classifications),
        sourceCitation: dataInfo?.sourceCitation ?? '-',
        publicationType: dataInfo?.publicationType ?? '-',
        version: i.version,
        versionCount: normalizeSourceVersionCount(i),
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

export async function createSource(
  id: string,
  data: any,
  options?: NormalizeLangPayloadForSaveOptions,
) {
  const rawData = genSourceJsonOrdered(id, data);
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
    'source data set',
    newData,
    userTeamId,
  );
  const result = await invokeDatasetCommand(
    'app_dataset_create',
    {
      id,
      table: 'sources',
      jsonOrdered: newData,
      ruleVerification: rule_verification,
    },
    {
      ruleVerification: rule_verification,
    },
  );
  return attachLangNormalizationMetadata(result, langMetadata, options);
}

export async function updateSource(
  id: string,
  version: string,
  data: any,
  options?: NormalizeLangPayloadForSaveOptions,
) {
  const rawData = genSourceJsonOrdered(id, data);
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
    'source data set',
    newData,
    userTeamId,
  );
  const result = await invokeDatasetCommand(
    'app_dataset_save_draft',
    {
      id,
      version,
      table: 'sources',
      jsonOrdered: newData,
      ruleVerification: rule_verification,
    },
    {
      ruleVerification: rule_verification,
    },
  );
  return attachLangNormalizationMetadata(result, langMetadata, options);
}

export async function deleteSource(id: string, version: string) {
  const result = await invokeDatasetCommand('app_dataset_delete', {
    id,
    version,
    table: 'sources',
  });
  return normalizeDeleteCommandResult(result);
}

export async function getSourceTableAll(
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

  const teamId = await getSourceTeamFilter(dataSource, tid);
  if (dataSource === 'te' && !teamId) {
    return Promise.resolve({
      data: [],
      success: true,
    });
  }

  const result = await supabase.rpc('get_latest_source_versions', {
    page_size: params.pageSize ?? 10,
    page_current: params.current ?? 1,
    data_source: dataSource,
    this_user_id: session.data.session?.user?.id ?? '',
    team_id_filter: teamId,
    state_code_filter: typeof stateCode === 'number' ? stateCode : null,
    sort_by: normalizeSourceSortBy(sortBy),
    sort_direction: normalizeSourceSortDirection(orderBy),
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

    const data = await mapSourceListRows(result.data, lang);

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: normalizeSourceTotalCount(result.data[0]),
    });
  }
  return Promise.resolve({
    data: [],
    success: false,
  });
}

export async function getSourceTablePgroongaSearch(
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
    const teamId = await getSourceTeamFilter(dataSource, tid);
    if (dataSource === 'te' && !teamId) {
      return Promise.resolve({
        data: [],
        success: true,
      });
    }

    result = await supabase.rpc(
      'pgroonga_search_sources_latest',
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

    const data = await mapSourceListRows(result.data, lang);

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: normalizeSourceTotalCount(result.data[0]),
    });
  }

  return result;
}

export async function getSourceDetail(id: string, version: string) {
  return getDataDetail(id, version, 'sources');
}

export async function getSourcesByIdsAndVersions(
  idVersionPairs: { id: string; version: string }[],
) {
  if (idVersionPairs.length === 0) {
    return { data: [], error: null, foundCount: 0 };
  }

  const promises = idVersionPairs.map((pair) =>
    supabase
      .from('sources')
      .select('id, version,state_code')
      .eq('id', pair.id)
      .eq('version', pair.version),
  );

  const results = await Promise.all(promises);

  const allData: any[] = [];

  results.forEach((result) => {
    if (result.data && result.data.length > 0) {
      allData.push(...result.data);
    }
  });

  const hasError = results.some((result) => result.error);

  return {
    data: allData,
    error: hasError ? results.find((result) => result.error)?.error : null,
  };
}
