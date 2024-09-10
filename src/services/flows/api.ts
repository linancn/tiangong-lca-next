import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';
import { SortOrder } from 'antd/lib/table/interface';
import {
  classificationToString,
  genClassificationZH,
  getLangText,
  jsonToList,
} from '../general/util';
import { getILCDFlowCategorizationAllZH } from '../ilcd/api';
import { genFlowJsonOrdered } from './util';

export async function createFlows(data: any) {
  // const newID = v4();
  const oldData = {
    flowDataSet: {
      '@xmlns': 'http://lca.jrc.it/ILCD/Flow',
      '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
      '@xmlns:ecn': 'http://eplca.jrc.ec.europa.eu/ILCD/Extensions/2018/ECNumber',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@version': '1.1',
      '@xsi:schemaLocation': 'http://lca.jrc.it/ILCD/Flow ../../schemas/ILCD_FlowDataSet.xsd',
    },
  };
  const newData = genFlowJsonOrdered(data.id, data, oldData);
  const result = await supabase
    .from('flows')
    .insert([{ id: data.id, json_ordered: newData }])
    .select();
  return result;
}

export async function updateFlows(data: any) {
  const result = await supabase.from('flows').select('id, json').eq('id', data.id);
  if (result.data && result.data.length === 1) {
    const oldData = result.data[0].json;
    const newData = genFlowJsonOrdered(data.id, data, oldData);
    const updateResult = await supabase
      .from('flows')
      .update({ json_ordered: newData })
      .eq('id', data.id)
      .select();
    return updateResult;
  }
  return null;
}

export async function deleteFlows(id: string) {
  const result = await supabase.from('flows').delete().eq('id', id);
  return result;
}

export async function getFlowTableAll(
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
    json->flowDataSet->flowInformation->dataSetInformation->name->baseName,
    json->flowDataSet->flowInformation->dataSetInformation->classificationInformation->"common:elementaryFlowCategorization"->"common:category",
    json->flowDataSet->flowInformation->dataSetInformation->"common:generalComment",
    json->flowDataSet->flowInformation->dataSetInformation->CASNumber,
    json->flowDataSet->modellingAndValidation->LCIMethod->typeOfDataSet,
    json->flowDataSet->flowProperties->flowProperty->referenceToFlowPropertyDataSet,
    created_at
  `;

  let result: any = {};
  if (dataSource === 'tg') {
    result = await supabase
      .from('flows')
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
        .from('flows')
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
      await getILCDFlowCategorizationAllZH().then((res) => {
        data = result.data.map((i: any) => {
          try {
            let thisCategory: any[] = [];
            if (i?.typeOfDataSet === 'Elementary flow') {
              thisCategory = res?.data?.categoryElementaryFlow;
            } else {
              thisCategory = res?.data?.category;
            }

            const classifications = jsonToList(i?.['common:category']);
            const classificationZH = genClassificationZH(classifications, thisCategory);

            return {
              key: i.id,
              id: i.id,
              baseName: getLangText(i?.baseName, lang),
              flowType: i?.typeOfDataSet ?? '-',
              classification: classificationToString(classificationZH),
              generalComment: getLangText(i?.['common:generalComment'], lang),
              CASNumber: i?.CASNumber ?? '-',
              refFlowPropertyId: i?.referenceToFlowPropertyDataSet?.['@refObjectId'] ?? '-',
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
        try {
          return {
            key: i.id,
            id: i.id,
            baseName: getLangText(i.baseName, lang),
            flowType: i.typeOfDataSet ?? '-',
            classification: classificationToString(i['common:category']),
            generalComment: getLangText(i['common:generalComment'], lang),
            CASNumber: i.CASNumber ?? '-',
            refFlowPropertyId: i.referenceToFlowPropertyDataSet?.['@refObjectId'] ?? '-',
            created_at: new Date(i.created_at),
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

export async function getFlowTablePgroongaSearch(
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
    result = await supabase.rpc('pgroonga_search_flows', {
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
      await getILCDFlowCategorizationAllZH().then((res) => {
        data = result.data.map((i: any) => {
          try {
            const dataInfo = i.json?.flowDataSet?.flowInformation?.dataSetInformation;

            let thisCategory: any[] = [];
            if (
              i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet ===
              'Elementary flow'
            ) {
              thisCategory = res?.data?.categoryElementaryFlow;
            } else {
              thisCategory = res?.data?.category;
            }

            const classifications = jsonToList(
              dataInfo?.classificationInformation?.['common:elementaryFlowCategorization']?.[
                'common:category'
              ],
            );
            const classificationZH = genClassificationZH(classifications, thisCategory);

            return {
              key: i.id,
              id: i.id,
              baseName: getLangText(dataInfo?.name?.baseName ?? {}, lang),
              generalComment: getLangText(dataInfo?.['common:generalComment'] ?? {}, lang),
              flowType:
                i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet ?? '-',
              classification: classificationToString(classificationZH),
              CASNumber: dataInfo?.CASNumber ?? '-',
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
        try {
          const dataInfo = i.json?.flowDataSet?.flowInformation?.dataSetInformation;
          return {
            key: i.id,
            id: i.id,
            baseName: getLangText(dataInfo?.name?.baseName ?? {}, lang),
            generalComment: getLangText(dataInfo?.['common:generalComment'] ?? {}, lang),
            classification: classificationToString(
              dataInfo?.classificationInformation?.['common:elementaryFlowCategorization']?.[
                'common:category'
              ],
            ),
            flowType: i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet ?? '-',
            CASNumber: dataInfo?.CASNumber ?? '-',
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
      total: totalCount ?? 0,
    });
  }
  return Promise.resolve({
    data: [],
    success: false,
  });
}

export async function flow_hybrid_search(
  params: {
    current?: number;
    pageSize?: number;
  },
  // sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
  query: string,
  filter: any,
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('flow_hybrid_search', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { query: query, filter: filter },
      region: FunctionRegion.UsEast1,
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
    return Promise.resolve({
      data: result.data.map((i: any) => {
        try {
          return {
            key: i.id,
            id: i.id,
            baseName: getLangText(
              i.json?.flowDataSet?.flowInformation?.dataSetInformation?.name?.baseName,
              lang,
            ),
            classification: classificationToString(
              i.json?.flowDataSet?.flowInformation?.dataSetInformation?.classificationInformation?.[
                'common:classification'
              ]?.['common:class'],
            ),
            generalComment: getLangText(
              i.json?.flowDataSet?.flowInformation?.dataSetInformation?.['common:generalComment'],
              lang,
            ),
            dataType: i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet ?? '-',
            CASNumber: i.json?.flowDataSet?.flowInformation?.dataSetInformation?.CASNumber ?? '-',
          };
        } catch (e) {
          console.error(e);
          return {
            id: i.id,
          };
        }
      }),
      page: 1,
      success: true,
      total: result.data.length,
    });
  }
  return Promise.resolve({
    data: [],
    success: false,
  });
}

export async function getFlowDetail(id: string) {
  const result = await supabase.from('flows').select('json, created_at').eq('id', id);
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

export async function getReferenceProperty(id: string) {
  if (id) {
    const selectStr = `
        id,
        json->flowDataSet->flowInformation->dataSetInformation->name,
        json->flowDataSet->flowInformation->quantitativeReference->referenceToReferenceFlowProperty,
        json->flowDataSet->flowProperties->flowProperty
    `;

    const result = await supabase.from('flows').select(selectStr).eq('id', id);

    if (result.error) {
      console.log('error', result.error);
    }

    if (result.data) {
      if (result.data.length === 0) {
        return Promise.resolve({
          data: {},
          success: true,
        });
      }

      const data = result.data[0];

      const dataList = jsonToList(data?.flowProperty);
      const refData = dataList.find(
        (item) => item?.['@dataSetInternalID'] === data?.referenceToReferenceFlowProperty,
      );

      return Promise.resolve({
        data: {
          id: data.id,
          name: data?.name ?? '-',
          refFlowPropertytId: refData?.referenceToFlowPropertyDataSet?.['@refObjectId'] ?? '-',
          refFlowPropertyShortDescription:
            refData?.referenceToFlowPropertyDataSet?.['shortDescription'] ?? {},
        },
        success: true,
      });
    }
  }
  return Promise.resolve({
    data: {},
    success: false,
  });
}
