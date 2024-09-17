import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import {
  // classificationToJson,
  classificationToString,
  genClassificationZH,
  // getLangList,
  getLangText,
  jsonToList,
} from '../general/util';
import { getILCDClassification } from '../ilcd/api';
import { genFlowpropertyJsonOrdered } from './util';

export async function createFlowproperties(data: any) {
  // const newID = v4();
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
  const newData = genFlowpropertyJsonOrdered(data.id, data, oldData);
  const result = await supabase
    .from('flowproperties')
    .insert([{ id: data.id, json_ordered: newData }])
    .select();
  return result;
}

export async function updateFlowproperties(data: any) {
  const result = await supabase.from('flowproperties').select('id, json').eq('id', data.id);
  if (result.data && result.data.length === 1) {
    const oldData = result.data[0].json;
    const newData = genFlowpropertyJsonOrdered(data.id, data, oldData);
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

export async function getFlowpropertyTableAll(
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
    json->flowPropertyDataSet->flowPropertiesInformation->quantitativeReference->referenceToReferenceUnitGroup->>"@refObjectId",
    json->flowPropertyDataSet->flowPropertiesInformation->quantitativeReference->referenceToReferenceUnitGroup->"common:shortDescription",
    created_at
  `;

  let result: any = {};
  if (dataSource === 'tg') {
    result = await supabase
      .from('flowproperties')
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

    let data: any[] = [];

    if (lang === 'zh') {
      await getILCDClassification('FlowProperty', lang, ['all']).then((res) => {
        data = result.data.map((i: any) => {
          try {
            const classifications = jsonToList(i?.['common:class']);
            const classificationZH = genClassificationZH(classifications, res?.data?.category);

            return {
              key: i.id,
              id: i.id,
              name: getLangText(i?.['common:name'], lang),
              classification: classificationToString(classificationZH),
              generalComment: getLangText(i?.['common:generalComment'], lang),
              refUnitGroupId: i?.['@refObjectId'] ?? '-',
              refUnitGroup: getLangText(i?.['common:shortDescription'], lang),
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
            name: getLangText(i?.['common:name'], lang),
            classification: classificationToString(i?.['common:class']),
            generalComment: getLangText(i?.['common:generalComment'], lang),
            refUnitGroupId: i?.['@refObjectId'] ?? '-',
            refUnitGroup: getLangText(i?.['common:shortDescription'], lang),
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

export async function getFlowpropertyTablePgroongaSearch(
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
    result = await supabase.rpc('pgroonga_search_flowproperties', {
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
      await getILCDClassification('FlowProperty', lang, ['all']).then((res) => {
        data = result.data.map((i: any) => {
          try {
            const dataInfo = i.json?.flowPropertyDataSet?.flowPropertiesInformation;
            const classifications = jsonToList(
              dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
                'common:class'
              ],
            );
            const classificationZH = genClassificationZH(classifications, res?.data?.category);

            return {
              key: i.id,
              id: i.id,
              name: getLangText(dataInfo?.dataSetInformation?.['common:name'] ?? {}, lang),
              classification: classificationToString(classificationZH),
              generalComment: getLangText(
                dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
                lang,
              ),
              refUnitGroupId:
                dataInfo?.quantitativeReference?.referenceToReferenceUnitGroup?.['@refObjectId'] ??
                '-',
              refUnitGroup: getLangText(
                dataInfo?.quantitativeReference?.referenceToReferenceUnitGroup?.[
                  'common:shortDescription'
                ] ?? {},
                lang,
              ),
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
          const dataInfo = i.json?.flowPropertyDataSet?.flowPropertiesInformation;
          return {
            key: i.id,
            id: i.id,
            name: getLangText(dataInfo?.dataSetInformation?.['common:name'] ?? {}, lang),
            classification: classificationToString(
              dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
                'common:class'
              ],
            ),
            generalComment: getLangText(
              dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
              lang,
            ),
            refUnitGroupId:
              dataInfo?.quantitativeReference?.referenceToReferenceUnitGroup?.['@refObjectId'] ??
              '-',
            refUnitGroup: getLangText(
              dataInfo?.quantitativeReference?.referenceToReferenceUnitGroup?.[
                'common:shortDescription'
              ] ?? {},
              lang,
            ),
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

  return result;
}

export async function getFlowpropertyDetail(id: string) {
  const result = await supabase.from('flowproperties').select('json, created_at').eq('id', id);
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

export async function getReferenceUnitGroup(id: string) {
  if (id) {
    const selectStr = `
        id,
        json->flowPropertyDataSet->flowPropertiesInformation->dataSetInformation->"common:name",
        json->flowPropertyDataSet->flowPropertiesInformation->quantitativeReference->referenceToReferenceUnitGroup
    `;

    const result = await supabase.from('flowproperties').select(selectStr).eq('id', id);

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

      const data: any = result.data[0];

      return Promise.resolve({
        data: {
          id: data.id,
          name: data?.['common:name'] ?? '-',
          refUnitGroupId: data?.referenceToReferenceUnitGroup?.['@refObjectId'] ?? '-',
          refUnitGroupShortDescription:
            data?.referenceToReferenceUnitGroup?.['common:shortDescription'] ?? {},
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
