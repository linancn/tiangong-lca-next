import {
  classificationToString,
  genClassificationZH,
  getLangText,
  jsonToList,
} from '../general/util';

import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';
import { SortOrder } from 'antd/lib/table/interface';
import { getDataDetail } from '../general/api';
import { getILCDFlowCategorizationAll, getILCDLocationByValues } from '../ilcd/api';
import { genFlowJsonOrdered, genFlowName } from './util';

export async function createFlows(id: string, data: any) {
  const newData = genFlowJsonOrdered(id, data);
  const result = await supabase
    .from('flows')
    .insert([{ id: id, json_ordered: newData }])
    .select();
  return result;
}

export async function updateFlows(id: string, version: string, data: any) {
  const newData = genFlowJsonOrdered(id, data);
  const updateResult = await supabase
    .from('flows')
    .update({ json_ordered: newData })
    .eq('id', id)
    .eq('version', version)
    .select();
  return updateResult;
}

export async function deleteFlows(id: string, version: string) {
  const result = await supabase.from('flows').delete().eq('id', id).eq('version', version);
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
  filters?: {
    flowType?: string;
  },
) {
  const sortBy = Object.keys(sort)[0] ?? 'modified_at';
  const orderBy = sort[sortBy] ?? 'descend';

  const selectStr = `
    id,
    json->flowDataSet->flowInformation->dataSetInformation->name,
    json->flowDataSet->flowInformation->dataSetInformation->classificationInformation->"common:elementaryFlowCategorization"->"common:category",
    json->flowDataSet->flowInformation->dataSetInformation->"common:synonyms",
    json->flowDataSet->flowInformation->dataSetInformation->>CASNumber,
    json->flowDataSet->flowInformation->geography->>locationOfSupply,
    json->flowDataSet->modellingAndValidation->LCIMethod->>typeOfDataSet,
    json->flowDataSet->flowProperties->flowProperty->referenceToFlowPropertyDataSet,
    version,
    modified_at
  `;

  let result: any = {};
  let query = supabase
    .from('flows')
    .select(selectStr, { count: 'exact' })
    .order(sortBy, { ascending: orderBy === 'ascend' })
    .range(
      ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
      (params.current ?? 1) * (params.pageSize ?? 10) - 1,
    );
  if (filters?.flowType) {
    const flowTypes = filters.flowType.split(',').map((type) => type.trim());
    if (flowTypes.length > 1) {
      query = query.in(
        'json->flowDataSet->modellingAndValidation->LCIMethod->>typeOfDataSet',
        flowTypes,
      );
    } else {
      query = query.eq(
        'json->flowDataSet->modellingAndValidation->LCIMethod->>typeOfDataSet',
        flowTypes[0],
      );
    }
  }
  if (dataSource === 'tg') {
    query = query.eq('state_code', 100);
  } else if (dataSource === 'my') {
    const session = await supabase.auth.getSession();
    query = query.eq('user_id', session?.data?.session?.user?.id);
  }

  result = await query;

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

    const locations: string[] = Array.from(
      new Set(result.data.map((i: any) => i['locationOfSupply'])),
    );
    let locationData: any[] = [];
    await getILCDLocationByValues(lang, locations).then((res) => {
      locationData = res.data;
    });

    let data: any[] = [];

    if (lang === 'zh') {
      await getILCDFlowCategorizationAll(lang).then((res) => {
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

            const thisLocation = locationData.find((l) => l['@value'] === i['locationOfSupply']);
            let locationOfSupply = i['locationOfSupply'];
            if (thisLocation?.['#text']) {
              locationOfSupply = thisLocation['#text'];
            }

            return {
              key: i.id + ':' + i.version,
              id: i.id,
              name: genFlowName(i?.name ?? {}, lang),
              flowType: i?.typeOfDataSet ?? '-',
              classification: classificationToString(classificationZH),
              synonyms: getLangText(i?.['common:synonyms'], lang),
              CASNumber: i?.CASNumber ?? '-',
              refFlowPropertyId: i?.referenceToFlowPropertyDataSet?.['@refObjectId'] ?? '-',
              locationOfSupply: locationOfSupply ?? '-',
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
    } else {
      data = result.data.map((i: any) => {
        try {
          const thisLocation = locationData.find((l) => l['@value'] === i['locationOfSupply']);
          let locationOfSupply = i['locationOfSupply'];
          if (thisLocation?.['#text']) {
            locationOfSupply = thisLocation['#text'];
          }
          return {
            key: i.id + ':' + i.version,
            id: i.id,
            name: genFlowName(i?.name ?? {}, lang),
            flowType: i.typeOfDataSet ?? '-',
            classification: classificationToString(i['common:category']),
            synonyms: getLangText(i['common:synonyms'], lang),
            CASNumber: i.CASNumber ?? '-',
            refFlowPropertyId: i.referenceToFlowPropertyDataSet?.['@refObjectId'] ?? '-',
            locationOfSupply: locationOfSupply,
            version: i.version,
            modifiedAt: new Date(i.modified_at),
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

    const locations: string[] = Array.from(
      new Set(
        result.data.map(
          (i: any) => i.json?.flowDataSet?.flowInformation?.geography?.locationOfSupply,
        ),
      ),
    );
    let locationData: any[] = [];
    await getILCDLocationByValues(lang, locations).then((res) => {
      locationData = res.data;
    });

    let data: any[] = [];

    if (lang === 'zh') {
      await getILCDFlowCategorizationAll(lang).then((res) => {
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

            const thisLocation = locationData.find(
              (l) =>
                l['@value'] === i.json?.flowDataSet?.flowInformation?.geography?.locationOfSupply,
            );
            let locationOfSupply =
              i.json?.flowDataSet?.flowInformation?.geography?.locationOfSupply;
            if (thisLocation?.['#text']) {
              locationOfSupply = thisLocation['#text'];
            }

            return {
              key: i.id + ':' + i.version,
              id: i.id,
              name: genFlowName(dataInfo?.name ?? {}, lang),
              synonyms: getLangText(dataInfo?.['common:synonyms'] ?? {}, lang),
              flowType:
                i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet ?? '-',
              classification: classificationToString(classificationZH),
              CASNumber: dataInfo?.CASNumber ?? '-',
              locationOfSupply: locationOfSupply ?? '-',
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
    } else {
      data = result.data.map((i: any) => {
        try {
          const dataInfo = i.json?.flowDataSet?.flowInformation?.dataSetInformation;
          const thisLocation = locationData.find(
            (l) =>
              l['@value'] === i.json?.flowDataSet?.flowInformation?.geography?.locationOfSupply,
          );
          let locationOfSupply = i.json?.flowDataSet?.flowInformation?.geography?.locationOfSupply;
          if (thisLocation?.['#text']) {
            locationOfSupply = thisLocation['#text'];
          }

          return {
            key: i.id + ':' + i.version,
            id: i.id,
            name: genFlowName(dataInfo?.name ?? {}, lang),
            synonyms: getLangText(dataInfo?.['common:synonyms'] ?? {}, lang),
            classification: classificationToString(
              dataInfo?.classificationInformation?.['common:elementaryFlowCategorization']?.[
                'common:category'
              ],
            ),
            flowType: i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet ?? '-',
            CASNumber: dataInfo?.CASNumber ?? '-',
            locationOfSupply: locationOfSupply ?? '-',
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
            key: i.id + ':' + i.version,
            id: i.id,
            name: genFlowName(
              i.json?.flowDataSet?.flowInformation?.dataSetInformation?.name ?? {},
              lang,
            ),
            classification: classificationToString(
              i.json?.flowDataSet?.flowInformation?.dataSetInformation?.classificationInformation?.[
                'common:classification'
              ]?.['common:class'],
            ),
            synonyms: getLangText(
              i.json?.flowDataSet?.flowInformation?.dataSetInformation?.['common:synonyms'],
              lang,
            ),
            flowType: i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet ?? '-',
            CASNumber: i.json?.flowDataSet?.flowInformation?.dataSetInformation?.CASNumber ?? '-',
            locationOfSupply:
              i.json?.flowDataSet?.flowInformation?.geography?.locationOfSupply ?? '-',
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

export async function getFlowDetail(id: string, version: string) {
  return getDataDetail(id, version, 'flows');
}

export async function getReferenceProperty(id: string, version: string) {
  let result: any = {};
  const selectStr = `
        id,
        version,
        json->flowDataSet->flowInformation->dataSetInformation->name,
        json->flowDataSet->flowInformation->quantitativeReference->referenceToReferenceFlowProperty,
        json->flowDataSet->flowProperties->flowProperty
    `;
  if (id && id.length === 36) {
    if (version && version.length === 9) {
      result = await supabase.from('flows').select(selectStr).eq('id', id).eq('version', version);
      if (result.data === null || result.data.length === 0) {
        result = await supabase
          .from('flows')
          .select(selectStr)
          .eq('id', id)
          .order('version', { ascending: false })
          .range(0, 0);
      }
    } else {
      result = await supabase
        .from('flows')
        .select(selectStr)
        .eq('id', id)
        .order('version', { ascending: false })
        .range(0, 0);
    }
    if (result?.data && result.data.length > 0) {
      const data = result.data[0];
      const dataList = jsonToList(data?.flowProperty);
      const refData = dataList.find(
        (item) => item?.['@dataSetInternalID'] === data?.referenceToReferenceFlowProperty,
      );
      return Promise.resolve({
        data: {
          id: data.id,
          version: data.version,
          name: data?.name ?? '-',
          refFlowPropertytId: refData?.referenceToFlowPropertyDataSet?.['@refObjectId'] ?? '-',
          refFlowPropertyShortDescription:
            refData?.referenceToFlowPropertyDataSet?.['shortDescription'] ?? {},
        },
        success: true,
      });
    }
    return Promise.resolve({
      data: null,
      success: false,
    });
  }
}
