import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import { v4 } from 'uuid';
import { classificationToString, getLangText } from '../general/util';
import { genContactJsonOrdered } from './util';

export async function createContact(data: any) {
  const newID = v4();
  const oldData = {
    contactDataSet: {
      '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
      '@xmlns': 'http://lca.jrc.it/ILCD/Contact',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@version': '1.1',
      '@xsi:schemaLocation': 'http://lca.jrc.it/ILCD/Contact ../../schemas/ILCD_ContactDataSet.xsd',
    },
  };
  const newData = genContactJsonOrdered(newID, data, oldData);
  const result = await supabase
    .from('contacts')
    .insert([{ id: newID, json_ordered: newData }])
    .select();
  return result;
}

export async function updateContact(data: any) {
  const result = await supabase.from('contacts').select('id, json').eq('id', data.id);
  if (result.data && result.data.length === 1) {
    const oldData = result.data[0].json;
    const newData = genContactJsonOrdered(data.id, data, oldData);
    const updateResult = await supabase
      .from('contacts')
      .update({ json_ordered: newData })
      .eq('id', data.id)
      .select();
    return updateResult;
  }
  return null;
}

export async function deleteContact(id: string) {
  const result = await supabase.from('contacts').delete().eq('id', id);
  return result;
}

export async function getContactTable(
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
    json->contactDataSet->contactInformation->dataSetInformation->"common:shortName",
    json->contactDataSet->contactInformation->dataSetInformation->"common:name",
    json->contactDataSet->contactInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
    json->contactDataSet->contactInformation->dataSetInformation->email,
    created_at
  `;

  let result: any = {};
  if (dataSource === 'tg') {
    result = await supabase
      .from('contacts')
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
        .from('contacts')
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
            name: getLangText(i['common:name'], lang),
            classification: classificationToString(i['common:class']),
            email: i.email ?? '-',
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

export async function getContactDetail(id: string) {
  const result = await supabase.from('contacts').select('json, created_at').eq('id', id);
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
