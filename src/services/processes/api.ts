import schema from '@/pages/Processes/processes_schema.json';
import { getLifeCyclesByIds, getSubmodelsByProcessIds } from '@/services/lifeCycleModels/api';
import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';
import { SortOrder } from 'antd/es/table/interface';
import { getTeamIdByUserId } from '../general/api';
import {
  classificationToString,
  genClassificationZH,
  getLangText,
  getRuleVerification,
  jsonToList,
} from '../general/util';
import { getILCDClassification, getILCDLocationByValues } from '../ilcd/api';
import { genProcessJsonOrdered, genProcessName } from './util';

const selectStr4Table = `
    id,
    json->processDataSet->processInformation->dataSetInformation->name,
    json->processDataSet->processInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
    json->processDataSet->processInformation->dataSetInformation->"common:generalComment",
    json->processDataSet->processInformation->time->>"common:referenceYear",
    json->processDataSet->modellingAndValidation->LCIMethodAndAllocation->typeOfDataSet,
    json->processDataSet->processInformation->geography->locationOfOperationSupplyOrProduction->>"@location",
    version,
    modified_at,
    team_id
  `;

export async function createProcess(id: string, data: any) {
  const newData = genProcessJsonOrdered(id, data);
  const rule_verification = getRuleVerification(schema, newData)?.valid;
  // const teamId = await getTeamIdByUserId();
  const result = await supabase
    .from('processes')
    .insert([{ id: id, json_ordered: newData, rule_verification }])
    .select();
  return result;
}

export async function updateProcess(id: string, version: string, data: any) {
  const newData = genProcessJsonOrdered(id, data);
  const rule_verification = getRuleVerification(schema, newData)?.valid;
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('update_data', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { id, version, table: 'processes', data: { json_ordered: newData, rule_verification } },
      region: FunctionRegion.UsEast1,
    });
  }
  if (result.error) {
    console.log('error', result.error);
  }
  return result?.data;
}

export async function updateProcessApi(id: string, version: string, data: any) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('update_data', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { id, version, table: 'processes', data },
      region: FunctionRegion.UsEast1,
    });
  }
  if (result.error) {
    console.log('error', result.error);
  }
  return result?.data;
}

export async function getProcessTableAll(
  params: {
    current?: number;
    pageSize?: number;
  },
  sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
  tid: string | [],
  stateCode?: string | number,
  typeOfDataSet?: string,
) {
  const sortBy = Object.keys(sort)[0] ?? 'modified_at';
  const orderBy = sort[sortBy] ?? 'descend';

  const tableName = 'processes';

  let query = supabase
    .from(tableName)
    .select(selectStr4Table, { count: 'exact' })
    .order(sortBy, { ascending: orderBy === 'ascend' })
    .range(
      ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
      (params.current ?? 1) * (params.pageSize ?? 10) - 1,
    );

  if (typeOfDataSet && typeOfDataSet !== 'all') {
    query = query.eq(
      'json_ordered->processDataSet->modellingAndValidation->LCIMethodAndAllocation->>typeOfDataSet',
      typeOfDataSet,
    );
  }
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
      return { data: [], success: false };
    }
  } else if (dataSource === 'te') {
    const teamId = await getTeamIdByUserId();
    if (teamId) {
      query = query.eq('team_id', teamId);
    } else {
      return { data: [], success: true };
    }
  }

  const result = await query;

  if (result?.error) {
    console.error('error', result?.error);
    return { data: [], success: false, error: result?.error };
  }

  if (!result?.data || result?.data.length === 0) {
    return { data: [], success: true };
  }

  const locations = Array.from(new Set(result.data.map((i: any) => i['@location'])));
  const processIds = result.data.map((i: any) => i.id);
  const [locationRes, classificationRes, lifeCycleResult] = await Promise.all([
    getILCDLocationByValues(lang, locations),
    lang === 'zh' ? getILCDClassification('Process', lang, ['all']) : Promise.resolve(null),
    getSubmodelsByProcessIds(processIds),
  ]);
  const locationDataArr = locationRes.data || [];
  const locationMap = new Map(locationDataArr.map((l: any) => [l['@value'], l['#text']]));
  const classificationData = classificationRes?.data;

  let data: any[] = result.data.map((i: any) => {
    try {
      const classifications = jsonToList(i['common:class']);
      let classification;
      if (lang === 'zh') {
        const classificationZH = genClassificationZH(classifications, classificationData);
        classification = classificationToString(classificationZH ?? {});
      } else {
        classification = classificationToString(classifications);
      }
      let location = i['@location'];
      if (locationMap.has(location)) {
        location = locationMap.get(location);
      }
      return {
        key: i.id + ':' + i.version,
        id: i.id,
        version: i.version,
        lang: lang,
        name: genProcessName(i.name ?? {}, lang),
        generalComment: getLangText(i['common:generalComment'] ?? {}, lang),
        classification,
        typeOfDataSet: i.typeOfDataSet ?? '-',
        referenceYear: i['common:referenceYear'] ?? '-',
        location: location ?? '-',
        modifiedAt: new Date(i.modified_at),
        teamId: i?.team_id,
      };
    } catch (e) {
      console.error(e);
      return { id: i.id };
    }
  });

  // 生命周期标记
  if (lifeCycleResult.data) {
    data.forEach((i) => {
      if (lifeCycleResult.data.hasOwnProperty(i.id)) {
        const [modelId, modelVersion] = lifeCycleResult.data[i.id].split('_');
        i.modelData = {
          id: modelId,
          version: modelVersion,
        };
      }
    });
  }

  return {
    data,
    page: params?.current ?? 1,
    success: true,
    total: result?.count ?? 0,
  };
}

export async function getConnectableProcessesTable(
  params: {
    current?: number;
    pageSize?: number;
  },
  sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
  tid: string | [],
  portId: string,
  flowVersion: string,
) {
  const sortBy = Object.keys(sort)[0] ?? 'modified_at';
  const orderBy = sort[sortBy] ?? 'descend';
  const direction = portId.split(':')[0];
  const flowId = portId.split(':').pop();
  if (!flowId) {
    return { data: [], success: true };
  }

  const selectStr = `
      id,
      json->processDataSet->processInformation->dataSetInformation->name,
      json->processDataSet->processInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
      json->processDataSet->processInformation->dataSetInformation->"common:generalComment",
      json->processDataSet->processInformation->time->>"common:referenceYear",
      json->processDataSet->modellingAndValidation->LCIMethodAndAllocation->typeOfDataSet,
      json->processDataSet->processInformation->geography->locationOfOperationSupplyOrProduction->>"@location",
      json->processDataSet->exchanges->exchange,
      version,
      modified_at,
      team_id
    `;

  const tableName = 'processes';

  let query = supabase
    .from(tableName)
    .select(selectStr, { count: 'exact' })
    .order(sortBy, { ascending: orderBy === 'ascend' });
  // .range(
  //   ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
  //   (params.current ?? 1) * (params.pageSize ?? 10) - 1,
  // );

  const baseFlowRef = flowVersion
    ? { '@refObjectId': flowId, '@version': flowVersion }
    : { '@refObjectId': flowId };

  query = query.filter(
    'json->processDataSet->exchanges->exchange',
    'cs',
    JSON.stringify([{ referenceToFlowDataSet: baseFlowRef }]),
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
      return { data: [], success: false };
    }
  } else if (dataSource === 'te') {
    const teamId = await getTeamIdByUserId();
    if (teamId) {
      query = query.eq('team_id', teamId);
    } else {
      return { data: [], success: true };
    }
  }

  const result = await query;

  if (result?.error) {
    console.error('error', result?.error);
    return { data: [], success: false, error: result?.error };
  }

  if (!result?.data || result?.data.length === 0) {
    return { data: [], success: true };
  }
  const exchangeDirection = direction.toLowerCase() === 'input' ? 'output' : 'input';
  const filteredData = result.data.filter((i: any) =>
    i.exchange.find(
      (j: any) =>
        j?.exchangeDirection?.toLowerCase() === exchangeDirection &&
        j?.referenceToFlowDataSet?.['@refObjectId'] === flowId &&
        (flowVersion ? j?.referenceToFlowDataSet?.['@version'] === flowVersion : true),
    ),
  );
  result.data = [...filteredData];

  const locations = Array.from(new Set(result.data.map((i: any) => i['@location'])));
  const processIds = result.data.map((i: any) => i.id);
  const [locationRes, classificationRes, lifeCycleResult] = await Promise.all([
    getILCDLocationByValues(lang, locations),
    lang === 'zh' ? getILCDClassification('Process', lang, ['all']) : Promise.resolve(null),
    getLifeCyclesByIds(processIds),
  ]);
  const locationDataArr = locationRes.data || [];
  const locationMap = new Map(locationDataArr.map((l: any) => [l['@value'], l['#text']]));
  const classificationData = classificationRes?.data;

  let data: any[] = result.data.map((i: any) => {
    try {
      const classifications = jsonToList(i['common:class']);
      let classification;
      if (lang === 'zh') {
        const classificationZH = genClassificationZH(classifications, classificationData);
        classification = classificationToString(classificationZH ?? {});
      } else {
        classification = classificationToString(classifications);
      }
      let location = i['@location'];
      if (locationMap.has(location)) {
        location = locationMap.get(location);
      }
      return {
        key: i.id + ':' + i.version,
        id: i.id,
        version: i.version,
        lang: lang,
        name: genProcessName(i.name ?? {}, lang),
        generalComment: getLangText(i['common:generalComment'] ?? {}, lang),
        classification,
        typeOfDataSet: i.typeOfDataSet ?? '-',
        referenceYear: i['common:referenceYear'] ?? '-',
        location: location ?? '-',
        modifiedAt: new Date(i.modified_at),
        teamId: i?.team_id,
      };
    } catch (e) {
      console.error(e);
      return { id: i.id };
    }
  });

  if (lifeCycleResult.data && lifeCycleResult.data.length > 0) {
    const lifeCycleMap = new Map(
      lifeCycleResult.data.map((i: any) => [i.id + ':' + i.version, true]),
    );
    data.forEach((i) => {
      if (lifeCycleMap.has(i.id + ':' + i.version)) {
        i.isFromLifeCycle = true;
      }
    });
  }

  return {
    data,
    // page: params?.current ?? 1,
    success: true,
    // total: result?.count ?? 0,
  };
}
// export async function getProcessTableAllByTeam(
//   params: {
//     current?: number;
//     pageSize?: number;
//   },
//   sort: Record<string, SortOrder>,
//   lang: string,
//   teamId: string[],
// ) {
//   console.log('teamId', teamId);
//   const sortBy = Object.keys(sort)[0] ?? 'modified_at';
//   const orderBy = sort[sortBy] ?? 'descend';

//   const selectStr = `
//     id,
//     json->processDataSet->processInformation->dataSetInformation->name,
//     json->processDataSet->processInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
//     json->processDataSet->processInformation->dataSetInformation->"common:generalComment",
//     json->processDataSet->processInformation->time->>"common:referenceYear",
//     json->processDataSet->processInformation->geography->locationOfOperationSupplyOrProduction->>"@location",
//     version,
//     modified_at
//   `;

//   const result = await supabase
//     .from('processes')
//     .select(selectStr, { count: 'exact' })
//     .eq('state_code', 100)
//     .in('user_id', teamId)
//     .order(sortBy, { ascending: orderBy === 'ascend' })
//     .range(
//       ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
//       (params.current ?? 1) * (params.pageSize ?? 10) - 1,
//     );

//   if (result.error) {
//     console.log('error', result.error);
//   }

//   if (result.data) {
//     if (result.data.length === 0) {
//       return Promise.resolve({
//         data: [],
//         success: true,
//       });
//     }

//     const locations: string[] = Array.from(new Set(result.data.map((i: any) => i['@location'])));
//     let locationData: any[] = [];
//     await getILCDLocationByValues(lang, locations).then((res) => {
//       locationData = res.data;
//     });

//     let data: any[] = [];
//     if (lang === 'zh') {
//       await getILCDClassification('Process', lang, ['all']).then((res) => {
//         data = result.data.map((i: any) => {
//           try {
//             const classifications = jsonToList(i['common:class']);
//             const classificationZH = genClassificationZH(classifications, res?.data);

//             const thisLocation = locationData.find((l) => l['@value'] === i['@location']);
//             let location = i['@location'];
//             if (thisLocation?.['#text']) {
//               location = thisLocation['#text'];
//             }

//             return {
//               key: i.id + ':' + i.version,
//               id: i.id,
//               version: i.version,
//               lang: lang,
//               name: genProcessName(i.name ?? {}, lang),
//               generalComment: getLangText(i['common:generalComment'] ?? {}, lang),
//               classification: classificationToString(classificationZH ?? {}),
//               referenceYear: i['common:referenceYear'] ?? '-',
//               location: location ?? '-',
//               modifiedAt: new Date(i.modified_at),
//             };
//           } catch (e) {
//             console.error(e);
//             return {
//               id: i.id,
//             };
//           }
//         });
//       });
//     } else {
//       data = result.data.map((i: any) => {
//         try {
//           const thisLocation = locationData.find((l) => l['@value'] === i['@location']);
//           let location = i['@location'];
//           if (thisLocation?.['#text']) {
//             location = thisLocation['#text'];
//           }
//           return {
//             key: i.id + ':' + i.version,
//             id: i.id,
//             version: i.version,
//             lang: lang,
//             name: genProcessName(i.name ?? {}, lang),
//             generalComment: getLangText(i['common:generalComment'] ?? {}, lang),
//             classification: classificationToString(i['common:class'] ?? {}),
//             referenceYear: i['common:referenceYear'] ?? '-',
//             location: location,
//             modifiedAt: new Date(i.modified_at),
//           };
//         } catch (e) {
//           console.error(e);
//           return {
//             id: i.id,
//           };
//         }
//       });
//     }

//     return Promise.resolve({
//       data: data,
//       page: params.current ?? 1,
//       success: true,
//       total: result.count ?? 0,
//     });
//   }
//   return Promise.resolve({
//     data: [],
//     success: false,
//   });
// }

export async function getProcessTablePgroongaSearch(
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
  typeOfDataSet?: string,
) {
  // const time_start = new Date();
  let result: any;

  const session = await supabase.auth.getSession();
  if (session.data.session) {
    const requestParams: { [key: string]: any } = {
      query_text: queryText,
      filter_condition: filterCondition,
      page_size: params.pageSize ?? 10,
      page_current: params.current ?? 1,
      data_source: dataSource,
      this_user_id: session.data.session.user?.id,
    };
    if (typeof stateCode === 'number') {
      requestParams['state_code'] = stateCode;
    }
    if (typeOfDataSet && typeOfDataSet !== 'all') {
      requestParams['type_of_data_set'] = typeOfDataSet;
    }
    result = await supabase.rpc('pgroonga_search_processes', requestParams);
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
          (i: any) =>
            i.json?.processDataSet?.processInformation?.geography
              ?.locationOfOperationSupplyOrProduction?.['@location'],
        ),
      ),
    );
    let locationData: any[] = [];
    await getILCDLocationByValues(lang, locations).then((res) => {
      locationData = res.data;
    });

    let data: any[] = [];
    if (lang === 'zh') {
      await getILCDClassification('Process', lang, ['all']).then((res) => {
        data = result.data.map((i: any) => {
          try {
            const dataInfo = i.json?.processDataSet?.processInformation;

            const thisLocation = locationData.find(
              (l) =>
                l['@value'] ===
                dataInfo?.geography?.locationOfOperationSupplyOrProduction?.['@location'],
            );
            let location = i['@location'];
            if (thisLocation?.['#text']) {
              location = thisLocation['#text'];
            }

            const classifications = jsonToList(
              dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
                'common:class'
              ],
            );
            const classificationZH = genClassificationZH(classifications, res?.data);

            return {
              key: i.id + ':' + i.version,
              id: i.id,
              name: genProcessName(dataInfo?.dataSetInformation?.name ?? {}, lang),
              generalComment: getLangText(
                dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
                lang,
              ),
              classification: classificationToString(classificationZH),
              referenceYear: dataInfo?.time?.['common:referenceYear'] ?? '-',
              location: location ?? '-',
              version: i.version,
              typeOfDataSet:
                i?.json?.processDataSet?.modellingAndValidation?.LCIMethodAndAllocation
                  ?.typeOfDataSet ?? '-',
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
          const dataInfo = i.json?.processDataSet?.processInformation;
          const classifications = jsonToList(
            dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
              'common:class'
            ],
          );
          const thisLocation = locationData.find(
            (l) =>
              l['@value'] ===
              dataInfo?.geography?.locationOfOperationSupplyOrProduction?.['@location'],
          );
          let location = dataInfo?.geography?.locationOfOperationSupplyOrProduction?.['@location'];
          if (thisLocation?.['#text']) {
            location = thisLocation['#text'];
          }

          return {
            key: i.id + ':' + i.version,
            id: i.id,
            name: genProcessName(dataInfo?.dataSetInformation?.name ?? {}, lang),
            generalComment: getLangText(
              dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
              lang,
            ),
            classification: classificationToString(classifications),
            referenceYear: dataInfo?.time?.['common:referenceYear'] ?? '-',
            location: location ?? '-',
            version: i.version,
            typeOfDataSet:
              i?.json?.processDataSet?.modellingAndValidation?.LCIMethodAndAllocation
                ?.typeOfDataSet ?? '-',
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

    return {
      data,
      page: params.current ?? 1,
      success: true,
      total: totalCount,
    };
  }
}
export async function process_hybrid_search(
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
  typeOfDataSet?: string,
) {
  let result: any = {};
  const bodyParams: { [key: string]: any } = { query: queryText, filter: filterCondition };
  if (typeof stateCode === 'number') {
    bodyParams['state_code'] = stateCode;
  }
  if (typeOfDataSet && typeOfDataSet !== 'all') {
    bodyParams['type_of_data_set'] = typeOfDataSet;
  }
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('process_hybrid_search', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: bodyParams,
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

    const locations: string[] = Array.from(
      new Set(
        resultData.map(
          (i: any) =>
            i.json?.processDataSet?.processInformation?.geography
              ?.locationOfOperationSupplyOrProduction?.['@location'],
        ),
      ),
    );
    let locationData: any[] = [];
    await getILCDLocationByValues(lang, locations).then((res) => {
      locationData = res.data;
    });

    let data: any[] = [];
    if (lang === 'zh') {
      await getILCDClassification('Process', lang, ['all']).then((res) => {
        data = resultData.map((i: any) => {
          try {
            const dataInfo = i.json?.processDataSet?.processInformation;

            const thisLocation = locationData.find(
              (l) =>
                l['@value'] ===
                dataInfo?.geography?.locationOfOperationSupplyOrProduction?.['@location'],
            );
            let location = i['@location'];
            if (thisLocation?.['#text']) {
              location = thisLocation['#text'];
            }

            const classifications = jsonToList(
              dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
                'common:class'
              ],
            );
            const classificationZH = genClassificationZH(classifications, res?.data);

            return {
              key: i.id + ':' + i.version,
              id: i.id,
              name: genProcessName(dataInfo?.dataSetInformation?.name ?? {}, lang),
              generalComment: getLangText(
                dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
                lang,
              ),
              classification: classificationToString(classificationZH),
              referenceYear: dataInfo?.time?.['common:referenceYear'] ?? '-',
              location: location ?? '-',
              version: i.version,
              typeOfDataSet:
                i?.json?.processDataSet?.modellingAndValidation?.LCIMethodAndAllocation
                  ?.typeOfDataSet ?? '-',
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
          const dataInfo = i.json?.processDataSet?.processInformation;
          const classifications = jsonToList(
            dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
              'common:class'
            ],
          );
          const thisLocation = locationData.find(
            (l) =>
              l['@value'] ===
              dataInfo?.geography?.locationOfOperationSupplyOrProduction?.['@location'],
          );
          let location = dataInfo?.geography?.locationOfOperationSupplyOrProduction?.['@location'];
          if (thisLocation?.['#text']) {
            location = thisLocation['#text'];
          }

          return {
            key: i.id + ':' + i.version,
            id: i.id,
            name: genProcessName(dataInfo?.dataSetInformation?.name ?? {}, lang),
            generalComment: getLangText(
              dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
              lang,
            ),
            classification: classificationToString(classifications),
            referenceYear: dataInfo?.time?.['common:referenceYear'] ?? '-',
            location: location ?? '-',
            version: i.version,
            typeOfDataSet:
              i?.json?.processDataSet?.modellingAndValidation?.LCIMethodAndAllocation
                ?.typeOfDataSet ?? '-',
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

export async function getProcessDetailByIdAndVersion(data: { id: string; version: string }[]) {
  if (data && data.length > 0) {
    const orConditions = data.map((k) => `and(id.eq.${k.id},version.eq.${k.version})`).join(',');

    const result = await supabase
      .from('processes')
      .select('id,json,version, modified_at')
      .or(orConditions);

    return Promise.resolve({
      data: result,
      success: true,
    });
  }
  return Promise.resolve({
    data: null,
    success: true,
  });
}

export async function getProcessDetail(id: string, version: string) {
  let result: any = {};
  if (id && id.length === 36) {
    if (version && version.length === 9) {
      result = await supabase
        .from('processes')
        .select('json,version, modified_at,state_code,rule_verification,team_id,reviews')
        .eq('id', id)
        .eq('version', version);
    } else {
      result = await supabase
        .from('processes')
        .select('json,version, modified_at,state_code,rule_verification,team_id,reviews')
        .eq('id', id)
        .order('version', { ascending: false })
        .range(0, 0);
    }
    if (result?.data && result.data.length > 0) {
      const data = result.data[0];
      return Promise.resolve({
        data: {
          id: id,
          version: data.version,
          json: data.json,
          modifiedAt: data?.modified_at,
          stateCode: data?.state_code,
          ruleVerification: data?.rule_verification,
          teamId: data?.team_id,
          reviews: data?.reviews,
        },
        success: true,
      });
    }
  }
  return Promise.resolve({
    data: null,
    success: true,
  });
}

export async function deleteProcess(id: string, version: string) {
  const result = await supabase.from('processes').delete().eq('id', id).eq('version', version);
  return result;
}

export async function getProcessExchange(
  exchangeData: any[],
  direction: string,
  params: {
    current?: number;
    pageSize?: number;
  },
) {
  const data = exchangeData.filter(
    (i) => i?.exchangeDirection.toUpperCase() === direction.toUpperCase(),
  );
  const start = ((params.current ?? 1) - 1) * (params.pageSize ?? 10);
  const end = start + (params.pageSize ?? 10);
  const paginatedData = data.slice(start, end);
  return Promise.resolve({
    data: paginatedData,
    page: params.current ?? 1,
    success: true,
    total: data.length ?? 0,
  });
}

export async function getProcessesByIdsAndVersions(ids: string[], versions: string[]) {
  const result = await supabase
    .from('processes')
    .select('id,json,version, modified_at,user_id')
    .in('id', ids)
    .in('version', versions);
  return result;
}

export async function getProcessDetailByIdsAndVersion(ids: string[], version: string) {
  if (ids && ids.length > 0) {
    const result = await supabase
      .from('processes')
      .select('id,json,version, modified_at')
      .eq('version', version)
      .in('id', ids);

    return Promise.resolve({
      data: result.data ?? [],
      success: true,
    });
  }
  return Promise.resolve({
    data: [],
    success: true,
  });
}

export async function getProcessesByIdsAndVersion(ids: string[], version: string, lang: string) {
  const result = await supabase
    .from('processes')
    .select(selectStr4Table)
    .eq('version', version)
    .in('id', ids);

  const data: any[] =
    result?.data?.map((i: any) => {
      return {
        key: i.id + ':' + i.version,
        id: i.id,
        version: i.version,
        lang: lang,
        name: genProcessName(i.name ?? {}, lang),
        generalComment: getLangText(i['common:generalComment'] ?? {}, lang),
        // classification,
        typeOfDataSet: i.typeOfDataSet ?? '-',
        referenceYear: i['common:referenceYear'] ?? '-',
        location: location ?? '-',
        modifiedAt: new Date(i.modified_at),
        teamId: i?.team_id,
      };
    }) ?? [];

  return {
    data: data,
    success: true,
    page: 1,
    total: result.data?.length ?? 0,
  };
}

export async function validateProcessesByIdAndVersion(id: string, version: string) {
  const resultVersion = await supabase
    .from('processes')
    .select('id,version')
    .eq('id', id)
    .eq('version', version);
  if (resultVersion?.data && resultVersion.data.length > 0) {
    return true;
  }
  // const result = await supabase.from('processes').select('id,version').eq('id', id);
  // if (result?.data && result.data.length > 0) {
  //   return true;
  // }
  return false;
}
