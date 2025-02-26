import {
  classificationToString,
  genClassificationZH,
  getLangText,
  jsonToList,
} from '../general/util';

import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import { getDataDetail, getTeamIdByUserId } from '../general/api';
import { getILCDClassification } from '../ilcd/api';
import { genFlowpropertyJsonOrdered } from './util';

export async function createFlowproperties(id: string, data: any) {
  const newData = genFlowpropertyJsonOrdered(id, data);
  const teamId = await getTeamIdByUserId();
  const result = await supabase
    .from('flowproperties')
    .insert([{ id: id, json_ordered: newData, team_id: teamId }])
    .select();
  return result;
}

export async function updateFlowproperties(id: string, version: string, data: any) {
  const newData = genFlowpropertyJsonOrdered(id, data);
  const updateResult = await supabase
    .from('flowproperties')
    .update({ json_ordered: newData })
    .eq('id', id)
    .eq('version', version)
    .select();
  return updateResult;
}

export async function deleteFlowproperties(id: string, version: string) {
  const result = await supabase.from('flowproperties').delete().eq('id', id).eq('version', version);
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
  tid: string | [],
) {
  const sortBy = Object.keys(sort)[0] ?? 'modified_at';
  const orderBy = sort[sortBy] ?? 'descend';

  const selectStr = `
    id,
    json->flowPropertyDataSet->flowPropertiesInformation->dataSetInformation->"common:name",
    json->flowPropertyDataSet->flowPropertiesInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
    json->flowPropertyDataSet->flowPropertiesInformation->dataSetInformation->"common:generalComment",
    json->flowPropertyDataSet->flowPropertiesInformation->quantitativeReference->referenceToReferenceUnitGroup->>"@refObjectId",
    json->flowPropertyDataSet->flowPropertiesInformation->quantitativeReference->referenceToReferenceUnitGroup->"common:shortDescription",
    version,
    modified_at,
    team_id
  `;

  const tableName = 'flowproperties';

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
    if (tid.length > 0) {
      query = query.eq('team_id', tid);
    }
  } else if (dataSource === 'co') {
    query = query.eq('state_code', 200);
    if (tid.length > 0) {
      query = query.eq('team_id', tid);
    }
  } else if (dataSource === 'my') {
    const session = await supabase.auth.getSession();
    if (session.data.session) {
      query = query.eq('user_id', session?.data?.session?.user?.id);
    } else {
      return Promise.resolve({
        data: [],
        success: false,
      });
    }
  } else if (dataSource === 'te') {
    const teamId = await getTeamIdByUserId();
    if (teamId) {
      query = query.eq('team_id', teamId);
    } else {
      return Promise.resolve({
        data: [],
        success: true,
      });
    }
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

    if (lang === 'zh') {
      await getILCDClassification('FlowProperty', lang, ['all']).then((res) => {
        data = result.data.map((i: any) => {
          try {
            const classifications = jsonToList(i?.['common:class']);
            const classificationZH = genClassificationZH(classifications, res?.data);

            return {
              key: i.id + ':' + i.version,
              id: i.id,
              name: getLangText(i?.['common:name'], lang),
              classification: classificationToString(classificationZH),
              generalComment: getLangText(i?.['common:generalComment'], lang),
              refUnitGroupId: i?.['@refObjectId'] ?? '-',
              refUnitGroup: getLangText(i?.['common:shortDescription'], lang),
              version: i.version,
              modifiedAt: new Date(i?.modified_at),
              teamId: i?.team_id,
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
            key: i.id + ':' + i.version,
            id: i.id,
            name: getLangText(i?.['common:name'], lang),
            classification: classificationToString(i?.['common:class']),
            generalComment: getLangText(i?.['common:generalComment'], lang),
            refUnitGroupId: i?.['@refObjectId'] ?? '-',
            refUnitGroup: getLangText(i?.['common:shortDescription'], lang),
            version: i.version,
            modifiedAt: new Date(i?.modified_at),
            teamId: i?.team_id,
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
            const classificationZH = genClassificationZH(classifications, res?.data);

            return {
              key: i.id + ':' + i.version,
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
              version: i.version,
              modifiedAt: new Date(i?.modified_at),
              teamId: i?.team_id,
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
            key: i.id + ':' + i.version,
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
            version: i.version,
            modifiedAt: new Date(i?.modified_at),
            teamId: i?.team_id,
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

export async function getFlowpropertyDetail(id: string, version: string) {
  return getDataDetail(id, version, 'flowproperties');
}

export async function getReferenceUnitGroup(id: string, version: string) {
  let result: any = {};
  const selectStr = `
        id,
        version,
        json->flowPropertyDataSet->flowPropertiesInformation->dataSetInformation->"common:name",
        json->flowPropertyDataSet->flowPropertiesInformation->quantitativeReference->referenceToReferenceUnitGroup
    `;
  if (id && id.length === 36) {
    if (version && version.length === 9) {
      result = await supabase
        .from('flowproperties')
        .select(selectStr)
        .eq('id', id)
        .eq('version', version);
      if (result.data === null || result.data.length === 0) {
        result = await supabase
          .from('flowproperties')
          .select(selectStr)
          .eq('id', id)
          .order('version', { ascending: false })
          .range(0, 0);
      }
    } else {
      result = await supabase
        .from('flowproperties')
        .select(selectStr)
        .eq('id', id)
        .order('version', { ascending: false })
        .range(0, 0);
    }
    if (result?.data && result.data.length > 0) {
      const data = result.data[0];

      return Promise.resolve({
        data: {
          id: data.id,
          version: data.version,
          name: data?.['common:name'] ?? '-',
          refUnitGroupId: data?.referenceToReferenceUnitGroup?.['@refObjectId'] ?? '-',
          refUnitGroupShortDescription:
            data?.referenceToReferenceUnitGroup?.['common:shortDescription'] ?? {},
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
