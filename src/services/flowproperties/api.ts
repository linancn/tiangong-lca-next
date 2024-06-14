import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import { v4 } from 'uuid';
import {
  classificationToJson,
  classificationToString,
  getLangList,
  getLangText,
} from '../general/util';
import { genFlowpropertiesJsonOrdered } from './util';

export async function createFlowproperties(data: any) {
  const newID = v4();
  const oldData = {
    flowPropertyDataSet: {
      '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
      '@xmlns': 'http://lca.jrc.it/ILCD/FlowProperty',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@version': '1.1',
      '@xsi:schemaLocation':
        'http://lca.jrc.it/ILCD/FlowProperty ../../schemas/ILCD_FlowPropertyDataSet.xsd',
    },
  };
  const newData = genFlowpropertiesJsonOrdered(newID, data, oldData);
  const result = await supabase
    .from('flowproperties')
    .insert([{ id: newID, json_ordered: newData }])
    .select();
  return result;
}

export async function updateFlowproperties(data: any) {
  const result = await supabase.from('flowproperties').select('id, json').eq('id', data.id);
  if (result.data && result.data.length === 1) {
    const oldData = result.data[0].json;
    const newData = genFlowpropertiesJsonOrdered(data.id, data, oldData);
    const updateResult = await supabase
      .from('flowproperties')
      .update({ json_ordered: newData })
      .eq('id', data.id)
      .select();
    return updateResult;
  }
  return null;
}

export async function deleteFlowproperties(id: string) {
  const result = await supabase.from('flowproperties').delete().eq('id', id);
  return result;
}

export async function getFlowpropertiesTable(
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
    json->flowPropertyDataSet->flowPropertiesInformation->dataSetInformation->"common:name",
    json->flowPropertyDataSet->flowPropertiesInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
    json->flowPropertyDataSet->flowPropertiesInformation->dataSetInformation->"common:generalComment",
    created_at
  `;

  let result: any = {};
  if (dataSource === 'tg') {
    result = await supabase
      .from('flowproperties')
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
        .from('flowproperties')
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
            // shortName: getLangText(i['common:shortName'], lang),
            name: getLangText(i['common:name'], lang),
            classification: classificationToString(i['common:class']),
            generalComment: getLangText(i['common:generalComment'], lang),
            // email: i.email ?? '-',
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

export async function getFlowpropertiesDetail(id: string) {
  const result = await supabase.from('flowproperties').select('json, created_at').eq('id', id);
  if (result.data && result.data.length > 0) {
    const data = result.data[0];
    return Promise.resolve({
      data: {
        id: id,
        // 'common:shortName': getLangList(
        //   data?.json?.contactDataSet?.contactInformation?.dataSetInformation?.['common:shortName'],
        // ),
        'common:name': getLangList(
          data?.json?.flowPropertyDataSet?.flowPropertiesInformation?.dataSetInformation?.[
            'common:name'
          ],
        ),
        'common:class': classificationToJson(
          data?.json?.flowPropertyDataSet?.flowPropertiesInformation?.dataSetInformation
            ?.classificationInformation?.['common:classification']?.['common:class'],
        ),
        'common:generalComment': getLangList(
          data?.json?.flowPropertyDataSet?.flowPropertiesInformation?.dataSetInformation?.[
            'common:generalComment'
          ],
        ),
        // email: data?.json?.contactDataSet?.contactInformation?.dataSetInformation?.email,
        // 'common:dataSetVersion':
        //   data?.json?.contactDataSet?.administrativeInformation?.publicationAndOwnership?.[
        //     'common:dataSetVersion'
        //   ],
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
