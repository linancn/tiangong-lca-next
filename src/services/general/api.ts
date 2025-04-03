import { supabase } from '@/services/supabase';
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
export async function getDataDetail(id: string, version: string, table: string) {
  let result: any = {};
  if (id && id.length === 36) {
    if (version && version.length === 9) {
      result = await supabase
        .from(table)
        .select('json,version, modified_at')
        .eq('id', id)
        .eq('version', version);
      if (result.data === null || result.data.length === 0) {
        result = await supabase
          .from(table)
          .select('json,version, modified_at')
          .eq('id', id)
          .order('version', { ascending: false })
          .range(0, 0);
      }
    } else {
      result = await supabase
        .from(table)
        .select('json,version, modified_at')
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
        },
        success: true,
      });
    }
  }
  return Promise.resolve({
    data: null,
    success: false,
  });
}

export async function getRefData(id: string, version: string, table: string, teamId: string) {
  if (!table) {
    return Promise.resolve({
      data: null,
      success: false,
    });
  };
  const session = await supabase.auth.getSession();
  let query = supabase
    .from(table)
    .select('state_code,json')
    .eq('id', id)
    .neq('team_id', '00000000-0000-0000-0000-000000000000');

  if (teamId) {
    query = query.eq('team_id', teamId)
  } else {
    query = query.eq('user_id', session?.data?.session?.user?.id);
  }



  let result: any = {};

  if (id && id.length === 36) {
    if (version && version.length === 9) {
      result = await query.eq('version', version);
      if (result.data === null || result.data.length === 0) {
        result = await query.order('version', { ascending: false }).range(0, 0);
      }
    } else {
      result = await query.order('version', { ascending: false }).range(0, 0);
    }
    if (result?.data && result.data.length > 0) {
      const data = result.data[0];
      return Promise.resolve({
        data: {
          stateCode: data?.state_code,
          json: data?.json,
        },
        success: true,
      });
    }
  }
  return Promise.resolve({
    data: null,
    success: false,
  });
}

export async function updateReviewIdAndStateCode(processId: string, id: string, version: string, table: string, stateCode: number) {
  if (!table) return;
  let result: any = {};
  if (id && id.length === 36) {
    if (version && version.length === 9) {
      result = await supabase
        .from(table)
        .update({ review_id: processId, state_code: stateCode })
        .eq('id', id)
        .eq('version', version)
        .select();
      if (result.data === null || result.data.length === 0) {
        result = await supabase
          .from(table)
          .update({ review_id: processId, state_code: stateCode })
          .eq('id', id)
          .order('version', { ascending: false })
          .range(0, 0);
      }
    } else {
      result = await supabase
        .from(table)
        .update({ review_id: processId, state_code: stateCode })
        .eq('id', id)
        .order('version', { ascending: false })
        .range(0, 0);
    }
  }
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
  const teamId = await getTeamIdByUserId();
  if (teamId) {
    const result = await supabase
      .from(tableName)
      .update({ team_id: teamId })
      .eq('id', id)
      .eq('version', version);

    return result;
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
