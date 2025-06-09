import schema from '@/pages/Sources/sources_schema.json';
import { FunctionRegion } from '@supabase/supabase-js';
import {
  classificationToString,
  genClassificationZH,
  getLangText,
  getRuleVerification,
  jsonToList,
} from '../general/util';

import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import { getDataDetail, getTeamIdByUserId } from '../general/api';
import { getILCDClassification } from '../ilcd/api';
import { genSourceJsonOrdered } from './util';
export async function createSource(id: string, data: any) {
  const newData = genSourceJsonOrdered(id, data);
  const rule_verification = getRuleVerification(schema, newData);
  // const teamId = await getTeamIdByUserId();
  const result = await supabase
    .from('sources')
    .insert([{ id: id, json_ordered: newData, rule_verification }])
    .select();
  return result;
}

export async function updateSource(id: string, version: string, data: any) {
  const newData = genSourceJsonOrdered(id, data);
  const rule_verification = getRuleVerification(schema, newData);
  const updateResult = await supabase
    .from('sources')
    .update({ json_ordered: newData, rule_verification })
    .eq('id', id)
    .eq('version', version)
    .select();
  return updateResult;
}

export async function deleteSource(id: string, version: string) {
  const result = await supabase.from('sources').delete().eq('id', id).eq('version', version);
  return result;
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

  const selectStr = `
    id,
    json->sourceDataSet->sourceInformation->dataSetInformation->"common:shortName",
    json->sourceDataSet->sourceInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
    json->sourceDataSet->sourceInformation->dataSetInformation->>sourceCitation,
    json->sourceDataSet->sourceInformation->dataSetInformation->>publicationType,
    version,
    modified_at,
    team_id
  `;

  const tableName = 'sources';

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

    let data: any[] = [];
    if (lang === 'zh') {
      await getILCDClassification('Source', lang, ['all']).then((res) => {
        data = result?.data?.map((i: any) => {
          try {
            const classifications = jsonToList(i['common:class']);
            const classificationZH = genClassificationZH(classifications, res?.data);
            return {
              key: i.id + ':' + i.version,
              id: i.id,
              shortName: getLangText(i['common:shortName'], lang),
              classification: classificationToString(classificationZH),
              sourceCitation: i.sourceCitation ?? '-',
              publicationType: i.publicationType ?? '-',
              version: i.version,
              modifiedAt: new Date(i.modified_at),
              teamId: i.team_id,
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
      data = result?.data?.map((i: any) => {
        try {
          const classifications = jsonToList(i['common:class']);
          return {
            key: i.id + ':' + i.version,
            id: i.id,
            shortName: getLangText(i?.['common:shortName'], lang),
            classification: classificationToString(classifications),
            sourceCitation: i?.sourceCitation ?? '-',
            publicationType: i?.publicationType ?? '-',
            version: i.version,
            modifiedAt: new Date(i?.modified_at),
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
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.rpc(
      'pgroonga_search_sources',
      typeof stateCode === 'number'
        ? {
            query_text: queryText,
            filter_condition: filterCondition,
            page_size: params.pageSize ?? 10,
            page_current: params.current ?? 1,
            data_source: dataSource,
            this_user_id: session.data.session.user?.id,
            state_code: stateCode,
          }
        : {
            query_text: queryText,
            filter_condition: filterCondition,
            page_size: params.pageSize ?? 10,
            page_current: params.current ?? 1,
            data_source: dataSource,
            this_user_id: session.data.session.user?.id,
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
      await getILCDClassification('Source', lang, ['all']).then((res) => {
        data = result.data.map((i: any) => {
          try {
            const dataInfo = i.json?.sourceDataSet?.sourceInformation?.dataSetInformation;
            const classifications = jsonToList(
              dataInfo?.classificationInformation?.['common:classification']?.['common:class'],
            );
            const classificationZH = genClassificationZH(classifications, res?.data);

            return {
              key: i.id + ':' + i.version,
              id: i.id,
              shortName: getLangText(dataInfo?.['common:shortName'], lang),
              classification: classificationToString(classificationZH),
              sourceCitation: dataInfo?.sourceCitation ?? '-',
              publicationType: dataInfo?.publicationType ?? '-',
              version: i.version,
              modifiedAt: new Date(i?.modified_at),
              teamId: i.team_id,
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
            modifiedAt: new Date(dataInfo?.modified_at),
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

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: totalCount ?? 0,
    });
  }

  return result;
}

export async function source_hybrid_search(
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
    result = await supabase.functions.invoke('source_hybrid_search', {
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
      await getILCDClassification('Source', lang, ['all']).then((res) => {
        data = resultData.map((i: any) => {
          try {
            const dataInfo = i.json?.sourceDataSet?.sourceInformation?.dataSetInformation;
            const classifications = jsonToList(
              dataInfo?.classificationInformation?.['common:classification']?.['common:class'],
            );
            const classificationZH = genClassificationZH(classifications, res?.data);

            return {
              key: i.id + ':' + i.version,
              id: i.id,
              shortName: getLangText(dataInfo?.['common:shortName'], lang),
              classification: classificationToString(classificationZH),
              sourceCitation: dataInfo?.sourceCitation ?? '-',
              publicationType: dataInfo?.publicationType ?? '-',
              version: i.version,
              modifiedAt: new Date(i?.modified_at),
              teamId: i.team_id,
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
            modifiedAt: new Date(dataInfo?.modified_at),
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

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: totalCount ?? 0,
    });
  }

  return result;
}

export async function getSourceDetail(id: string, version: string) {
  return getDataDetail(id, version, 'sources');
}
