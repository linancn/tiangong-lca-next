import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import {
  classificationToString,
  genClassificationZH,
  getLangText,
  jsonToList,
} from '../general/util';
import { getILCDClassification } from '../ilcd/api';
import { genSourceJsonOrdered } from './util';

export async function createSource(data: any) {
  // const newID = v4();/
  const oldData = {
    sourceDataSet: {
      '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
      '@xmlns': 'http://lca.jrc.it/ILCD/Source',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@version': '1.1',
      '@xsi:schemaLocation': 'http://lca.jrc.it/ILCD/Source ../../schemas/ILCD_SourceDataSet.xsd',
    },
  };
  const newData = genSourceJsonOrdered(data.id, data, oldData);
  const result = await supabase
    .from('sources')
    .insert([{ id: data.id, json_ordered: newData }])
    .select();
  return result;
}

export async function updateSource(data: any) {
  const result = await supabase.from('sources').select('id, json').eq('id', data.id);
  if (result.data && result.data.length === 1) {
    const oldData = result.data[0].json;
    const newData = genSourceJsonOrdered(data.id, data, oldData);
    const updateResult = await supabase
      .from('sources')
      .update({ json_ordered: newData })
      .eq('id', data.id)
      .select();
    return updateResult;
  }
  return null;
}

export async function deleteSource(id: string) {
  const result = await supabase.from('sources').delete().eq('id', id);
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
) {
  const sortBy = Object.keys(sort)[0] ?? 'created_at';
  const orderBy = sort[sortBy] ?? 'descend';

  const selectStr = `
    id,
    json->sourceDataSet->sourceInformation->dataSetInformation->"common:shortName",
    json->sourceDataSet->sourceInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
    json->sourceDataSet->sourceInformation->dataSetInformation->sourceCitation,
    json->sourceDataSet->sourceInformation->dataSetInformation->publicationType,
    created_at
  `;

  let result: any = {};
  if (dataSource === 'tg') {
    result = await supabase
      .from('sources')
      .select(selectStr, { count: 'exact' })
      .eq('state_code', 100)
      .order(sortBy, { ascending: orderBy === 'ascend' })
      .range(
        ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
        (params.current ?? 1) * (params.pageSize ?? 10) - 1,
      );
  } else if (dataSource === 'my') {
    const session = await supabase.auth.getSession();
    if (session.data.session) {
      result = await supabase
        .from('sources')
        .select(selectStr, { count: 'exact' })
        .eq('user_id', session.data.session.user?.id)
        .order(sortBy, { ascending: orderBy === 'ascend' })
        .range(
          ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
          (params.current ?? 1) * (params.pageSize ?? 10) - 1,
        );
    }
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

    let data: any[] = [];
    if (lang === 'zh') {
      await getILCDClassification('Source', lang, ['all']).then((res) => {
        data = result.data.map((i: any) => {
          try {
            const classifications = jsonToList(i['common:class']);
            const classificationZH = genClassificationZH(classifications, res?.data?.category);
            return {
              key: i.id,
              id: i.id,
              shortName: getLangText(i['common:shortName'], lang),
              classification: classificationToString(classificationZH),
              sourceCitation: i.sourceCitation ?? '-',
              publicationType: i.publicationType ?? '-',
              created_at: new Date(i.created_at),
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
          return {
            key: i.id,
            id: i.id,
            shortName: getLangText(i?.['common:shortName'], lang),
            classification: classificationToString(i?.['common:class']),
            sourceCitation: i?.sourceCitation ?? '-',
            publicationType: i?.publicationType ?? '-',
            created_at: new Date(i?.created_at),
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
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.rpc('pgroonga_search_sources', {
      query_text: queryText,
      filter_condition: filterCondition,
      page_size: params.pageSize ?? 10,
      page_current: params.current ?? 1,
      data_source: dataSource,
      this_user_id: session.data.session.user?.id,
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
            const classificationZH = genClassificationZH(classifications, res?.data?.category);

            return {
              key: i.id,
              id: i.id,
              shortName: getLangText(dataInfo?.['common:shortName'], lang),
              classification: classificationToString(classificationZH),
              sourceCitation: dataInfo?.sourceCitation ?? '-',
              publicationType: dataInfo?.publicationType ?? '-',
              created_at: new Date(i?.created_at),
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
        const dataInfo = i.json?.sourceDataSet?.sourceInformation?.dataSetInformation;
        try {
          return {
            key: i.id,
            id: i.id,
            shortName: getLangText(dataInfo?.['common:shortName'], lang),
            classification: classificationToString(
              dataInfo?.classificationInformation?.['common:classification']?.['common:class'],
            ),
            sourceCitation: dataInfo?.sourceCitation ?? '-',
            publicationType: dataInfo?.publicationType ?? '-',
            created_at: new Date(dataInfo?.created_at),
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

export async function getSourceDetail(id: string) {
  const result = await supabase.from('sources').select('json, created_at').eq('id', id);
  if (result.data && result.data.length > 0) {
    const data = result.data[0];
    return Promise.resolve({
      data: {
        json: data.json,
        createdAt: data?.created_at,
      },
      success: true,
    });
  }
  return Promise.resolve({
    data: null,
    success: true,
  });
}
