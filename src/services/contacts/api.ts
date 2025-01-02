import {
  classificationToString,
  genClassificationZH,
  getLangText,
  jsonToList,
} from '../general/util';

import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import { getDataDetail } from '../general/api';
import { getILCDClassification } from '../ilcd/api';
import { genContactJsonOrdered } from './util';

export async function createContact(id: string, data: any) {
  const newData = genContactJsonOrdered(id, data);
  const result = await supabase
    .from('contacts')
    .insert([{ id: id, json_ordered: newData }])
    .select();
  return result;
}

export async function updateContact(id: string, version: string, data: any) {
  const newData = genContactJsonOrdered(id, data);
  const updateResult = await supabase
    .from('contacts')
    .update({ json_ordered: newData })
    .eq('id', id)
    .eq('version', version)
    .select();
  return updateResult;
}

export async function deleteContact(id: string, version: string) {
  const result = await supabase.from('contacts').delete().eq('id', id).eq('version', version);
  return result;
}

export async function getContactTableAll(
  params: {
    current?: number;
    pageSize?: number;
  },
  sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
  tids: string[],
) {
  const sortBy = Object.keys(sort)[0] ?? 'modified_at';
  const orderBy = sort[sortBy] ?? 'descend';

  const selectStr = `
    id,
    json->contactDataSet->contactInformation->dataSetInformation->"common:shortName",
    json->contactDataSet->contactInformation->dataSetInformation->"common:name",
    json->contactDataSet->contactInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
    json->contactDataSet->contactInformation->dataSetInformation->>email,
    version,
    modified_at
  `;

  const tableName = 'contacts';

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
  } else if (dataSource === 'co') {
    query = query.eq('state_code', 200);
  } else if (dataSource === 'my') {
    const session = await supabase.auth.getSession();
    query = query.eq('user_id', session?.data?.session?.user?.id);
  }

  if (tids.length > 0) {
    query = query.in('user_id', tids);
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

    // const categories: string[] = Array.from(new Set(result.data.map((i: any) => {
    //   const l0 = jsonToList(i?.['common:class'])?.find((j: any) => j?.['@level'] === '0');
    //   return l0?.['#text'] ?? '';
    // })));

    await getILCDClassification('Contact', lang, ['all']).then((res) => {
      data = result.data.map((i: any) => {
        try {
          const classifications = jsonToList(i?.['common:class']);
          const classificationZH = genClassificationZH(classifications, res?.data);

          return {
            key: i.id + ':' + i.version,
            id: i.id,
            shortName: getLangText(i?.['common:shortName'], lang),
            name: getLangText(i?.['common:name'], lang),
            classification: classificationToString(classificationZH),
            email: i?.email ?? '-',
            version: i.version,
            modifiedAt: new Date(i?.modified_at),
          };
        } catch (e) {
          console.error(e);
          return {
            id: i.id,
          };
        }
      });
    });

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
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.rpc('pgroonga_search_contacts', {
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
    await getILCDClassification('Contact', lang, ['all']).then((res) => {
      data = result.data.map((i: any) => {
        try {
          const dataInfo = i.json?.contactDataSet?.contactInformation?.dataSetInformation;
          const classifications = jsonToList(
            dataInfo?.classificationInformation?.['common:classification']?.['common:class'],
          );
          const classificationZH = genClassificationZH(classifications, res?.data);
          return {
            key: i.id + ':' + i.version,
            id: i.id,
            shortName: getLangText(dataInfo?.['common:shortName'], lang),
            name: getLangText(dataInfo?.['common:name'], lang),
            classification: classificationToString(classificationZH),
            email: dataInfo?.email ?? '-',
            version: i.version,
            modifiedAt: new Date(i?.modified_at),
          };
        } catch (e) {
          console.error(e);
          return {
            id: i.id,
          };
        }
      });
    });

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: totalCount ?? 0,
    });
  }
  return result;
}

export async function getContactDetail(id: string, version: string) {
  return getDataDetail(id, version, 'contacts');
}
