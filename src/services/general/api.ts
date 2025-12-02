import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';
import { message } from 'antd';
import { SortOrder } from 'antd/lib/table/interface';
import { getLocale } from 'umi';
import { genFlowName } from '../flows/util';
import {
  classificationToString,
  genClassificationZH,
  getLangText,
  jsonToList,
} from '../general/util';
import {
  getILCDClassification,
  getILCDFlowCategorizationAll,
  getILCDLocationByValues,
} from '../ilcd/api';
import { genProcessName } from '../processes/util';

export async function exportDataApi(tableName: string, id: string, version: string) {
  let query;
  if (tableName === 'lifecyclemodels') {
    query = supabase
      .from(tableName)
      .select(`json_ordered,json_tg`)
      .eq('id', id)
      .eq('version', version);
  } else {
    query = supabase.from(tableName).select(`json_ordered`).eq('id', id).eq('version', version);
  }

  const result = await query;
  return result;
}

const VERSION_PATTERN = /^\d{2}\.\d{2}\.\d{3}$/;

export async function getDataDetail(id: string, version: string, table: string) {
  const hasValidId = typeof id === 'string' && id.length === 36;
  const normalizedVersion = typeof version === 'string' ? version.trim() : '';
  const hasVersion = normalizedVersion.length > 0;
  const isVersionFormatValid = !hasVersion || VERSION_PATTERN.test(normalizedVersion);

  if (!hasValidId || !table || (hasVersion && !isVersionFormatValid)) {
    return Promise.resolve({
      data: null,
      success: false,
    });
  }

  const query = supabase
    .from(table)
    .select('json,version, modified_at,id,state_code,rule_verification,user_id')
    .eq('id', id);

  let result: any;
  if (hasVersion) {
    result = await query.eq('version', normalizedVersion);
  } else {
    result = await query.order('version', { ascending: false }).range(0, 0);
  }

  if (!result?.data || result.data.length === 0) {
    return Promise.resolve({
      data: null,
      success: false,
    });
  }

  const data = result.data[0];
  return Promise.resolve({
    data: {
      id,
      version: data.version,
      json: data.json,
      modifiedAt: data?.modified_at,
      stateCode: data?.state_code,
      ruleVerification: data?.rule_verification,
      userId: data?.user_id,
    },
    success: true,
  });
}
export async function getDataDetailById(id: string, table: string) {
  let result: any = {};
  if (id && id.length === 36) {
    result = await supabase
      .from(table)
      .select('json,version, modified_at,id,state_code,rule_verification,user_id')
      .eq('id', id);
    return result;
  }
  return null;
}

export async function getRefData(id: string, version: string, table: string, teamId?: string) {
  if (!table || !id || id.length !== 36) {
    return Promise.resolve({
      data: null,
      success: false,
    });
  }

  let query = supabase
    .from(table)
    .select('state_code,json,rule_verification,user_id,team_id')
    .eq('id', id);

  let result: any = {};

  if (version && version.length === 9) {
    result = await query.eq('version', version);
    if (!result?.data || result.data.length === 0) {
      result = await query.order('version', { ascending: false }).range(0, 0);
    }
  } else {
    result = await query.order('version', { ascending: false }).range(0, 0);
  }

  if (result?.data && result.data.length > 0) {
    let data = result.data[0];
    const teamData = result.data.filter((item: any) => item.team_id === teamId);
    if (teamId !== '00000000-0000-0000-0000-000000000000' && teamData && teamData.length > 0) {
      data = teamData[0];
    }
    return Promise.resolve({
      data: {
        stateCode: data?.state_code,
        json: data?.json,
        ruleVerification: data?.rule_verification,
        userId: data?.user_id,
      },
      success: true,
    });
  }

  return Promise.resolve({
    data: null,
    success: false,
  });
}

export async function getRefDataByIds(ids: string[], table: string) {
  if (!table || ids.length === 0) {
    return Promise.resolve({
      data: null,
      success: false,
    });
  }

  const result = await supabase.from(table).select('state_code,id,version').in('id', ids);

  return Promise.resolve({
    data: result.data,
    success: true,
  });
}

export async function updateStateCodeApi(
  id: string,
  version: string,
  table: string,
  stateCode: number,
) {
  if (!table) return;
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('update_data', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { id, version, table, data: { state_code: stateCode } },
      region: FunctionRegion.UsEast1,
    });
  }
  if (result.error) {
    console.log('error', result.error);
  }
  return result?.data;
}

export async function getReviewsOfData(id: string, version: string, table: string) {
  let result = await supabase.from(table).select('reviews').eq('id', id).eq('version', version);
  return result.data?.[0]?.reviews ?? [];
}
export async function updateDateToReviewState(
  id: string,
  version: string,
  table: string,
  data: any,
) {
  if (!table) return;
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('update_data', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { id, version, table, data },
      region: FunctionRegion.UsEast1,
    });
  }
  if (result.error) {
    console.log('error', result.error);
  }
  return result?.data;
}

// Get the team id of the user when the user is not an invited user and  is not a rejected user
export async function getTeamIdByUserId() {
  const session = await supabase.auth.getSession();
  const { data } = await supabase
    .from('roles')
    .select(
      ` 
      user_id,
      team_id,
      role
      `,
    )
    .eq('user_id', session?.data?.session?.user?.id)
    .neq('team_id', '00000000-0000-0000-0000-000000000000');

  if (data && data.length > 0 && data[0].role !== 'is_invited' && data[0].role !== 'rejected') {
    return data[0].team_id;
  }
  return null;
}

export async function contributeSource(tableName: string, id: string, version: string) {
  if (!tableName) {
    return {
      error: true,
      message: 'Contribute failed',
    };
  }
  const teamId = await getTeamIdByUserId();
  if (teamId) {
    let result: any = {};
    const session = await supabase.auth.getSession();
    if (session.data.session) {
      result = await supabase.functions.invoke('update_data', {
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
        },
        body: { id, version, table: tableName, data: { team_id: teamId } },
        region: FunctionRegion.UsEast1,
      });
    }
    if (result.error) {
      console.log('error', result.error);
    }
    return result?.data;
  } else {
    message.error(
      getLocale() === 'zh-CN' ? '您不是任何团队的成员' : 'You are not a member of any team',
    );
  }
  return {
    error: true,
    message: 'Contribute failed',
  };
}

export async function getAllVersions(
  nameColume: string,
  tableName: string,
  id: string,
  params: { pageSize: number; current: number },
  sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
) {
  const sortBy = Object.keys(sort)[0] ?? 'created_at';
  const orderBy = sort[sortBy] ?? 'descend';

  let query = supabase
    .from(tableName)
    .select(
      `
    id,
    ${nameColume}, 
    version, 
    created_at, 
    modified_at`,
      { count: 'exact' },
    )
    .eq('id', id)
    .order(sortBy, { ascending: orderBy === 'ascend' })
    .range(
      ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
      (params.current ?? 1) * (params.pageSize ?? 10) - 1,
    );

  if (dataSource === 'tg') {
    query = query.eq('state_code', 100);
  } else if (dataSource === 'co') {
    query = query.eq('state_code', 200);
  } else if (dataSource === 'my') {
    const session = await supabase.auth.getSession();
    if (session.data.session) {
      query = query.eq('user_id', session?.data?.session?.user?.id);
    } else {
      return Promise.resolve({
        data: [],
        success: false,
        total: 0,
      });
    }
  } else if (dataSource === 'te') {
    const teamId = await getTeamIdByUserId();
    if (teamId) {
      query = query.eq('team_id', teamId);
    } else {
      return Promise.resolve({
        data: [],
        success: false,
        total: 0,
      });
    }
  }

  const result = await query;
  let data: any[] = result?.data ?? [];
  if (!result.error) {
    switch (tableName) {
      case 'contacts': {
        await getILCDClassification('Contact', lang, ['all']).then((res) => {
          data = result.data.map((i: any) => {
            try {
              const classifications = jsonToList(i?.['common:class']);
              const classificationZH = genClassificationZH(classifications, res?.data);

              return {
                key: i.id + ':' + i.version,
                id: i.id,
                shortName: getLangText(i?.['common:shortName'], lang),
                name: getLangText(i?.['common:name'], lang),
                classification: classificationToString(classificationZH),
                email: i?.email ?? '-',
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
        break;
      }
      case 'sources':
        if (lang === 'zh') {
          await getILCDClassification('Source', lang, ['all']).then((res) => {
            data = result?.data?.map((i: any) => {
              try {
                const classifications = jsonToList(i['common:class']);
                const classificationZH = genClassificationZH(classifications, res?.data);
                return {
                  key: i.id + ':' + i.version,
                  id: i.id,
                  shortName: getLangText(i['common:shortName'], lang),
                  classification: classificationToString(classificationZH),
                  sourceCitation: i.sourceCitation ?? '-',
                  publicationType: i.publicationType ?? '-',
                  version: i.version,
                  modifiedAt: new Date(i.modified_at),
                  teamId: i.team_id,
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
              return {
                key: i.id + ':' + i.version,
                id: i.id,
                shortName: getLangText(i?.['common:shortName'], lang),
                classification: classificationToString(classifications),
                sourceCitation: i?.sourceCitation ?? '-',
                publicationType: i?.publicationType ?? '-',
                version: i.version,
                modifiedAt: new Date(i?.modified_at),
                teamId: i.team_id,
              };
            } catch (e) {
              console.error(e);
              return {
                id: i.id,
              };
            }
          });
        }
        break;

      case 'unitgroups':
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
              const classifications = jsonToList(i?.['common:class']);
              const unitList = jsonToList(i?.unit);
              const refUnit = unitList.find(
                (item) => item?.['@dataSetInternalID'] === i?.referenceToReferenceUnit,
              );
              return {
                key: i.id,
                id: i.id,
                name: getLangText(i?.['common:name'], lang),
                classification: classificationToString(classifications),
                refUnitId: i?.referenceToReferenceUnit ?? '-',
                refUnitName: refUnit?.name ?? '-',
                refUnitGeneralComment: getLangText(refUnit?.generalComment, lang),
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
        break;

      case 'flowproperties':
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
              const classifications = jsonToList(i?.['common:class']);
              return {
                key: i.id + ':' + i.version,
                id: i.id,
                name: getLangText(i?.['common:name'], lang),
                classification: classificationToString(classifications),
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
        break;

      case 'flows': {
        const locations: string[] = Array.from(
          new Set(result.data.map((i: any) => i['locationOfSupply'])),
        );
        let locationData: any[] = [];
        await getILCDLocationByValues(lang, locations).then((res) => {
          locationData = res.data;
        });

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

                const thisLocation = locationData.find(
                  (l) => l['@value'] === i['locationOfSupply'],
                );
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
        break;
      }

      case 'processes': {
        const locations: string[] = Array.from(
          new Set(result?.data.map((i: any) => i['@location'])),
        );
        let locationData: any[] = [];
        await getILCDLocationByValues(lang, locations).then((res) => {
          locationData = res.data;
        });
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
        break;
      }

      case 'lifecyclemodels': {
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

        break;
      }
    }

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: result.count ?? 0,
    });
  } else {
    return Promise.resolve({
      data: [],
      success: false,
      total: 0,
    });
  }
}

export async function getAISuggestion(tidasData: any, dataType: string, options: any) {
  let result: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    result = await supabase.functions.invoke('ai_suggest', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { tidasData, dataType, options },
      region: FunctionRegion.UsEast1,
    });
  }
  if (result.error) {
    console.log('error', result.error);
  }
  return result?.data;
}
