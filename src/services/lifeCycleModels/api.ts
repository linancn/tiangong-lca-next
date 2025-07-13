import schema from '@/pages/LifeCycleModels/lifecyclemodels.json';
import processSchema from '@/pages/Processes/processes_schema.json';
import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';
import { SortOrder } from 'antd/lib/table/interface';
import { getTeamIdByUserId } from '../general/api';
import {
  classificationToString,
  genClassificationZH,
  getLangText,
  getRuleVerification,
  jsonToList,
} from '../general/util';
import { getILCDClassification } from '../ilcd/api';
import { getProcessesByIdsAndVersions } from '../processes/api';
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
    const rule_verification = getRuleVerification(processSchema, newData)?.valid;
    let uResult: any = {};
    const session = await supabase.auth.getSession();
    if (session.data.session) {
      uResult = await supabase.functions.invoke('update_data', {
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
        },
        body: {
          id,
          version,
          table: 'processes',
          data: { json_ordered: newData, rule_verification },
        },
        region: FunctionRegion.UsEast1,
      });
    }
    if (uResult.error) {
      console.log('error', uResult.error);
    }
    return uResult?.data;
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
    const rule_verification = getRuleVerification(processSchema, newData)?.valid;
    const cResult = await supabase
      .from('processes')
      .insert([{ id: id, json_ordered: newData, rule_verification }])
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
  const rule_verification = getRuleVerification(schema, newData)?.valid;
  // const teamId = await getTeamIdByUserId();
  const result = await supabase
    .from('lifecyclemodels')
    .insert([
      { id: data.id, json_ordered: newData, json_tg: { xflow: data?.model }, rule_verification },
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
    const rule_verification = getRuleVerification(schema, newData)?.valid;
    let updateResult: any = {};
    const session = await supabase.auth.getSession();
    if (session.data.session) {
      updateResult = await supabase.functions.invoke('update_data', {
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
        },
        body: {
          id: data.id,
          version: data.version,
          table: 'lifecyclemodels',
          data: { json_ordered: newData, json_tg: { xflow: data?.model }, rule_verification },
        },
        region: FunctionRegion.UsEast1,
      });
    }
    if (updateResult.error) {
      console.log('error', updateResult.error);
    }
    const refNode = data?.model?.nodes.find((i: any) => i?.data?.quantitativeReference === '1');
    updateLifeCycleModelProcess(data.id, data.version, refNode, newData);
    return updateResult?.data;
  }
  return null;
}

export async function updateLifeCycleModelJsonApi(id: string, version: string, data: any) {
  let updateResult: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    updateResult = await supabase.functions.invoke('update_data', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { id, version, table: 'lifecyclemodels', data: { json: data } },
      region: FunctionRegion.UsEast1,
    });
  }
  if (updateResult.error) {
    console.log('error', updateResult.error);
  }
  if (updateResult?.data && updateResult?.data?.length > 0) {
    const refNode = updateResult?.data[0]?.json_tg?.xflow?.nodes?.find(
      (i: any) => i?.data?.quantitativeReference === '1',
    );
    updateLifeCycleModelProcess(id, version, refNode, data);
  }
  return updateResult?.data;
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
  stateCode?: string | number,
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
    if (typeof stateCode === 'number') {
      query = query.eq('state_code', stateCode);
    }
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
          const classifications = jsonToList(i['common:class']);
          return {
            key: i.id,
            id: i.id,
            name: genProcessName(i.name ?? {}, lang),
            generalComment: getLangText(i?.['common:generalComment'], lang),
            classification: classificationToString(classifications),
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
  stateCode?: string | number,
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.rpc(
      'pgroonga_search_lifecyclemodels',
      typeof stateCode === 'number'
        ? {
            query_text: queryText,
            filter_condition: filterCondition,
            page_size: params.pageSize ?? 10,
            page_current: params.current ?? 1,
            data_source: dataSource,
            this_user_id: session.data.session.user?.id,
            state_code: stateCode,
          }
        : {
            query_text: queryText,
            filter_condition: filterCondition,
            page_size: params.pageSize ?? 10,
            page_current: params.current ?? 1,
            data_source: dataSource,
            this_user_id: session.data.session.user?.id,
          },
    );
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
          const classifications = jsonToList(
            dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
              'common:class'
            ],
          );
          return {
            key: i.id,
            id: i.id,
            name: genProcessName(dataInfo?.dataSetInformation?.name ?? {}, lang),
            generalComment: getLangText(
              dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
              lang,
            ),
            classification: classificationToString(classifications),
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
export async function lifeCycleModel_hybrid_search(
  params: {
    current?: number;
    pageSize?: number;
  },
  // sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
  queryText: string,
  filterCondition: any,
  stateCode?: string | number,
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('lifeCycleModel_hybrid_search', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body:
        typeof stateCode === 'number'
          ? { query: queryText, filter: filterCondition, state_code: stateCode }
          : { query: queryText, filter: filterCondition },
      region: FunctionRegion.UsEast1,
    });
  }
  if (result.error) {
    console.log('error', result.error);
  }
  if (result.data?.data) {
    if (result.data?.data.length === 0) {
      return Promise.resolve({
        data: [],
        success: true,
      });
    }
    const resultData = result.data.data;
    const totalCount = resultData.total_count;

    let data: any[] = [];
    if (lang === 'zh') {
      await getILCDClassification('LifeCycleModel', lang, ['all']).then((res) => {
        data = resultData.map((i: any) => {
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
      data = resultData.map((i: any) => {
        try {
          const dataInfo = i.json?.lifeCycleModelDataSet?.lifeCycleModelInformation;
          const classifications = jsonToList(
            dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
              'common:class'
            ],
          );
          return {
            key: i.id,
            id: i.id,
            name: genProcessName(dataInfo?.dataSetInformation?.name ?? {}, lang),
            generalComment: getLangText(
              dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
              lang,
            ),
            classification: classificationToString(classifications),
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
export async function getLifeCyclesByIds(ids: string[]) {
  const result = await supabase
    .from('lifecyclemodels')
    .select(
      `
      id,
    json->lifeCycleModelDataSet->lifeCycleModelInformation->dataSetInformation->name,
    json->lifeCycleModelDataSet->lifeCycleModelInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
    json->lifeCycleModelDataSet->lifeCycleModelInformation->dataSetInformation->"common:generalComment",
    version,
    modified_at,
    team_id
    `,
    )
    .in('id', ids);
  return result;
}

export async function getLifeCycleModelDetail(
  id: string,
  version: string,
  setIsFromLifeCycle = false,
): Promise<
  | {
      data: {
        id: string;
        version: string;
        json: any;
        json_tg: any;
        stateCode: number;
        ruleVerification: any;
      };
      success: true;
    }
  | {
      data: object;
      success: false;
    }
> {
  const result = await supabase
    .from('lifecyclemodels')
    .select('json, json_tg,state_code,rule_verification,team_id')
    .eq('id', id)
    .eq('version', version);
  if (result.data && result.data.length > 0) {
    const data = result.data[0];
    if (setIsFromLifeCycle) {
      let procressIds: string[] = [];
      let procressVersion: string[] = [];
      data?.json_tg?.xflow?.nodes?.forEach((node: any) => {
        procressIds.push(node?.data?.id);
        procressVersion.push(node?.data?.version);
      });

      if (procressIds.length > 0) {
        const [procresses, models] = await Promise.all([
          getProcessesByIdsAndVersions(procressIds, procressVersion),
          getLifeCyclesByIds(procressIds),
        ]);

        data?.json_tg?.xflow?.nodes?.forEach((node: any) => {
          const model = models?.data?.find(
            (model: any) => model?.id === node?.data?.id && model?.version === node?.data?.version,
          );
          if (model) {
            node.isFromLifeCycle = true;
          } else {
            node.isFromLifeCycle = false;
          }
          const procress = procresses?.data?.find(
            (procress: any) =>
              procress?.id === node?.data?.id && procress?.version === node?.data?.version,
          );
          if (procress?.user_id === sessionStorage.getItem('userId')) {
            node.isMyProcess = true;
          } else {
            node.isMyProcess = false;
          }
        });
      }
    }

    return Promise.resolve({
      data: {
        id: id,
        version: version,
        json: data.json,
        json_tg: data?.json_tg,
        stateCode: data?.state_code,
        ruleVerification: data?.rule_verification,
        teamId: data?.team_id,
      },
      success: true,
    });
  }
  return Promise.resolve({
    data: {},
    success: false,
  });
}
