import {
  classificationToString,
  genClassificationZH,
  getLangText,
  jsonToList,
} from '../general/util';

import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import { getDataDetail, getTeamIdByUserId } from '../general/api';
import { getILCDClassification } from '../ilcd/api';
import { genUnitGroupJsonOrdered } from './util';

export async function createUnitGroup(id: string, data: any) {
  const newData = genUnitGroupJsonOrdered(id, data);
  const teamId = await getTeamIdByUserId();
  const result = await supabase
    .from('unitgroups')
    .insert([{ id: id, json_ordered: newData, team_id: teamId }])
    .select();
  return result;
}

export async function updateUnitGroup(id: string, version: string, data: any) {
  const newData = genUnitGroupJsonOrdered(id, data);
  const updateResult = await supabase
    .from('unitgroups')
    .update({ json_ordered: newData })
    .eq('id', id)
    .eq('version', version)
    .select();
  return updateResult;
}

export async function deleteUnitGroup(id: string, version: string) {
  const result = await supabase.from('unitgroups').delete().eq('id', id).eq('version', version);
  return result;
}

export async function getUnitGroupTableAll(
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
        json->unitGroupDataSet->unitGroupInformation->dataSetInformation->"common:name",
        json->unitGroupDataSet->unitGroupInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
        json->unitGroupDataSet->unitGroupInformation->quantitativeReference->>referenceToReferenceUnit,
        json->unitGroupDataSet->units->unit,
        version,
        modified_at,
        team_id
    `;

  const tableName = 'unitgroups';

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

export async function getUnitGroupTablePgroongaSearch(
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
    result = await supabase.rpc('pgroonga_search_unitgroups', {
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
      await getILCDClassification('UnitGroup', lang, ['all']).then((res) => {
        data = result.data.map((i: any) => {
          try {
            const dataInfo = i.json?.unitGroupDataSet?.unitGroupInformation;
            const refUnitId = dataInfo?.quantitativeReference?.referenceToReferenceUnit ?? '-';
            const unitList = jsonToList(i.json?.unitGroupDataSet?.units?.unit);
            const refUnit = unitList.find((item) => item?.['@dataSetInternalID'] === refUnitId);

            const classifications = jsonToList(
              dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
              'common:class'
              ],
            );

            const classificationZH = genClassificationZH(classifications, res?.data);

            return {
              key: i.id + ':' + i.version,
              id: i.id,
              name: getLangText(dataInfo?.dataSetInformation?.['common:name'] ?? {}, lang),
              classification: classificationToString(classificationZH),
              refUnitId: refUnitId,
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
          const dataInfo = i.json?.unitGroupDataSet?.unitGroupInformation;
          const classifications = jsonToList(
            dataInfo?.dataSetInformation?.classificationInformation?.['common:classification']?.[
            'common:class'
            ],
          );
          const refUnitId = dataInfo?.quantitativeReference?.referenceToReferenceUnit ?? '-';
          const unitList = jsonToList(i.json?.unitGroupDataSet?.units?.unit);
          const refUnit = unitList.find((item) => item?.['@dataSetInternalID'] === refUnitId);

          return {
            key: i.id + ':' + i.version,
            id: i.id,
            name: getLangText(dataInfo?.dataSetInformation?.['common:name'] ?? {}, lang),
            classification: classificationToString(classifications),
            refUnitId: refUnitId,
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

    return Promise.resolve({
      data: data,
      page: params.current ?? 1,
      success: true,
      total: totalCount ?? 0,
    });
  }

  return result;
}

export async function getUnitGroupDetail(id: string, version: string) {
  return getDataDetail(id, version, 'unitgroups');
}

// Replace the query function for idType === 'unitgroup' in the <ReferenceUnit/> component.
export async function getReferenceUnitByIdsAndVersion(tableData: { [key: string]: any }[]) {
  const unitGroupIds = tableData
    .filter((item) => item.refUnitGroupId && item.refUnitGroupId.length === 36)
    .map((item) => item.refUnitGroupId);

  if (unitGroupIds.length === 0) {
    return tableData;
  }
  const result = await supabase
    .from('unitgroups')
    .select(
      `
      id,
      version,
      json->unitGroupDataSet->unitGroupInformation->dataSetInformation->"common:name",
      json->unitGroupDataSet->unitGroupInformation->quantitativeReference->referenceToReferenceUnit,
      json->unitGroupDataSet->units->unit
  `,
    )
    .in('id', unitGroupIds)
    .order('version', { ascending: false });

  if (result.data && result.data.length > 0) {
    let data = tableData.map((row) => {
      const unitGroups = result.data.filter((unitGroup) => unitGroup.id === row.refUnitGroupId);
      let unitGroup = unitGroups?.find(
        (unitGroup) => unitGroup.version === row.refUnitGroupVersion,
      );

      if (!unitGroup) {
        unitGroup = unitGroups[0];
      }
      const dataList = jsonToList(unitGroup?.unit);
      const refData = dataList.find(
        (item) => item?.['@dataSetInternalID'] === unitGroup?.referenceToReferenceUnit,
      );
      return {
        ...row,
        refUnitRes: {
          id: unitGroup?.id,
          version: unitGroup?.version,
          name: unitGroup?.['common:name'],
          refUnitId: unitGroup?.referenceToReferenceUnit ?? '-',
          refUnitName: refData?.name ?? '-',
          refUnitGeneralComment: refData?.generalComment,
          unit: dataList,
        },
      };
    });

    return data;
  }
  return Promise.resolve({
    data: null,
    success: false,
  });
}
// Same function as getReferenceUnit function, imported parameter and return value are different
export async function getReferenceUnits(params: { id: string, version: string }[]) {
  let result: any = [];
  const selectStr = `
        id,
        version,
        json->unitGroupDataSet->unitGroupInformation->dataSetInformation->"common:name",
        json->unitGroupDataSet->unitGroupInformation->quantitativeReference->referenceToReferenceUnit,
        json->unitGroupDataSet->units->unit
    `;
  const ids = params.map((item: any) => {
    return item.id;
  });

  if (ids.every((id) => id && id.length === 36)) {
    const { data } = await supabase
      .from('unitgroups')
      .select(selectStr)
      .in('id', ids)
      .order('version', { ascending: false });

    if (data && data.length > 0) {
      result = params.map((item: any) => {
        let unitRes:any = data.find((i: any) => i.id === item.id && i.version === item.version);
        if (!unitRes) {
          unitRes = data.find((i: any) => i.id === item.id);
        }
        const dataList = jsonToList(unitRes?.unit);
        const refData = dataList.find(
          (item) => item?.['@dataSetInternalID'] === unitRes?.referenceToReferenceUnit,
        );

        return {
            id: unitRes?.id,
            version: unitRes?.version,
            name: unitRes?.['common:name'],
            refUnitId: unitRes?.referenceToReferenceUnit ?? '-',
            refUnitName: refData?.name ?? '-',
            refUnitGeneralComment: refData?.generalComment,
            unit: dataList,
        }
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

export async function getReferenceUnit(id: string, version: string) {
  let result: any = {};
  const selectStr = `
        id,
        version,
        json->unitGroupDataSet->unitGroupInformation->dataSetInformation->"common:name",
        json->unitGroupDataSet->unitGroupInformation->quantitativeReference->referenceToReferenceUnit,
        json->unitGroupDataSet->units->unit
    `;
  if (id && id.length === 36) {
    if (version && version.length === 9) {
      result = await supabase
        .from('unitgroups')
        .select(selectStr)
        .eq('id', id)
        .eq('version', version);
      if (result.data === null || result.data.length === 0) {
        result = await supabase
          .from('unitgroups')
          .select(selectStr)
          .eq('id', id)
          .order('version', { ascending: false })
          .range(0, 0);
      }
    } else {
      result = await supabase
        .from('unitgroups')
        .select(selectStr)
        .eq('id', id)
        .order('version', { ascending: false })
        .range(0, 0);
    }
    if (result?.data && result.data.length > 0) {
      const data = result.data[0];
      const dataList = jsonToList(data?.unit);
      const refData = dataList.find(
        (item) => item?.['@dataSetInternalID'] === data?.referenceToReferenceUnit,
      );
      return Promise.resolve({
        data: {
          id: data.id,
          version: data.version,
          name: data['common:name'],
          refUnitId: data?.referenceToReferenceUnit ?? '-',
          refUnitName: refData?.name ?? '-',
          refUnitGeneralComment: refData?.generalComment,
          unit: dataList,
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
