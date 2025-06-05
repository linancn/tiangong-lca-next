import schema from '@/pages/Processes/processes_schema.json';
import { getLifeCyclesByIds } from '@/services/lifeCycleModels/api';
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

export async function createProcess(id: string, data: any) {
  const newData = genProcessJsonOrdered(id, data);
  const rule_verification = getRuleVerification(schema, newData);
  // const teamId = await getTeamIdByUserId();
  const result = await supabase
    .from('processes')
    .insert([{ id: id, json_ordered: newData, rule_verification }])
    .select();
  return result;
}

export async function updateProcess(id: string, version: string, data: any) {
  const newData = genProcessJsonOrdered(id, data);
  const rule_verification = getRuleVerification(schema, newData);
  const updateResult = await supabase
    .from('processes')
    .update({ json_ordered: newData, rule_verification })
    .eq('id', id)
    .eq('version', version)
    .select();
  return updateResult;
}

export async function updateProcessJsonApi(id: string, version: string, data: any) {
  const newData = genProcessJsonOrdered(id, data);
  const updateResult = await supabase
    .from('processes')
    .update({ json: newData })
    .eq('id', id)
    .eq('version', version)
    .select();
  return updateResult;
}

export async function updateProcessStateCode(
  id: string,
  version: string,
  reviewId: string,
  stateCode: number,
) {
  const updateResult = await supabase
    .from('processes')
    .update({ state_code: stateCode, review_id: reviewId })
    .eq('id', id)
    .eq('version', version)
    .select('state_code');
  return updateResult;
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
) {
  const sortBy = Object.keys(sort)[0] ?? 'modified_at';
  const orderBy = sort[sortBy] ?? 'descend';

  const selectStr = `
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

  const tableName = 'processes';

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

  if (result?.error) {
    console.log('error', result?.error);
  }

  if (result?.data) {
    if (result?.data.length === 0) {
      return Promise.resolve({
        data: [],
        success: true,
      });
    }

    const locations: string[] = Array.from(new Set(result?.data.map((i: any) => i['@location'])));
    let locationData: any[] = [];
    await getILCDLocationByValues(lang, locations).then((res) => {
      locationData = res.data;
    });

    let data: any[] = [];
    if (lang === 'zh') {
      await getILCDClassification('Process', lang, ['all']).then((res) => {
        data = result?.data.map((i: any) => {
          try {
            const classifications = jsonToList(i['common:class']);
            const classificationZH = genClassificationZH(classifications, res?.data);

            const thisLocation = locationData.find((l) => l['@value'] === i['@location']);
            let location = i['@location'];
            if (thisLocation?.['#text']) {
              location = thisLocation['#text'];
            }

            return {
              key: i.id + ':' + i.version,
              id: i.id,
              version: i.version,
              lang: lang,
              name: genProcessName(i.name ?? {}, lang),
              generalComment: getLangText(i['common:generalComment'] ?? {}, lang),
              classification: classificationToString(classificationZH ?? {}),
              typeOfDataSet: i.typeOfDataSet ?? '-',
              referenceYear: i['common:referenceYear'] ?? '-',
              location: location ?? '-',
              modifiedAt: new Date(i.modified_at),
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
      data = result?.data?.map((i: any) => {
        try {
          const classifications = jsonToList(i['common:class']);
          const thisLocation = locationData.find((l) => l['@value'] === i['@location']);
          let location = i['@location'];
          if (thisLocation?.['#text']) {
            location = thisLocation['#text'];
          }
          return {
            key: i.id + ':' + i.version,
            id: i.id,
            version: i.version,
            lang: lang,
            name: genProcessName(i.name ?? {}, lang),
            generalComment: getLangText(i['common:generalComment'] ?? {}, lang),
            classification: classificationToString(classifications),
            typeOfDataSet: i.typeOfDataSet ?? '-',
            referenceYear: i['common:referenceYear'] ?? '-',
            location: location,
            modifiedAt: new Date(i.modified_at),
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

    const processIds = data.map((i) => i.id);

    const lifeCycleResult = await getLifeCyclesByIds(processIds);
    if (lifeCycleResult.data && lifeCycleResult.data.length > 0) {
      lifeCycleResult.data.forEach((i) => {
        const process = data.find((j) => j.id === i.id && j.version === i.version);
        if (process) {
          process.isFromLifeCycle = true;
        }
      });
    }

    return Promise.resolve({
      data: data,
      page: params?.current ?? 1,
      success: true,
      total: result?.count ?? 0,
    });
  }
  return Promise.resolve({
    data: [],
    success: false,
  });
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
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.rpc('pgroonga_search_processes', {
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
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('process_hybrid_search', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { query: queryText, filter: filterCondition },
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
  if (data && data.length) {
    const ids = data.map((item) => item.id);

    const resultByIds = await supabase
      .from('processes')
      .select('id,json,version, modified_at')
      .in('id', ids);

    if (resultByIds?.data && resultByIds.data.length > 0) {
      const result = resultByIds.data.filter((i) => {
        const target = data.find((j) => j.id === i.id) || { id: '', version: '' };
        return target.version === i.version;
      });

      return Promise.resolve({
        data: result,
        success: true,
      });
    }
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
        .select('json,version, modified_at,state_code,rule_verification')
        .eq('id', id)
        .eq('version', version);
    } else {
      result = await supabase
        .from('processes')
        .select('json,version, modified_at,state_code,rule_verification')
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
