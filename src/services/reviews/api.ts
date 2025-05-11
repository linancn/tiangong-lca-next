import { supabase } from '@/services/supabase';
import {
  classificationToString,
  genClassificationZH,
  getLangText,
  jsonToList,
} from '../general/util';
import { getILCDClassification, getILCDLocationByValues } from '../ilcd/api';
import { getLifeCyclesByIds } from '../lifeCycleModels/api';
import { genProcessName } from '../processes/util';
export async function addReviewsApi(id: string, data_id: string, data_version: string) {
  const { error } = await supabase
    .from('reviews')
    .insert({
      id: id,
      data_id: data_id,
      data_version: data_version,
      state_code: 0,
    })
    .select();
  return { error };
}

export async function updateReviewApi(reviewIds: React.Key[], data: any) {
  let query = supabase.from('reviews').update(data).in('id', reviewIds).select();
  const result = await query;
  return result;
}

export async function getReviewsApi(
  params: { pageSize: number; current: number },
  sort: any,
  type: 'unassigned' | 'assigned' | 'review',
  lang: string,
) {
  const sortBy = Object.keys(sort)[0] ?? 'modified_at';
  const orderBy = sort[sortBy] ?? 'descend';
  let query = supabase
    .from('reviews')
    .select(
      ` 
            *,
            processes!inner(
                 id,
                json->processDataSet->processInformation->dataSetInformation->name,
                json->processDataSet->processInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
                json->processDataSet->processInformation->dataSetInformation->"common:generalComment",
                json->processDataSet->processInformation->time->>"common:referenceYear",
                json->processDataSet->processInformation->geography->locationOfOperationSupplyOrProduction->>"@location",
                version,
                modified_at,
                team_id
            )
        `,
      { count: 'exact' },
    )
    .order(sortBy, { ascending: orderBy === 'ascend' })
    .range(
      ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
      (params.current ?? 1) * (params.pageSize ?? 10) - 1,
    );
  if (type === 'unassigned') {
    query = query.eq('state_code', 0);
  }
  if (type === 'assigned') {
    query = query.eq('state_code', 1);
  }
  if (type === 'review') {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;
    if (userId) {
      query = query.filter('reviewer_id', 'cs', `[${JSON.stringify(userId)}]`).eq('state_code', 1);
    }
  }
  const result = await query;

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
        data = result?.data?.map((i: any) => {
          try {
            const classifications = jsonToList(i?.processes['common:class']);
            const classificationZH = genClassificationZH(classifications, res?.data);

            const thisLocation = locationData.find(
              (l) => l['@value'] === i?.processes['@location'],
            );
            let location = i?.processes['@location'];
            if (thisLocation?.['#text']) {
              location = thisLocation['#text'];
            }

            return {
              ...i,
              modifiedAt: new Date(i?.modified_at),
              processes: {
                key: i?.processes.id + ':' + i?.processes.version,
                id: i?.processes.id,
                version: i?.processes.version,
                lang: lang,
                name: genProcessName(i?.processes.name ?? {}, lang),
                generalComment: getLangText(i?.processes['common:generalComment'] ?? {}, lang),
                classification: classificationToString(classificationZH ?? {}),
                referenceYear: i?.processes['common:referenceYear'] ?? '-',
                location: location ?? '-',
                modifiedAt: new Date(i?.processes.modified_at),
                teamId: i?.team_id,
              },
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
          const classifications = jsonToList(i?.processes['common:class']);
          const thisLocation = locationData.find((l) => l['@value'] === i?.processes['@location']);
          let location = i?.processes['@location'];
          if (thisLocation?.['#text']) {
            location = thisLocation['#text'];
          }
          return {
            ...i,
            modifiedAt: new Date(i?.modified_at),
            processes: {
              key: i?.processes.id + ':' + i?.processes.version,
              id: i?.processes.id,
              version: i?.processes.version,
              lang: lang,
              name: genProcessName(i?.processes.name ?? {}, lang),
              generalComment: getLangText(i?.processes['common:generalComment'] ?? {}, lang),
              classification: classificationToString(classifications),
              referenceYear: i?.processes['common:referenceYear'] ?? '-',
              location: location,
              modifiedAt: new Date(i?.processes.modified_at),
              teamId: i?.team_id,
            },
          };
        } catch (e) {
          console.error(e);
          return {
            id: i.id,
          };
        }
      });
    }

    const dataIds = data.map((i: any) => i.data_id);
    const lifeCycleResult = await getLifeCyclesByIds(dataIds);
    if (lifeCycleResult.data && lifeCycleResult.data.length > 0) {
      lifeCycleResult.data.forEach((i) => {
        const review = data.find((j) => j.data_id === i.id && j.data_version === i.version);
        if (review) {
          review.isFromLifeCycle = true;
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
