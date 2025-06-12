import { get } from 'lodash';
import { getRefData } from '@/services/general/api';
import { getUsersByIds } from '@/services/users/api';
import { addReviewsApi } from '@/services/reviews/api';
import { getTeamMessageApi } from '@/services/teams/api';
import { updateDateToReviewState, getReviewsOfData } from '@/services/general/api';

export type refDataType = {
  '@type': string,
  '@refObjectId': string,
  '@version': string,
}
const tableDict = {
  'contact data set': 'contacts',
  'source data set': 'sources',
  'unit group data set': 'unitgroups',
  'flow property data set': 'flowproperties',
  'flow data set': 'flows',
  'process data set': 'processes',
  'lifeCycleModel data set': 'lifecyclemodels',
};


export const getRefTableName = (type: string) => {
  return tableDict[type as keyof typeof tableDict] ?? undefined;
};

export const getAllRefObj = (obj: any): any[] => {
  const result: any[] = [];

  const traverse = (current: any) => {
    if (!current || typeof current !== 'object') return;

    if ('@refObjectId' in current && current['@refObjectId'] && current['@version']) {
      result.push(current);
    }

    if (Array.isArray(current)) {
      current.forEach((item) => traverse(item));
    } else if (typeof current === 'object') {
      Object.values(current).forEach((value) => traverse(value));
    }
  };

  traverse(obj);
  return result;
};

export const checkReferences = async (
  refs: any[],
  checkedIds: Set<string>,
  userTeamId: string,
  unReview: refDataType[],
  underReview: refDataType[],
  unRuleVerification: refDataType[],
  nonExistentRef: refDataType[]
) => {
  for (const ref of refs) {
    if (checkedIds.has(ref['@refObjectId'])) continue;
    checkedIds.add(ref['@refObjectId']);

    const refResult = await getRefData(
      ref['@refObjectId'],
      ref['@version'],
      getRefTableName(ref['@type']),
      userTeamId,
    );

    if (refResult.success) {
      const refData = refResult?.data;
      if (
        !refData?.ruleVerification &&
        refData?.stateCode !== 100 &&
        refData?.stateCode !== 200
      ) {
        if (
          !unRuleVerification.find(
            (item) =>
              item['@refObjectId'] === ref['@refObjectId'] &&
              item['@version'] === ref['@version'],
          )
        ) {
          unRuleVerification.push(ref);
        }
      }

      if (refData?.stateCode >= 20 && refData?.stateCode < 100) {
        if (
          !underReview.find(
            (item) =>
              item['@refObjectId'] === ref['@refObjectId'] &&
              item['@version'] === ref['@version'],
          )
        ) {
          underReview.push(ref);
        }
      }

      if (refData?.stateCode < 20) {
        const json = refData?.json;
        if (
          !unReview.find(
            (item) =>
              item['@refObjectId'] === ref['@refObjectId'] &&
              item['@version'] === ref['@version'],
          )
        ) {
          unReview.push(ref);
        }

        const subRefs = getAllRefObj(json);
        await checkReferences(subRefs, checkedIds,userTeamId,unReview,underReview,unRuleVerification,nonExistentRef);
      }
    } else {
      if (
        !nonExistentRef.find(
          (item) =>
            item['@refObjectId'] === ref['@refObjectId'] &&
            item['@version'] === ref['@version'],
        )
      ) {
        nonExistentRef.push(ref);
      }
    }
  }
};

export const dealProcress = (processDetail: any, unReview: refDataType[], underReview: refDataType[], unRuleVerification: refDataType[], nonExistentRef: refDataType[]) => {
  const procressRef = {
    '@type': 'process data set',
    '@refObjectId': processDetail.id,
    '@version': processDetail.version,
  }
  if (processDetail.stateCode < 20) {
    unReview.push(procressRef);
  }
  if (processDetail.stateCode >= 20 && processDetail.stateCode < 100) {
    underReview.push(procressRef);
  }
  if (!processDetail?.ruleVerification && processDetail.stateCode !== 100 && processDetail.stateCode !== 200) {
    unRuleVerification.unshift(procressRef);
  }
  if (!processDetail) {
    nonExistentRef.push(procressRef);
  }
}

export const dealModel = (modelDetail: any, unReview: refDataType[], underReview: refDataType[], unRuleVerification: refDataType[]) => {
  if (
    modelDetail?.data?.state_code < 20
  ) {
    unReview.push({
      '@type': 'lifeCycleModel data set',
      '@refObjectId': modelDetail?.id,
      '@version': modelDetail?.version,
    });
  }
  if (
    modelDetail?.data?.state_code >= 20 &&
    modelDetail?.data?.state_code < 100
  ) {
    underReview.push({
      '@type': 'lifeCycleModel data set',
      '@refObjectId': modelDetail?.id,
      '@version': modelDetail?.version,
    });
  }
  if (
    !modelDetail?.data?.rule_verification &&
    modelDetail?.data?.state_code !== 100 &&
    modelDetail?.data?.state_code !== 200
  ) {
    unRuleVerification.unshift({
      '@type': 'lifeCycleModel data set',
      '@refObjectId': modelDetail?.data?.id,
      '@version': modelDetail?.data?.version,
    });
  }
}

export const getAllProcessesOfModel = async (modelDetail: any) => {
  const processes: any[] = [{ id: modelDetail.id, version: modelDetail.version }];
  modelDetail?.data?.json_tg?.xflow?.nodes?.forEach((item: any) => {
    if (item.data) {
      processes.push(item.data);
    }
  });
  return processes;
};
export const updateReviewsAfterCheckData = async (teamId:string,data:any,reviewId:string)=>{
  const team = await getTeamMessageApi(teamId);
  const user = await getUsersByIds([sessionStorage.getItem('userId') ?? '']);
  const reviewJson = {
    data,
    team: {
      id: teamId,
      name: team?.data?.[0]?.json?.title
    },
    user: {
      id: sessionStorage.getItem('userId'),
      name: user?.[0]?.display_name,
      email: user?.[0]?.email
    },
    comment: {
      message: ''
    }
  }
  const result = await addReviewsApi(reviewId, reviewJson);
  return result;
}

export const updateUnReviewToUnderReview = async (unReview: refDataType[],reviewId:string)=>{
  for (const item of unReview) {
    const oldReviews = await getReviewsOfData(item['@refObjectId'], item['@version'], getRefTableName(item['@type']));
    const updateData = {
      state_code: 20,
      reviews: [
        ...oldReviews,
        {
          key: oldReviews?.length,
          id: reviewId
        }
      ]
    }
    await updateDateToReviewState(
      item['@refObjectId'],
      item['@version'],
      getRefTableName(item['@type']),
      updateData
    );
  }
}

 const checkValidationFields = (data: any) => {
  if (!data) {
    return { checkResult: false, tabName: 'validation' };
  }
  if (
    data.every(
      (review: any) =>
        review['@type'] &&
        review['common:scope'] &&
        review['common:scope']?.length &&
        review['common:scope'].every(
          (item: any) => item['@name'] && item['common:method'] && item['common:method']['@name'],
        ) &&
        review['common:reviewDetails'] &&
        review['common:reviewDetails']?.length &&
        review['common:reviewDetails'].every((item: any) => item !== undefined),
    )
  ) {
    return { checkResult: true, tabName: null };
  }

  return { checkResult: false, tabName: 'validation' };
};

 const checkComplianceFields = (data: any) => {
  if (!data || !data?.length) {
    return { checkResult: false, tabName: 'complianceDeclarations' };
  }

  for (let item of data) {
    if (!item) {
      return { checkResult: false, tabName: 'complianceDeclarations' };
    }
    for (let key of Object.keys(item)) {
      if (key === 'common:referenceToComplianceSystem') {
        if (!item[key]?.['@refObjectId']) {
          return { checkResult: false, tabName: 'complianceDeclarations' };
        }
      }
      if (item[key] === null || item[key] === undefined) {
        return { checkResult: false, tabName: 'complianceDeclarations' };
      }
    }
  }
  return { checkResult: true, tabName: null };
};

export const checkRequiredFields = (requiredFields: any, formData: any) => {
  if (!formData || Object.keys(formData).length === 0) {
    return { checkResult: false, tabName: '' };
  }
  for (let field of Object.keys(requiredFields)) {
    const value = get(formData, field);
    if (field === 'modellingAndValidation.validation.review') {
      const { checkResult, tabName } = checkValidationFields(value);
      if (!checkResult) {
        return { checkResult, tabName };
      }
    }

    if (field === 'modellingAndValidation.complianceDeclarations.compliance') {
      const { checkResult, tabName } = checkComplianceFields(value);
      if (!checkResult) {
        return { checkResult, tabName };
      }
    }

    if (field.includes('common:classification.common:class')) {
      if (!value || (value?.id ?? []).some((item: any) => !item)) {
        return { checkResult: false, tabName: requiredFields[field] };
      }
    }
    if (!value) {
      return { checkResult: false, tabName: requiredFields[field] };
    }

    if (Array.isArray(value) && (value.length === 0 || value.every((item) => !item))) {
      return { checkResult: false, tabName: requiredFields[field] };
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (Object.keys(value).length === 0) {
        return { checkResult: false, tabName: requiredFields[field] };
      }
      const allPropsEmpty = Object.values(value).every(
        (propValue) => propValue === undefined || propValue === null,
      );
      if (allPropsEmpty) {
        return { checkResult: false, tabName: requiredFields[field] };
      }
    }
  }

  return { checkResult: true, tabName: null };
};