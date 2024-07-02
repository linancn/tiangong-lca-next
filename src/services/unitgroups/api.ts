import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import { v4 } from 'uuid';
import { classificationToString, getLangText } from '../general/util';
import { genUnitGroupJsonOrdered } from './util';

const table_name = 'unitgroups';

export async function createUnitGroup(data: any) {
  const newID = v4();
  const oldData = {
    unitGroupDataSet: {
      '@xmlns': 'http://lca.jrc.it/ILCD/UnitGroup',
      '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@version': '1.1',
      '@xsi:schemaLocation':
        'http://lca.jrc.it/ILCD/UnitGroup ../../schemas/ILCD_UnitGroupDataSet.xsd',
    },
  };
  const newData = genUnitGroupJsonOrdered(newID, data, oldData);
  const result = await supabase
    .from(table_name)
    .insert([{ id: newID, json_ordered: newData }])
    .select();
  return result;
}

export async function updateUnitGroup(data: any) {
  const result = await supabase.from(table_name).select('id, json').eq('id', data.id);
  if (result.data && result.data.length === 1) {
    const oldData = result.data[0].json;
    const newData = genUnitGroupJsonOrdered(data.id, data, oldData);
    const updateResult = await supabase
      .from(table_name)
      .update({ json_ordered: newData })
      .eq('id', data.id)
      .select();
    return updateResult;
  }
  return null;
}

export async function deleteUnitGroup(id: string) {
  const result = await supabase.from(table_name).delete().eq('id', id);
  return result;
}

export async function getUnitGroupTable(
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
        json->unitGroupDataSet->unitGroupInformation->dataSetInformation->"common:name",
        json->unitGroupDataSet->unitGroupInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
        json->unitGroupDataSet->unitGroupInformation->quantitativeReference->referenceToReferenceUnit,
        created_at
    `;

  let result: any = {};
  if (dataSource === 'tg') {
    result = await supabase
      .from(table_name)
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
        .from(table_name)
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
            key: i.id,
            id: i.id,
            lang: lang,
            name: getLangText(i['common:name'], lang),
            classification: classificationToString(i['common:class']),
            referenceToReferenceUnit: i.referenceToReferenceUnit ?? '-',
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

export async function getUnitGroupDetail(id: string) {
  const result = await supabase.from(table_name).select('json, created_at').eq('id', id);
  if (result.data && result.data.length > 0) {
    const data = result.data[0];
    return Promise.resolve({
      data: {
        json: data?.json,
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
