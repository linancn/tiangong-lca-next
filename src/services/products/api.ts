import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import { v4 } from 'uuid';
import { getLangText } from '../general/util';
import { genProductJsonOrdered } from './util';
// import { genFlowJsonOrdered } from './util';

export async function createProduct(flowId: string, data: any) {
  const newID = v4();
  const newData = genProductJsonOrdered(newID, data);
  const result = await supabase
    .from('products')
    .insert([{ id: newID, flow_id: flowId, json_ordered: newData }])
    .select();
  return result;
}

export async function updateProduct(data: any) {
  // const result = await supabase.from('products').select('id, json').eq('id', data.id);
  // if (result.data && result.data.length === 1) {
  // const oldData = result.data[0].json;
  const newData = genProductJsonOrdered(data.id, data);
  const updateResult = await supabase
    .from('products')
    .update({ json_ordered: newData })
    .eq('id', data.id)
    .select();
  return updateResult;
  // }
  // return null;
}

export async function deleteProduct(id: string) {
  const result = await supabase.from('products').delete().eq('id', id);
  return result;
}

export async function getProductTablePgroongaSearch(
  params: {
    current?: number;
    pageSize?: number;
  },
  // sort: Record<string, SortOrder>,
  flowId: string,
  lang: string,
  dataSource: string,
  queryText: string,
  filterCondition: any,
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.rpc('pgroonga_search_products_flow_id', {
      this_flow_id: flowId,
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

    return Promise.resolve({
      data: result.data.map((i: any) => {
        try {
          return {
            key: i.id,
            id: i.id,
            name: getLangText(
              i.json?.productDataSet?.productInformation?.dataSetInformation?.name ?? {},
              lang,
            ),
            generalComment: getLangText(
              i.json?.productDataSet?.productInformation?.dataSetInformation?.[
              'common:generalComment'
              ] ?? {},
              lang,
            ),
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
      total: totalCount ?? 0,
    });
  }

  return result;
}

export async function getProductTableAll(
  params: {
    current?: number;
    pageSize?: number;
  },
  sort: Record<string, SortOrder>,
  flowId: string,
  lang: string,
  dataSource: string,
) {
  const sortBy = Object.keys(sort)[0] ?? 'created_at';
  const orderBy = sort[sortBy] ?? 'descend';

  const selectStr = `
    id,
    json->productDataSet->productInformation->dataSetInformation->name,
    json->productDataSet->productInformation->dataSetInformation->"common:generalComment",
    created_at
  `;

  let result: any = {};
  if (dataSource === 'tg') {
    result = await supabase
      .from('products')
      .select(selectStr, { count: 'exact' })
      .eq('state_code', 100)
      .eq('flow_id', flowId)
      .order(sortBy, { ascending: orderBy === 'ascend' })
      .range(
        ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
        (params.current ?? 1) * (params.pageSize ?? 10) - 1,
      );
  } else if (dataSource === 'my') {
    const session = await supabase.auth.getSession();
    if (session.data.session) {
      result = await supabase
        .from('products')
        .select(selectStr, { count: 'exact' })
        .eq('user_id', session.data.session.user?.id)
        .eq('flow_id', flowId)
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
            name: getLangText(i.name, lang),
            generalComment: getLangText(i['common:generalComment'], lang),
            created_at: new Date(i.created_at),
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

export async function getProductDetail(id: string) {
  const result = await supabase.from('products').select('json, created_at').eq('id', id);
  if (result.data && result.data.length > 0) {
    const data = result.data[0];
    return Promise.resolve({
      data: {
        id: id,
        json: data.json,
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
