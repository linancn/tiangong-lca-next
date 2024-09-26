import {
  classificationToString,
  genClassificationZH,
  getLangText,
  jsonToList,
} from '../general/util';

import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import { getILCDClassification } from '../ilcd/api';
import { genUnitGroupJsonOrdered } from './util';

const table_name = 'unitgroups';

export async function createUnitGroup(data: any) {
  // const newID = v4();
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
  const newData = genUnitGroupJsonOrdered(data.id, data, oldData);
  const result = await supabase
    .from(table_name)
    .insert([{ id: data.id, json_ordered: newData }])
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

export async function getUnitGroupTableAll(
  params: {
    current?: number;
    pageSize?: number;
  },
  sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
) {
  const sortBy = Object.keys(sort)[0] ?? 'modified_at';
  const orderBy = sort[sortBy] ?? 'descend';

  const selectStr = `
        id,
        json->unitGroupDataSet->unitGroupInformation->dataSetInformation->"common:name",
        json->unitGroupDataSet->unitGroupInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
        json->unitGroupDataSet->unitGroupInformation->quantitativeReference->>referenceToReferenceUnit,
        json->unitGroupDataSet->units->unit,
        modified_at
    `;

  let result: any = {};
  if (dataSource === 'tg') {
    result = await supabase
      .from(table_name)
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

    let data: any[] = [];
    if (lang === 'zh') {
      await getILCDClassification('UnitGroup', lang, ['all']).then((res) => {
        data = result.data.map((i: any) => {
          try {
            const unitList = jsonToList(i?.unit);
            const refUnit = unitList.find(
              (item) => item?.['@dataSetInternalID'] === i?.referenceToReferenceUnit,
            );

            const classifications = jsonToList(i?.['common:class']);
            const classificationZH = genClassificationZH(classifications, res?.data);

            return {
              key: i.id,
              id: i.id,
              name: getLangText(i?.['common:name'], lang),
              classification: classificationToString(classificationZH),
              refUnitId: i?.referenceToReferenceUnit ?? '-',
              refUnitName: refUnit?.name ?? '-',
              refUnitGeneralComment: getLangText(refUnit?.generalComment, lang),
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
          const unitList = jsonToList(i?.unit);
          const refUnit = unitList.find(
            (item) => item?.['@dataSetInternalID'] === i?.referenceToReferenceUnit,
          );
          return {
            key: i.id,
            id: i.id,
            name: getLangText(i?.['common:name'], lang),
            classification: classificationToString(i?.['common:class']),
            refUnitId: i?.referenceToReferenceUnit ?? '-',
            refUnitName: refUnit?.name ?? '-',
            refUnitGeneralComment: getLangText(refUnit?.generalComment, lang),
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
      total: result.count ?? 0,
    });
  }
  return Promise.resolve({
    data: [],
    success: false,
  });
}

export async function getUnitGroupTablePgroongaSearch(
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
    result = await supabase.rpc('pgroonga_search_unitgroups', {
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
      await getILCDClassification('UnitGroup', lang, ['all']).then((res) => {
        data = result.data.map((i: any) => {
          try {
            const dataInfo = i.json?.unitGroupDataSet?.unitGroupInformation;
            const refUnitId = dataInfo?.quantitativeReference?.referenceToReferenceUnit ?? '-';
            const unitList = jsonToList(i.json?.unitGroupDataSet?.units?.unit);
            const refUnit = unitList.find((item) => item?.['@dataSetInternalID'] === refUnitId);

            const classifications = jsonToList(
              dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
                'common:class'
              ],
            );

            const classificationZH = genClassificationZH(classifications, res?.data);

            return {
              key: i.id,
              id: i.id,
              name: getLangText(dataInfo?.dataSetInformation?.['common:name'] ?? {}, lang),
              classification: classificationToString(classificationZH),
              refUnitId: refUnitId,
              refUnitName: refUnit?.name ?? '-',
              refUnitGeneralComment: getLangText(refUnit?.generalComment, lang),
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
          const dataInfo = i.json?.unitGroupDataSet?.unitGroupInformation;

          const refUnitId = dataInfo?.quantitativeReference?.referenceToReferenceUnit ?? '-';
          const unitList = jsonToList(i.json?.unitGroupDataSet?.units?.unit);
          const refUnit = unitList.find((item) => item?.['@dataSetInternalID'] === refUnitId);

          return {
            key: i.id,
            id: i.id,
            name: getLangText(dataInfo?.dataSetInformation?.['common:name'] ?? {}, lang),
            classification: classificationToString(
              dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
                'common:class'
              ],
            ),
            refUnitId: refUnitId,
            refUnitName: refUnit?.name ?? '-',
            refUnitGeneralComment: getLangText(refUnit?.generalComment, lang),
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

  return result;
}

export async function getUnitGroupDetail(id: string) {
  const result = await supabase.from(table_name).select('json, modified_at').eq('id', id);
  if (result.data && result.data.length > 0) {
    const data = result.data[0];
    return Promise.resolve({
      data: {
        json: data?.json,
        modifiedAt: data?.modified_at,
      },
      success: true,
    });
  }
  return Promise.resolve({
    data: {},
    success: true,
  });
}

export async function getReferenceUnit(id: string) {
  if (id) {
    const selectStr = `
        id,
        json->unitGroupDataSet->unitGroupInformation->dataSetInformation->"common:name",
        json->unitGroupDataSet->unitGroupInformation->quantitativeReference->referenceToReferenceUnit,
        json->unitGroupDataSet->units->unit
    `;

    const result = await supabase.from(table_name).select(selectStr).eq('id', id);

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

      const dataList = jsonToList(data?.unit);
      const refData = dataList.find(
        (item) => item?.['@dataSetInternalID'] === data?.referenceToReferenceUnit,
      );

      return Promise.resolve({
        data: {
          id: data.id,
          name: data['common:name'],
          refUnitId: data?.referenceToReferenceUnit ?? '-',
          refUnitName: refData?.name ?? '-',
          refUnitGeneralComment: refData?.generalComment,
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
