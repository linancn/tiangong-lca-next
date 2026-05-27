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
import { genContactJsonOrdered } from './util';

type ContactListRpcRow = {
  id?: string;
  json?: any;
  version?: string;
  modified_at?: string;
  team_id?: string;
  total_count?: number | string | null;
};

function normalizeContactTotalCount(row?: ContactListRpcRow): number {
  return Number(row?.total_count ?? 0) || 0;
}

function normalizeContactSortBy(sortBy: string): string {
  if (sortBy === 'modifiedAt') {
    return 'modified_at';
  }
  if (sortBy === 'createdAt') {
    return 'created_at';
  }
  return sortBy;
}

function normalizeContactSortDirection(orderBy: SortOrder): 'asc' | 'desc' {
  return orderBy === 'ascend' ? 'asc' : 'desc';
}

function getOptionalTeamId(tid: string | []): string | null {
  if (typeof tid === 'string' && tid.length > 0) {
    return tid;
  }
  return null;
}

async function getContactTeamFilter(dataSource: string, tid: string | []) {
  if (dataSource === 'te') {
    return await getTeamIdByUserId();
  }
  if (dataSource === 'tg' || dataSource === 'co') {
    return getOptionalTeamId(tid);
  }
  return null;
}

async function mapContactListRows(rows: ContactListRpcRow[], lang: string): Promise<any[]> {
  if (lang === 'zh') {
    const classificationData = await getCachedClassificationData('Contact', lang, ['all']);
    return rows.map((i) => {
      try {
        const dataInfo = i.json?.contactDataSet?.contactInformation?.dataSetInformation;
        const classifications = jsonToList(
          dataInfo?.classificationInformation?.['common:classification']?.['common:class'],
        );
        const classificationZH = genClassificationZH(classifications, classificationData);

        return {
          key: i.id + ':' + i.version,
          id: i.id,
          shortName: getLangText(dataInfo?.['common:shortName'], lang),
          name: getLangText(dataInfo?.['common:name'], lang),
          classification: classificationToString(classificationZH),
          email: dataInfo?.email ?? '-',
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
      const dataInfo = i.json?.contactDataSet?.contactInformation?.dataSetInformation;
      const classifications = jsonToList(
        dataInfo?.classificationInformation?.['common:classification']?.['common:class'],
      );

      return {
        key: i.id + ':' + i.version,
        id: i.id,
        shortName: getLangText(dataInfo?.['common:shortName'], lang),
        name: getLangText(dataInfo?.['common:name'], lang),
        classification: classificationToString(classifications),
        email: dataInfo?.email ?? '-',
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

export async function createContact(
  id: string,
  data: any,
  options?: NormalizeLangPayloadForSaveOptions,
) {
  const rawData = genContactJsonOrdered(id, data);
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
    'contact data set',
    newData,
    userTeamId,
  );
  const result = await invokeDatasetCommand(
    'app_dataset_create',
    {
      id,
      table: 'contacts',
      jsonOrdered: newData,
      ruleVerification: rule_verification,
    },
    {
      ruleVerification: rule_verification,
    },
  );
  return attachLangNormalizationMetadata(result, langMetadata, options);
}

export async function updateContact(
  id: string,
  version: string,
  data: any,
  options?: NormalizeLangPayloadForSaveOptions,
) {
  const rawData = genContactJsonOrdered(id, data);
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
    'contact data set',
    newData,
    userTeamId,
  );
  const result = await invokeDatasetCommand(
    'app_dataset_save_draft',
    {
      id,
      version,
      table: 'contacts',
      jsonOrdered: newData,
      ruleVerification: rule_verification,
    },
    {
      ruleVerification: rule_verification,
    },
  );
  return attachLangNormalizationMetadata(result, langMetadata, options);
}

export async function deleteContact(id: string, version: string) {
  const result = await invokeDatasetCommand('app_dataset_delete', {
    id,
    version,
    table: 'contacts',
  });
  return normalizeDeleteCommandResult(result);
}

export async function getContactTableAll(
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

  const teamId = await getContactTeamFilter(dataSource, tid);
  if (dataSource === 'te' && !teamId) {
    return Promise.resolve({
      data: [],
      success: true,
    });
  }

  const result = await supabase.rpc('get_latest_contact_versions', {
    page_size: params.pageSize ?? 10,
    page_current: params.current ?? 1,
    data_source: dataSource,
    this_user_id: session.data.session?.user?.id ?? '',
    team_id_filter: teamId,
    state_code_filter: typeof stateCode === 'number' ? stateCode : null,
    sort_by: normalizeContactSortBy(sortBy),
    sort_direction: normalizeContactSortDirection(orderBy),
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

    const data = await mapContactListRows(result.data, lang);

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: normalizeContactTotalCount(result.data[0]),
    });
  }
  return Promise.resolve({
    data: [],
    success: false,
  });
}

export async function getContactTablePgroongaSearch(
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
    const teamId = await getContactTeamFilter(dataSource, tid);
    if (dataSource === 'te' && !teamId) {
      return Promise.resolve({
        data: [],
        success: true,
      });
    }

    result = await supabase.rpc('search_contacts_latest', {
      query_text: queryText,
      filter_condition: filterCondition,
      page_size: params.pageSize ?? 10,
      page_current: params.current ?? 1,
      data_source: dataSource,
      this_user_id: session.data.session.user?.id,
      team_id_filter: teamId,
      state_code_filter: typeof stateCode === 'number' ? stateCode : null,
    });
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

    const data = await mapContactListRows(result.data, lang);

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: normalizeContactTotalCount(result.data[0]),
    });
  }
  return result;
}

export async function getContactDetail(id: string, version: string) {
  return getDataDetail(id, version, 'contacts');
}
