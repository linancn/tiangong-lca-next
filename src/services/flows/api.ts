import {
  classificationToString,
  genClassificationZH,
  getLangText,
  jsonToList,
} from '../general/util';

import schema from '@/pages/Flows/flows_schema.json';
import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';
import { SortOrder } from 'antd/lib/table/interface';
import { getDataDetail, getTeamIdByUserId } from '../general/api';
import { getRuleVerification } from '../general/util';
import { getILCDFlowCategorizationAll, getILCDLocationByValues } from '../ilcd/api';
import { genFlowJsonOrdered, genFlowName } from './util';

export async function createFlows(id: string, data: any) {
  const newData = genFlowJsonOrdered(id, data);
  const rule_verification = getRuleVerification(schema, newData)?.valid;
  // const teamId = await getTeamIdByUserId();
  const result = await supabase
    .from('flows')
    .insert([{ id: id, json_ordered: newData, rule_verification }])
    .select();
  return result;
}

export async function updateFlows(id: string, version: string, data: any) {
  const newData = genFlowJsonOrdered(id, data);
  const rule_verification = getRuleVerification(schema, newData)?.valid;
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('update_data', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { id, version, table: 'flows', data: { json_ordered: newData, rule_verification } },
      region: FunctionRegion.UsEast1,
    });
  }
  if (result.error) {
    console.log('error', result.error);
  }
  return result?.data;
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
  tid: string | [],
  filters?: {
    flowType?: string;
    asInput?: boolean;
  },
  stateCode?: string | number,
) {
  const sortBy = Object.keys(sort)[0] ?? 'modified_at';
  const orderBy = sort[sortBy] ?? 'descend';

  const selectStr = `
    id,
    json->flowDataSet->flowInformation->dataSetInformation->name,
    json->flowDataSet->flowInformation->dataSetInformation->classificationInformation,
    json->flowDataSet->flowInformation->dataSetInformation->"common:synonyms",
    json->flowDataSet->flowInformation->dataSetInformation->>CASNumber,
    json->flowDataSet->flowInformation->geography->>locationOfSupply,
    json->flowDataSet->modellingAndValidation->LCIMethod->>typeOfDataSet,
    json->flowDataSet->flowProperties->flowProperty->referenceToFlowPropertyDataSet,
    version,
    modified_at,
    team_id
  `;

  const tableName = 'flows';

  let query = supabase
    .from(tableName)
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

  if (filters?.asInput) {
    query = query.not(
      'json',
      'cs',
      '{"flowDataSet":{"flowInformation":{"dataSetInformation":{"classificationInformation":{"common:elementaryFlowCategorization":{"common:category":[{"#text": "Emissions", "@level": "0"}]}}}}}}',
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
            let classificationData: any = {};
            let thisClass: any[] = [];
            if (i?.typeOfDataSet === 'Elementary flow') {
              classificationData =
                i?.classificationInformation?.['common:elementaryFlowCategorization']?.[
                  'common:category'
                ];
              thisClass = res?.data?.categoryElementaryFlow;
            } else {
              classificationData =
                i?.classificationInformation?.['common:classification']?.['common:class'];
              thisClass = res?.data?.category;
            }

            const classifications = jsonToList(classificationData);
            const classificationZH = genClassificationZH(classifications, thisClass);

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
          const thisLocation = locationData.find((l) => l['@value'] === i['locationOfSupply']);
          let locationOfSupply = i['locationOfSupply'];
          if (thisLocation?.['#text']) {
            locationOfSupply = thisLocation['#text'];
          }

          let classificationData: any = {};
          if (i?.typeOfDataSet === 'Elementary flow') {
            classificationData =
              i?.classificationInformation?.['common:elementaryFlowCategorization']?.[
                'common:category'
              ];
          } else {
            classificationData =
              i?.classificationInformation?.['common:classification']?.['common:class'];
          }

          const classifications = jsonToList(classificationData);

          return {
            key: i.id + ':' + i.version,
            id: i.id,
            name: genFlowName(i?.name ?? {}, lang),
            flowType: i.typeOfDataSet ?? '-',
            classification: classificationToString(classifications),
            synonyms: getLangText(i['common:synonyms'], lang),
            CASNumber: i.CASNumber ?? '-',
            refFlowPropertyId: i.referenceToFlowPropertyDataSet?.['@refObjectId'] ?? '-',
            locationOfSupply: locationOfSupply,
            version: i.version,
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
  filter: any,
  stateCode?: string | number,
) {
  let result: any = {};
  const session = await supabase.auth.getSession();

  if (session.data.session) {
    result = await supabase.rpc(
      'pgroonga_search_flows',
      typeof stateCode === 'number'
        ? {
            query_text: queryText,
            filter_condition: filter,
            page_size: params.pageSize ?? 10,
            page_current: params.current ?? 1,
            data_source: dataSource,
            this_user_id: session.data.session.user?.id,
            state_code: stateCode,
          }
        : {
            query_text: queryText,
            filter_condition: filter,
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
            const typeOfDataSet =
              i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet;
            const dataInfo = i.json?.flowDataSet?.flowInformation?.dataSetInformation;

            let classificationData: any = {};
            let thisClass: any[] = [];
            if (typeOfDataSet === 'Elementary flow') {
              classificationData =
                dataInfo?.classificationInformation?.['common:elementaryFlowCategorization']?.[
                  'common:category'
                ];
              thisClass = res?.data?.categoryElementaryFlow;
            } else {
              classificationData =
                dataInfo?.classificationInformation?.['common:classification']?.['common:class'];
              thisClass = res?.data?.category;
            }

            const classifications = jsonToList(classificationData);

            const classificationZH = genClassificationZH(classifications, thisClass);

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
              flowType: typeOfDataSet ?? '-',
              classification: classificationToString(classificationZH),
              CASNumber: dataInfo?.CASNumber ?? '-',
              locationOfSupply: locationOfSupply ?? '-',
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
          const dataInfo = i.json?.flowDataSet?.flowInformation?.dataSetInformation;
          const classifications = jsonToList(
            dataInfo?.classificationInformation?.['common:elementaryFlowCategorization']?.[
              'common:category'
            ],
          );
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
            classification: classificationToString(classifications),
            flowType: i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet ?? '-',
            CASNumber: dataInfo?.CASNumber ?? '-',
            locationOfSupply: locationOfSupply ?? '-',
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
  stateCode?: string | number,
) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('flow_hybrid_search', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body:
        typeof stateCode === 'number'
          ? { query: query, filter: filter, state_code: stateCode }
          : { query: query, filter: filter },
      region: FunctionRegion.UsEast1,
    });
  }
  if (result.error) {
    console.log('error', result.error);
  }
  if (result.data?.data) {
    if (result.data.data.length === 0) {
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
        data = resultData.map((i: any) => {
          try {
            const typeOfDataSet =
              i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet;
            const dataInfo = i.json?.flowDataSet?.flowInformation?.dataSetInformation;

            let classificationData: any = {};
            let thisClass: any[] = [];
            if (typeOfDataSet === 'Elementary flow') {
              classificationData =
                dataInfo?.classificationInformation?.['common:elementaryFlowCategorization']?.[
                  'common:category'
                ];
              thisClass = res?.data?.categoryElementaryFlow;
            } else {
              classificationData =
                dataInfo?.classificationInformation?.['common:classification']?.['common:class'];
              thisClass = res?.data?.category;
            }

            const classifications = jsonToList(classificationData);

            const classificationZH = genClassificationZH(classifications, thisClass);

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
              flowType: typeOfDataSet ?? '-',
              classification: classificationToString(classificationZH),
              CASNumber: dataInfo?.CASNumber ?? '-',
              locationOfSupply: locationOfSupply ?? '-',
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
          const dataInfo = i.json?.flowDataSet?.flowInformation?.dataSetInformation;
          const classifications = jsonToList(
            dataInfo?.classificationInformation?.['common:elementaryFlowCategorization']?.[
              'common:category'
            ],
          );
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
            classification: classificationToString(classifications),
            flowType: i.json?.flowDataSet?.modellingAndValidation?.LCIMethod?.typeOfDataSet ?? '-',
            CASNumber: dataInfo?.CASNumber ?? '-',
            locationOfSupply: locationOfSupply ?? '-',
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
      page: 1,
      success: true,
      total: totalCount,
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

export async function getFlowProperties(params: { id: string; version: string }[]) {
  let result: any = [];
  const selectStr = `
        id,
        version,
        json->flowDataSet->flowInformation->dataSetInformation->name,
        json->flowDataSet->modellingAndValidation->LCIMethod->>typeOfDataSet,
        json->flowDataSet->flowInformation->quantitativeReference->referenceToReferenceFlowProperty,
        json->flowDataSet->flowProperties->flowProperty
    `;

  let _ids = params.map((item) => item.id);
  let ids = _ids.filter((id) => id && id.length === 36);

  if (ids.length > 0) {
    const { data } = await supabase
      .from('flows')
      .select(selectStr)
      .in('id', ids)
      .order('version', { ascending: false });

    if (data && data.length > 0) {
      result = params.map((item: any) => {
        let property: any = data.find((i: any) => i.id === item.id && i.version === item.version);
        if (!property) {
          property = data.find((i: any) => i.id === item.id);
        }

        const dataList = jsonToList(property?.flowProperty);
        const refData = dataList.find(
          (item) => item?.['@dataSetInternalID'] === property?.referenceToReferenceFlowProperty,
        );

        return {
          id: property?.id,
          version: property?.version,
          name: property?.name ?? '-',
          typeOfDataSet: property?.typeOfDataSet ?? '-',
          refFlowPropertytId: refData?.referenceToFlowPropertyDataSet?.['@refObjectId'] ?? '-',
          refFlowPropertyShortDescription:
            refData?.referenceToFlowPropertyDataSet?.['shortDescription'] ?? {},
        };
      });
      return Promise.resolve({
        data: result,
        success: true,
      });
    }
  }
  return Promise.resolve({
    data: [],
    success: false,
  });
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
export async function getFlowStateCodeByIdsAndVersions(params: { id: string; version: string }[]) {
  const res = await supabase
    .from('flows')
    .select('state_code,id,version')
    .in(
      'id',
      params.map((item) => item.id),
    )
    .in(
      'version',
      params.map((item) => item.version),
    );
  return res;
}
