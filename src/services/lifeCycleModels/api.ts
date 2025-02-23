import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import { getTeamIdByUserId } from '../general/api';
import {
  classificationToString,
  genClassificationZH,
  getLangText,
  jsonToList,
} from '../general/util';
import { getILCDClassification } from '../ilcd/api';
import { genProcessName } from '../processes/util';
import { genLifeCycleModelJsonOrdered, genLifeCycleModelProcess } from './util';
const updateLifeCycleModelProcess = async (
  id: string,
  version: string,
  refNode: any,
  data: any,
) => {
  const result = await supabase
    .from('processes')
    .select('id, json')
    .eq('id', id)
    .eq('version', version);
  if (result.data && result.data.length === 1) {
    const oldData = result.data[0].json;
    const newData = await genLifeCycleModelProcess(
      id,
      refNode,
      data?.lifeCycleModelDataSet,
      oldData,
    );
    const uResult = await supabase
      .from('processes')
      .update({ json_ordered: newData })
      .eq('id', id)
      .eq('version', version)
      .select();
    return uResult;
  } else {
    const oldData = {
      processDataSet: {
        '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
        '@xmlns': 'http://lca.jrc.it/ILCD/Process',
        '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        '@version': '1.1',
        '@locations': '../ILCDLocations.xml',
        '@xsi:schemaLocation':
          'http://lca.jrc.it/ILCD/Process ../../schemas/ILCD_ProcessDataSet.xsd',
      },
    };
    const newData = await genLifeCycleModelProcess(
      id,
      refNode,
      data?.lifeCycleModelDataSet,
      oldData,
    );
    const cResult = await supabase
      .from('processes')
      .insert([{ id: id, json_ordered: newData }])
      .select();
    return cResult;
  }
};

export async function createLifeCycleModel(data: any) {
  const oldData = {
    lifeCycleModelDataSet: {
      '@xmlns': 'http://eplca.jrc.ec.europa.eu/ILCD/LifeCycleModel/2017',
      '@xmlns:acme': 'http://acme.com/custom',
      '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@locations': '../ILCDLocations.xml',
      '@version': '1.1',
      '@xsi:schemaLocation':
        'http://eplca.jrc.ec.europa.eu/ILCD/LifeCycleModel/2017 ../../schemas/ILCD_LifeCycleModelDataSet.xsd',
    },
  };
  const newData = genLifeCycleModelJsonOrdered(data.id, data, oldData);
  const teamId = await getTeamIdByUserId();
  const result = await supabase
    .from('lifecyclemodels')
    .insert([
      { id: data.id, json_ordered: newData, json_tg: { xflow: data?.model }, team_id: teamId },
    ])
    .select();
  if (result.data && result.data.length === 1) {
    const refNode = data?.model?.nodes.find((i: any) => i?.data?.quantitativeReference === '1');
    updateLifeCycleModelProcess(data.id, result?.data[0].version, refNode, newData);
  }
  return result;
}

export async function updateLifeCycleModel(data: any) {
  const result = await supabase
    .from('lifecyclemodels')
    .select('id, json')
    .eq('id', data.id)
    .eq('version', data.version);
  if (result.data && result.data.length === 1) {
    const oldData = result.data[0].json;
    const newData = genLifeCycleModelJsonOrdered(data.id, data, oldData);
    const updateResult = await supabase
      .from('lifecyclemodels')
      .update({ json_ordered: newData, json_tg: { xflow: data?.model } })
      .eq('id', data.id)
      .eq('version', data.version)
      .select();
    const refNode = data?.model?.nodes.find((i: any) => i?.data?.quantitativeReference === '1');
    updateLifeCycleModelProcess(data.id, data.version, refNode, newData);
    return updateResult;
  }
  return null;
}

export async function deleteLifeCycleModel(id: string, version: string) {
  const result = await supabase
    .from('lifecyclemodels')
    .delete()
    .eq('id', id)
    .eq('version', version);
  return result;
}

export async function getLifeCycleModelTableAll(
  params: {
    current?: number;
    pageSize?: number;
  },
  sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
  tid: string,
) {
  const sortBy = Object.keys(sort)[0] ?? 'modified_at';
  const orderBy = sort[sortBy] ?? 'descend';

  const selectStr = `
    id,
    json->lifeCycleModelDataSet->lifeCycleModelInformation->dataSetInformation->name,
    json->lifeCycleModelDataSet->lifeCycleModelInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
    json->lifeCycleModelDataSet->lifeCycleModelInformation->dataSetInformation->"common:generalComment",
    version,
    modified_at,
    team_id
  `;

  const tableName = 'lifecyclemodels';

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
      await getILCDClassification('LifeCycleModel', lang, ['all']).then((res) => {
        data = result.data.map((i: any) => {
          try {
            const classifications = jsonToList(i['common:class']);
            const classificationZH = genClassificationZH(classifications, res?.data);

            return {
              key: i.id,
              id: i.id,
              name: genProcessName(i.name ?? {}, lang),
              generalComment: getLangText(i?.['common:generalComment'], lang),
              classification: classificationToString(classificationZH ?? {}),
              version: i?.version,
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
            key: i.id,
            id: i.id,
            name: genProcessName(i.name ?? {}, lang),
            generalComment: getLangText(i?.['common:generalComment'], lang),
            classification: classificationToString(i['common:class'] ?? {}),
            version: i?.version,
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

export async function getLifeCycleModelTablePgroongaSearch(
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
    result = await supabase.rpc('pgroonga_search_lifecyclemodels', {
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
      await getILCDClassification('LifeCycleModel', lang, ['all']).then((res) => {
        data = result.data.map((i: any) => {
          try {
            const dataInfo = i.json?.lifeCycleModelDataSet?.lifeCycleModelInformation;

            const classifications = jsonToList(
              dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
                'common:class'
              ],
            );
            const classificationZH = genClassificationZH(classifications, res?.data);

            return {
              key: i.id,
              id: i.id,
              name: genProcessName(dataInfo?.dataSetInformation?.name ?? {}, lang),
              generalComment: getLangText(
                dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
                lang,
              ),
              classification: classificationToString(classificationZH),
              version: i?.version,
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
          const dataInfo = i.json?.lifeCycleModelDataSet?.lifeCycleModelInformation;

          return {
            key: i.id,
            id: i.id,
            name: genProcessName(dataInfo?.dataSetInformation?.name ?? {}, lang),
            generalComment: getLangText(
              dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
              lang,
            ),
            classification: classificationToString(
              dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
                'common:class'
              ],
            ),
            version: i?.version,
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

export async function getLifeCycleModelDetail(id: string, version: string) {
  const result = await supabase
    .from('lifecyclemodels')
    .select('json, json_tg')
    .eq('id', id)
    .eq('version', version);
  if (result.data && result.data.length > 0) {
    const data = result.data[0];
    return Promise.resolve({
      data: {
        id: id,
        json: data.json,
        json_tg: data?.json_tg,
      },
      success: true,
    });
  }
  return Promise.resolve({
    data: {},
    success: true,
  });
}
