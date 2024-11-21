import {
  classificationToString,
  genClassificationZH,
  getLangText,
  jsonToList,
} from '../general/util';
import { getILCDClassification, getILCDLocationByValues } from '../ilcd/api';

import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/es/table/interface';
import { genProcessJsonOrdered, genProcessName } from './util';

export async function createProcess(data: any) {
  // const newID = v4();
  const oldData = {
    processDataSet: {
      '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
      '@xmlns': 'http://lca.jrc.it/ILCD/Process',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@version': '1.1',
      '@locations': '../ILCDLocations.xml',
      '@xsi:schemaLocation': 'http://lca.jrc.it/ILCD/Process ../../schemas/ILCD_ProcessDataSet.xsd',
    },
  };
  const newData = genProcessJsonOrdered(data.id, data, oldData);
  const result = await supabase
    .from('processes')
    .insert([{ id: data.id, json_ordered: newData }])
    .select();
  return result;
}

export async function updateProcess(data: any) {
  const result = await supabase.from('processes').select('id, json').eq('id', data.id);
  if (result.data && result.data.length === 1) {
    const oldData = result.data[0].json;
    const newData = genProcessJsonOrdered(data.id, data, oldData);
    const updateResult = await supabase
      .from('processes')
      .update({ json_ordered: newData })
      .eq('id', data.id)
      .select();
    return updateResult;
  }
  return null;
}

export async function getProcessTableAll(
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
    json->processDataSet->processInformation->dataSetInformation->name,
    json->processDataSet->processInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
    json->processDataSet->processInformation->dataSetInformation->"common:generalComment",
    json->processDataSet->processInformation->time->>"common:referenceYear",
    json->processDataSet->processInformation->geography->locationOfOperationSupplyOrProduction->>"@location",
    modified_at
  `;

  let result: any = {};
  if (dataSource === 'tg') {
    result = await supabase
      .from('processes')
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
        .from('processes')
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

    const locations: string[] = Array.from(new Set(result.data.map((i: any) => i['@location'])));
    let locationData: any[] = [];
    await getILCDLocationByValues(lang, locations).then((res) => {
      locationData = res.data;
    });

    let data: any[] = [];
    if (lang === 'zh') {
      await getILCDClassification('Process', lang, ['all']).then((res) => {
        data = result.data.map((i: any) => {
          try {
            const classifications = jsonToList(i['common:class']);
            const classificationZH = genClassificationZH(classifications, res?.data);

            const thisLocation = locationData.find((l) => l['@value'] === i['@location']);
            let location = i['@location'];
            if (thisLocation?.['#text']) {
              location = thisLocation['#text'];
            }

            return {
              key: i.id,
              id: i.id,
              lang: lang,
              name: genProcessName(i.name ?? {}, lang),
              generalComment: getLangText(i['common:generalComment'] ?? {}, lang),
              classification: classificationToString(classificationZH ?? {}),
              referenceYear: i['common:referenceYear'] ?? '-',
              location: location ?? '-',
              modifiedAt: new Date(i.modified_at),
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
          const thisLocation = locationData.find((l) => l['@value'] === i['@location']);
          let location = i['@location'];
          if (thisLocation?.['#text']) {
            location = thisLocation['#text'];
          }
          return {
            key: i.id,
            id: i.id,
            lang: lang,
            name: genProcessName(i.name ?? {}, lang),
            generalComment: getLangText(i['common:generalComment'] ?? {}, lang),
            classification: classificationToString(i['common:class'] ?? {}),
            referenceYear: i['common:referenceYear'] ?? '-',
            location: location,
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
              key: i.id,
              id: i.id,
              name: genProcessName(dataInfo?.dataSetInformation?.name ?? {}, lang),
              generalComment: getLangText(
                dataInfo?.dataSetInformation?.['common:generalComment'] ?? {},
                lang,
              ),
              classification: classificationToString(classificationZH),
              referenceYear: dataInfo?.time?.['common:referenceYear'] ?? '-',
              location: location ?? '-',
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
          const dataInfo = i.json?.processDataSet?.processInformation;

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
            referenceYear: dataInfo?.time?.['common:referenceYear'] ?? '-',
            location: location ?? '-',
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

export async function getProcessDetail(id: string) {
  if (id.length > 0) {
    const result = await supabase.from('processes').select('json, modified_at').eq('id', id);
    if (result.data && result.data.length > 0) {
      const data = result.data[0];
      return Promise.resolve({
        data: {
          json: data.json,
          modifiedAt: data?.modified_at,
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

export async function deleteProcess(id: string) {
  const result = await supabase.from('processes').delete().eq('id', id);
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
    (i) => i.exchangeDirection.toUpperCase() === direction.toUpperCase(),
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
