import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import { v4 } from 'uuid';
import {
  classificationToJson,
  classificationToString,
  getLangList,
  getLangText,
} from '../general/util';
import { genSourceJsonOrdered } from './util';

export async function createSource(data: any) {
  const newID = v4();
  const oldData = {
    sourceDataSet: {
      '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
      '@xmlns': 'http://lca.jrc.it/ILCD/Source',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@version': '1.1',
      '@xsi:schemaLocation': 'http://lca.jrc.it/ILCD/Source ../../schemas/ILCD_SourceDataSet.xsd',
    },
  };
  const newData = genSourceJsonOrdered(newID, data, oldData);
  const result = await supabase
    .from('sources')
    .insert([{ id: newID, json_ordered: newData }])
    .select();
console.log(result);
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

export async function getSourceTable(
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

    return Promise.resolve({
      data: result.data.map((i: any) => {
        try {
          return {
            id: i.id,
            lang: lang,
            shortName: getLangText(i['common:shortName'], lang),
            classification: classificationToString(i['common:class']),
            sourceCitation: i.sourceCitation ?? '-',
            publicationType: i.publicationType ?? '-',
            createdAt: new Date(i.created_at),
          };
        } catch (e) {
          console.error(e);
          return {
            id: i.id,
          };
        }
      }),
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

export async function getSourceDetail(id: string) {
  const result = await supabase.from('sources').select('json, created_at').eq('id', id);
  if (result.data && result.data.length > 0) {
    const data = result.data[0];
    return Promise.resolve({
      data: {
        id: id,
        'common:shortName': getLangList(
          data?.json?.sourceDataSet?.sourceInformation?.dataSetInformation?.['common:shortName'],
        ),
        'common:class': classificationToJson(
          data?.json?.sourceDataSet?.sourceInformation?.dataSetInformation
            ?.classificationInformation?.['common:classification']?.['common:class'],
        ),
        sourceCitation: data?.json?.sourceDataSet?.sourceInformation?.dataSetInformation?.sourceCitation,
        publicationType: data?.json?.sourceDataSet?.sourceInformation?.dataSetInformation?.publicationType,
        'common:dataSetVersion':
          data?.json?.sourceDataSet?.administrativeInformation?.publicationAndOwnership?.[
            'common:dataSetVersion'
          ],
        createdAt: data?.created_at,
      },
      success: true,
    });
  }
  return Promise.resolve({
    data: {},
    success: true,
  });
}
