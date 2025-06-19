import { getRefData, getReviewsOfData, updateDateToReviewState } from '@/services/general/api';
import { addReviewsApi } from '@/services/reviews/api';
import { getTeamMessageApi } from '@/services/teams/api';
import { getUsersByIds } from '@/services/users/api';
import { get } from 'lodash';

export type refDataType = {
  '@type': string;
  '@refObjectId': string;
  '@version': string;
};

type ReffPathNode = {
  '@refObjectId': string;
  '@version': string;
  '@type': string;
  ruleVerification: boolean;
  nonExistent: boolean;
};

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

export class ReffPath {
  '@refObjectId': string;
  '@version': string;
  '@type': string;
  children: ReffPath[] = [];
  ruleVerification: boolean;
  nonExistent: boolean;

  constructor(ref: refDataType, ruleVerification: boolean = false, nonExistent: boolean = false) {
    this['@refObjectId'] = ref['@refObjectId'];
    this['@version'] = ref['@version'];
    this['@type'] = ref['@type'];
    this.ruleVerification = ruleVerification;
    this.nonExistent = nonExistent;
  }

  addChild(child: ReffPath) {
    this.children.push(child);
  }

  findProblemNodes(): ReffPathNode[] {
    const result: ReffPath[] = [];
    const visited = new Set<ReffPath>();
    const uniqueKeys = new Set<string>();

    const getUniqueKey = (node: ReffPath) => `${node['@refObjectId']}_${node['@version']}`;

    const traverse = (node: ReffPath, parentPath: ReffPath[] = []) => {
      if (visited.has(node)) return;
      visited.add(node);

      if (node.ruleVerification === false || node.nonExistent === true) {
        const nodeKey = getUniqueKey(node);
        if (!uniqueKeys.has(nodeKey)) {
          result.push(node);
          uniqueKeys.add(nodeKey);
        }

        parentPath.forEach((parent) => {
          const parentKey = getUniqueKey(parent);
          if (!uniqueKeys.has(parentKey)) {
            result.push(parent);
            uniqueKeys.add(parentKey);
          }
        });
      }

      node.children.forEach((child) => {
        traverse(child, [...parentPath, node]);
      });
    };

    traverse(this);
    return result.map(({ ...rest }) => rest);
  }
}

export const checkReferences = async (
  refs: any[],
  refMaps: Map<string, any>,
  userTeamId: string,
  unReview: refDataType[],
  underReview: refDataType[],
  unRuleVerification: refDataType[],
  nonExistentRef: refDataType[],
  parentPath?: ReffPath,
): Promise<ReffPath | undefined> => {
  for (const ref of refs) {
    if (refMaps.has(`${ref['@refObjectId']}:${ref['@version']}`)) {
      const refData = refMaps.get(`${ref['@refObjectId']}:${ref['@version']}`);

      if (refData?.stateCode !== 100 && refData?.stateCode !== 200) {
        const currentPath = new ReffPath(ref, refData?.ruleVerification, false);
        if (parentPath) {
          parentPath.addChild(currentPath);
        }
      }
      continue;
    }
    const refResult = await getRefData(
      ref['@refObjectId'],
      ref['@version'],
      getRefTableName(ref['@type']),
      userTeamId,
    );
    refMaps.set(`${ref['@refObjectId']}:${ref['@version']}`, refResult?.data);

    let currentPath: ReffPath | undefined;
    if (refResult.success) {
      const refData = refResult?.data;
      if (refData?.stateCode !== 100 && refData?.stateCode !== 200) {
        currentPath = new ReffPath(ref, refData?.ruleVerification, !refResult.success);
        if (parentPath) {
          parentPath.addChild(currentPath);
        }
      }
      if (!refData?.ruleVerification && refData?.stateCode !== 100 && refData?.stateCode !== 200) {
        if (
          !unRuleVerification.find(
            (item) =>
              item['@refObjectId'] === ref['@refObjectId'] && item['@version'] === ref['@version'],
          )
        ) {
          unRuleVerification.push(ref);
        }
      }

      if (refData?.stateCode >= 20 && refData?.stateCode < 100) {
        if (
          !underReview.find(
            (item) =>
              item['@refObjectId'] === ref['@refObjectId'] && item['@version'] === ref['@version'],
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
              item['@refObjectId'] === ref['@refObjectId'] && item['@version'] === ref['@version'],
          )
        ) {
          unReview.push(ref);
        }

        const subRefs = getAllRefObj(json);
        await checkReferences(
          subRefs,
          refMaps,
          userTeamId,
          unReview,
          underReview,
          unRuleVerification,
          nonExistentRef,
          currentPath,
        );
      }
    } else {
      currentPath = new ReffPath(ref, true, true);
      if (parentPath) {
        parentPath.addChild(currentPath);
      }
      if (
        !nonExistentRef.find(
          (item) =>
            item['@refObjectId'] === ref['@refObjectId'] && item['@version'] === ref['@version'],
        )
      ) {
        nonExistentRef.push(ref);
      }
    }
  }
  return parentPath;
};

export const checkData = async (
  data: refDataType,
  unRuleVerification: refDataType[],
  nonExistentRef: refDataType[],
) => {
  const { data: detail } = await getRefData(
    data['@refObjectId'],
    data['@version'],
    getRefTableName(data['@type']),
  );
  if (detail) {
    const refs = getAllRefObj(detail?.json);
    await checkReferences(
      refs,
      new Map<string, any>(),
      '',
      [],
      [],
      unRuleVerification,
      nonExistentRef,
    );
  }
};

export const dealProcress = (
  processDetail: any,
  unReview: refDataType[],
  underReview: refDataType[],
  unRuleVerification: refDataType[],
  nonExistentRef: refDataType[],
) => {
  const procressRef = {
    '@type': 'process data set',
    '@refObjectId': processDetail.id,
    '@version': processDetail.version,
  };
  if (processDetail.stateCode < 20) {
    unReview.push(procressRef);
  }
  if (processDetail.stateCode >= 20 && processDetail.stateCode < 100) {
    underReview.push(procressRef);
  }
  if (
    !processDetail?.ruleVerification &&
    processDetail.stateCode !== 100 &&
    processDetail.stateCode !== 200
  ) {
    unRuleVerification.unshift(procressRef);
  }
  if (!processDetail) {
    nonExistentRef.push(procressRef);
  }
};

export const dealModel = (
  modelDetail: any,
  unReview: refDataType[],
  underReview: refDataType[],
  unRuleVerification: refDataType[],
  nonExistentRef: refDataType[],
) => {
  if (modelDetail?.stateCode < 20) {
    unReview.push({
      '@type': 'lifeCycleModel data set',
      '@refObjectId': modelDetail?.id,
      '@version': modelDetail?.version,
    });
  }
  if (modelDetail?.stateCode >= 20 && modelDetail?.stateCode < 100) {
    underReview.push({
      '@type': 'lifeCycleModel data set',
      '@refObjectId': modelDetail?.id,
      '@version': modelDetail?.version,
    });
  }
  if (
    !modelDetail?.ruleVerification &&
    modelDetail?.stateCode !== 100 &&
    modelDetail?.stateCode !== 200
  ) {
    unRuleVerification.unshift({
      '@type': 'lifeCycleModel data set',
      '@refObjectId': modelDetail?.id,
      '@version': modelDetail?.version,
    });
  }
  if (!modelDetail) {
    nonExistentRef.push({
      '@type': 'lifeCycleModel data set',
      '@refObjectId': modelDetail?.id,
      '@version': modelDetail?.version,
    });
  }
};

export const updateReviewsAfterCheckData = async (teamId: string, data: any, reviewId: string) => {
  const team = await getTeamMessageApi(teamId);
  const user = await getUsersByIds([sessionStorage.getItem('userId') ?? '']);
  const reviewJson = {
    data,
    team: {
      id: teamId,
      name: team?.data?.[0]?.json?.title,
    },
    user: {
      id: sessionStorage.getItem('userId'),
      name: user?.[0]?.display_name,
      email: user?.[0]?.email,
    },
    comment: {
      message: '',
    },
  };
  const result = await addReviewsApi(reviewId, reviewJson);
  return result;
};

export const updateUnReviewToUnderReview = async (unReview: refDataType[], reviewId: string) => {
  for (const item of unReview) {
    const oldReviews = await getReviewsOfData(
      item['@refObjectId'],
      item['@version'],
      getRefTableName(item['@type']),
    );
    const updateData = {
      state_code: 20,
      reviews: [
        ...oldReviews,
        {
          key: oldReviews?.length,
          id: reviewId,
        },
      ],
    };
    await updateDateToReviewState(
      item['@refObjectId'],
      item['@version'],
      getRefTableName(item['@type']),
      updateData,
    );
  }
};

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
