import schema from '@/pages/LifeCycleModels/lifecyclemodels.json';
import { ConcurrencyController } from '@/pages/Utils/review';
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
import {
  createProcess,
  deleteProcess,
  getProcessDetailByIdsAndVersion,
  getProcessesByIdsAndVersions,
  updateProcess,
  validateProcessesByIdAndVersion,
} from '../processes/api';
import { genProcessName } from '../processes/util';
import { getUserId } from '../users/api';
import { genLifeCycleModelJsonOrdered } from './util';
import { genLifeCycleModelProcesses } from './util_calculate';

const updateLifeCycleModelProcesses = async (id: string, version: string, data: any) => {
  const result = await supabase
    .from('processes')
    .select('json_ordered')
    .eq('id', id)
    .eq('version', version);

  if (result.error) {
    console.error(result.error);
    return;
  }

  if (result.data && result.data.length > 0) {
    const currentJsonOrdered = result.data[0].json_ordered;

    const session = await supabase.auth.getSession();
    if (session.data.session) {
      const newJson = {
        ...currentJsonOrdered,
      };
      newJson.processDataSet.modellingAndValidation = {
        ...currentJsonOrdered.processDataSet.modellingAndValidation,
        complianceDeclarations: {
          ...currentJsonOrdered.processDataSet.modellingAndValidation.complianceDeclarations,
          compliance:
            data?.lifeCycleModelDataSet?.modellingAndValidation?.complianceDeclarations?.compliance,
        },
        validation: {
          ...currentJsonOrdered.processDataSet.modellingAndValidation.validation,
          review: data?.lifeCycleModelDataSet?.modellingAndValidation?.validation?.review,
        },
      };
      const updateResult = await supabase.functions.invoke('update_data', {
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
        },
        body: {
          id,
          version,
          table: 'processes',
          data: {
            json_ordered: newJson,
          },
        },
        region: FunctionRegion.UsEast1,
      });

      if (updateResult.error) {
        console.error(updateResult.error);
      } else {
        return updateResult.data;
      }
    } else {
      console.error('no session');
    }
  } else {
    console.error('no processes');
  }
};

export async function createLifeCycleModel(data: any) {
  // const oldData = {
  //   lifeCycleModelDataSet: {
  //     '@xmlns': 'http://eplca.jrc.ec.europa.eu/ILCD/LifeCycleModel/2017',
  //     '@xmlns:acme': 'http://acme.com/custom',
  //     '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
  //     '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
  //     '@locations': '../ILCDLocations.xml',
  //     '@version': '1.1',
  //     '@xsi:schemaLocation':
  //       'http://eplca.jrc.ec.europa.eu/ILCD/LifeCycleModel/2017 ../../schemas/ILCD_LifeCycleModelDataSet.xsd',
  //   },
  // };
  // const newData = genLifeCycleModelJsonOrdered(data.id, data, oldData);
  const newLifeCycleModelJsonOrdered = genLifeCycleModelJsonOrdered(data.id, data);
  const refNode = data?.model?.nodes.find((i: any) => i?.data?.quantitativeReference === '1');
  const newLifeCycleModelProcesses = await genLifeCycleModelProcesses(
    data.id,
    refNode,
    newLifeCycleModelJsonOrdered?.lifeCycleModelDataSet,
    [],
  );
  const rule_verification = getRuleVerification(schema, newLifeCycleModelJsonOrdered)?.valid;
  const result = await supabase
    .from('lifecyclemodels')
    .insert([
      {
        id: data.id,
        json_ordered: newLifeCycleModelJsonOrdered,
        json_tg: {
          xflow: data?.model,
          submodels: newLifeCycleModelProcesses.map((p) => p.modelInfo),
        },
        rule_verification,
      },
    ])
    .select();

  if (result.error) {
    console.error(result.error);
  } else {
    if (newLifeCycleModelProcesses && newLifeCycleModelProcesses.length > 0) {
      newLifeCycleModelProcesses.forEach(async (n: any) => {
        try {
          await createProcess(n.modelInfo.id, n.data.processDataSet);
        } catch (error) {
          console.error(error);
        }
      });
    }
  }
  return result;
}

const overrideWithOldProcess = function (newData: any, oldData: any) {
  if (oldData?.processDataSet?.processInformation?.dataSetInformation?.identifierOfSubDataSet) {
    newData.processDataSet.processInformation.dataSetInformation.identifierOfSubDataSet =
      oldData.processDataSet.processInformation.dataSetInformation.identifierOfSubDataSet;
  }

  if (oldData?.processDataSet?.processInformation?.dataSetInformation?.['common:synonyms']) {
    newData.processDataSet.processInformation.dataSetInformation['common:synonyms'] =
      oldData.processDataSet.processInformation.dataSetInformation['common:synonyms'];
  }

  if (
    oldData?.processDataSet?.processInformation?.technology
      ?.technologyDescriptionAndIncludedProcesses
  ) {
    if (!newData.processDataSet.processInformation.technology) {
      newData.processDataSet.processInformation.technology = {} as any;
    }
    (
      newData.processDataSet.processInformation.technology as any
    ).technologyDescriptionAndIncludedProcesses =
      oldData.processDataSet.processInformation.technology.technologyDescriptionAndIncludedProcesses;
  }

  if (oldData?.processDataSet?.processInformation?.technology?.technologicalApplicability) {
    if (!newData.processDataSet.processInformation.technology) {
      newData.processDataSet.processInformation.technology = {} as any;
    }
    (newData.processDataSet.processInformation.technology as any).technologicalApplicability =
      oldData.processDataSet.processInformation.technology.technologicalApplicability;
  }

  if (oldData?.processDataSet?.processInformation?.technology?.referenceToTechnologyPictogramme) {
    if (!newData.processDataSet.processInformation.technology) {
      newData.processDataSet.processInformation.technology = {} as any;
    }
    (newData.processDataSet.processInformation.technology as any).referenceToTechnologyPictogramme =
      oldData.processDataSet.processInformation.technology.referenceToTechnologyPictogramme;
  }

  if (
    oldData?.processDataSet?.processInformation?.technology
      ?.referenceToTechnologyFlowDiagrammOrPicture
  ) {
    if (!newData.processDataSet.processInformation.technology) {
      newData.processDataSet.processInformation.technology = {} as any;
    }
    (
      newData.processDataSet.processInformation.technology as any
    ).referenceToTechnologyFlowDiagrammOrPicture =
      oldData.processDataSet.processInformation.technology.referenceToTechnologyFlowDiagrammOrPicture;
  }

  if (oldData?.processDataSet?.modellingAndValidation?.LCIMethodAndAllocation) {
    newData.processDataSet.modellingAndValidation.LCIMethodAndAllocation =
      oldData.processDataSet.modellingAndValidation.LCIMethodAndAllocation;
  }

  if (oldData?.processDataSet?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness) {
    newData.processDataSet.modellingAndValidation.dataSourcesTreatmentAndRepresentativeness =
      oldData.processDataSet.modellingAndValidation.dataSourcesTreatmentAndRepresentativeness;
  }

  if (oldData?.processDataSet?.modellingAndValidation?.completeness) {
    newData.processDataSet.modellingAndValidation.completeness =
      oldData.processDataSet.modellingAndValidation.completeness;
  }

  if (
    oldData?.processDataSet?.administrativeInformation?.dataEntryBy?.[
      'common:referenceToConvertedOriginalDataSetFrom'
    ]
  ) {
    newData.processDataSet.administrativeInformation.dataEntryBy[
      'common:referenceToConvertedOriginalDataSetFrom'
    ] =
      oldData.processDataSet.administrativeInformation.dataEntryBy[
        'common:referenceToConvertedOriginalDataSetFrom'
      ];
  }

  if (
    oldData?.processDataSet?.administrativeInformation?.dataEntryBy?.[
      'common:referenceToDataSetUseApproval'
    ]
  ) {
    newData.processDataSet.administrativeInformation.dataEntryBy[
      'common:referenceToDataSetUseApproval'
    ] =
      oldData.processDataSet.administrativeInformation.dataEntryBy[
        'common:referenceToDataSetUseApproval'
      ];
  }

  if (
    oldData?.processDataSet?.administrativeInformation?.publicationAndOwnership?.[
      'common:dateOfLastRevision'
    ]
  ) {
    newData.processDataSet.administrativeInformation.publicationAndOwnership[
      'common:dateOfLastRevision'
    ] =
      oldData.processDataSet.administrativeInformation.publicationAndOwnership[
        'common:dateOfLastRevision'
      ];
  }

  if (
    oldData?.processDataSet?.administrativeInformation?.publicationAndOwnership?.[
      'common:workflowAndPublicationStatus'
    ]
  ) {
    newData.processDataSet.administrativeInformation.publicationAndOwnership[
      'common:workflowAndPublicationStatus'
    ] =
      oldData.processDataSet.administrativeInformation.publicationAndOwnership[
        'common:workflowAndPublicationStatus'
      ];
  }

  if (
    oldData?.processDataSet?.administrativeInformation?.publicationAndOwnership?.[
      'common:referenceToUnchangedRepublication'
    ]
  ) {
    newData.processDataSet.administrativeInformation.publicationAndOwnership[
      'common:referenceToUnchangedRepublication'
    ] =
      oldData.processDataSet.administrativeInformation.publicationAndOwnership[
        'common:referenceToUnchangedRepublication'
      ];
  }

  if (
    oldData?.processDataSet?.administrativeInformation?.publicationAndOwnership?.[
      'common:referenceToRegistrationAuthority'
    ]
  ) {
    newData.processDataSet.administrativeInformation.publicationAndOwnership[
      'common:referenceToRegistrationAuthority'
    ] =
      oldData.processDataSet.administrativeInformation.publicationAndOwnership[
        'common:referenceToRegistrationAuthority'
      ];
  }

  if (
    oldData?.processDataSet?.administrativeInformation?.publicationAndOwnership?.[
      'common:registrationNumber'
    ]
  ) {
    newData.processDataSet.administrativeInformation.publicationAndOwnership[
      'common:registrationNumber'
    ] =
      oldData.processDataSet.administrativeInformation.publicationAndOwnership[
        'common:registrationNumber'
      ];
  }

  if (oldData?.processDataSet?.processInformation?.time) {
    newData.processDataSet.processInformation.time = oldData.processDataSet.processInformation.time;
  }

  if (oldData?.processDataSet?.processInformation?.geography) {
    newData.processDataSet.processInformation.geography =
      oldData.processDataSet.processInformation.geography;
  }

  if (oldData?.processDataSet?.processInformation?.mathematicalRelations) {
    newData.processDataSet.processInformation.mathematicalRelations =
      oldData.processDataSet.processInformation.mathematicalRelations;
  }
};

export async function updateLifeCycleModel(data: any) {
  const result = await supabase
    .from('lifecyclemodels')
    .select('id, json, json_tg->submodels')
    .eq('id', data.id)
    .eq('version', data.version);

  if (result.data && result.data.length === 1) {
    const oldData = result.data[0];
    const newLifeCycleModelJsonOrdered = genLifeCycleModelJsonOrdered(data.id, data);

    const refNode = data?.model?.nodes.find((i: any) => i?.data?.quantitativeReference === '1');

    const newLifeCycleModelProcesses = await genLifeCycleModelProcesses(
      data.id,
      refNode?.data?.targetAmount,
      newLifeCycleModelJsonOrdered,
      jsonToList(oldData.submodels),
    );

    const rule_verification = await getRuleVerification(schema, newLifeCycleModelJsonOrdered)
      ?.valid;
    const session = await supabase.auth.getSession();
    if (session.data.session) {
      const oldSubmodels: any[] = jsonToList(oldData.submodels);
      const deleteOldSubmodels = oldSubmodels.filter((o: any) => {
        return (
          o.type === 'secondary' &&
          !newLifeCycleModelProcesses.some((n: any) => {
            const newModelInfo = n.modelInfo;
            return (
              o.finalId.nodeId === newModelInfo.finalId.nodeId &&
              o.finalId.processId === newModelInfo.finalId.processId &&
              o.finalId.allocatedExchangeDirection ===
                newModelInfo.finalId.allocatedExchangeDirection &&
              o.finalId.allocatedExchangeFlowId === newModelInfo.finalId.allocatedExchangeFlowId
            );
          })
        );
      });

      const updateResult = await supabase.functions.invoke('update_data', {
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
        },
        body: {
          id: data.id,
          version: data.version,
          table: 'lifecyclemodels',
          data: {
            json_ordered: newLifeCycleModelJsonOrdered,
            json_tg: {
              xflow: data?.model,
              submodels: newLifeCycleModelProcesses.map((p) => p.modelInfo),
            },
            rule_verification,
          },
        },
        region: FunctionRegion.UsEast1,
      });
      if (updateResult.error) {
        console.error(updateResult.error);
      } else {
        // 1) 删除旧的子模型：并发执行并等待完成
        const deletionPromises: Promise<any>[] =
          deleteOldSubmodels && deleteOldSubmodels.length > 0
            ? deleteOldSubmodels.map((o: any) =>
                deleteProcess(o.id, data.version).catch((error) => {
                  console.error(error);
                }),
              )
            : [];

        // 2) 创建/更新新的子模型：并发执行并等待完成
        let updatePromises: Promise<any>[] = [];
        if (newLifeCycleModelProcesses && newLifeCycleModelProcesses.length > 0) {
          const { data: oldProcesses } = await getProcessDetailByIdsAndVersion(
            newLifeCycleModelProcesses.map((n: any) => n.modelInfo.id),
            data.version,
          );

          updatePromises = newLifeCycleModelProcesses
            .map((n: any) => {
              return (async () => {
                try {
                  if (n.option === 'update') {
                    const validate = await validateProcessesByIdAndVersion(
                      n.modelInfo.id,
                      data.version,
                    );
                    if (validate) {
                      const oldProcess = oldProcesses?.find(
                        (p: any) => p.id === n.modelInfo.id && p.version === data.version,
                      );
                      if (oldProcess) {
                        overrideWithOldProcess(n.data, oldProcess.json);
                      }
                      return updateProcess(n.modelInfo.id, data.version, n.data.processDataSet);
                    } else {
                      return createProcess(n.modelInfo.id, n.data.processDataSet);
                    }
                  } else if (n.option === 'create') {
                    return createProcess(n.modelInfo.id, n.data.processDataSet);
                  }
                } catch (error) {
                  console.error(error);
                }
              })();
            })
            .filter(Boolean) as Promise<any>[];
        }

        // 等待所有删除与更新/创建完成，再返回结果
        await Promise.all([...deletionPromises, ...updatePromises]);

        return updateResult?.data;
      }
    }
  }
}

export async function updateLifeCycleModelJsonApi(id: string, version: string, data: any) {
  let updateResult: any = {};
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    updateResult = await supabase.functions.invoke('update_data', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { id, version, table: 'lifecyclemodels', data: { json_ordered: data } },
      region: FunctionRegion.UsEast1,
    });
  }
  if (updateResult.error) {
    console.log('error', updateResult.error);
  }
  if (updateResult?.data?.data && updateResult?.data?.data?.length > 0) {
    const submodels = updateResult?.data?.data[0]?.json_tg?.submodels;

    if (submodels && submodels.length > 0) {
      const controller = new ConcurrencyController(3);

      for (const item of submodels) {
        controller.add(async () => {
          try {
            const result = await updateLifeCycleModelProcesses(item.id, version, data);
            return { success: true, result, item };
          } catch (error) {
            console.error(`update process ${item.id} failed:`, error);
            return { success: false, error, item };
          }
        });
      }

      await controller.waitForAll();
    }
  }
  return updateResult?.data;
}

export async function deleteLifeCycleModel(id: string, version: string) {
  const result = await supabase
    .from('lifecyclemodels')
    .select('id, version, json_tg->submodels')
    .eq('id', id)
    .eq('version', version);

  if (result.data && result.data.length === 1) {
    const oldSubmodels: any[] = jsonToList(result.data[0].submodels);
    if (oldSubmodels && oldSubmodels.length > 0)
      oldSubmodels.forEach((o: any) => {
        try {
          deleteProcess(o.id, version);
        } catch (error) {
          console.error(error);
        }
      });
  }

  const resultDelete = await supabase
    .from('lifecyclemodels')
    .delete()
    .eq('id', id)
    .eq('version', version);
  return resultDelete;
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

export async function getSubmodelsByProcessIds(processIds: string[]) {
  if (!processIds || processIds.length === 0) {
    return { error: 'processIds is empty', data: null };
  }

  const orConditions = processIds.map(
    (processId) => `json_tg->submodels.cs.[{"id":"${processId}"}]`,
  );

  const result = await supabase
    .from('lifecyclemodels')
    .select('id, version, json_tg->submodels')
    .or(orConditions.join(','));

  if (result.error) {
    console.error('Error fetching lifecycle models:', result.error);
    return { error: result.error, data: null };
  }

  const mapping: { [processId: string]: string } = {};

  if (result.data) {
    result.data.forEach((lifecycleModel) => {
      const submodels = lifecycleModel.submodels;
      if (submodels && Array.isArray(submodels)) {
        submodels.forEach((submodel: any) => {
          if (submodel && submodel.id && processIds.includes(submodel.id)) {
            mapping[submodel.id] = `${lifecycleModel.id}_${lifecycleModel.version}`;
          }
        });
      }
    });
  }

  return { error: null, data: mapping };
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
    const userId = await getUserId();
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
          getSubmodelsByProcessIds(procressIds),
        ]);

        data?.json_tg?.xflow?.nodes?.forEach((node: any) => {
          if (models.data && models.data.hasOwnProperty(node.data.id)) {
            node.modelData = {
              id: models.data[node.data.id].split('_')[0],
              version: models.data[node.data.id].split('_')[1],
            };
          }
          const procress = procresses?.data?.find(
            (procress: any) =>
              procress?.id === node?.data?.id && procress?.version === node?.data?.version,
          );
          if (procress?.user_id === userId) {
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
