import { getRefData, getReviewsOfData, updateDateToReviewState } from '@/services/general/api';
import { getLifeCycleModelDetail } from '@/services/lifeCycleModels/api';
import { addReviewsApi } from '@/services/reviews/api';
import { getTeamMessageApi } from '@/services/teams/api';
import { getUsersByIds } from '@/services/users/api';

function get(obj: any, path: string, defaultValue?: any): any {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }

  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined || typeof result !== 'object' || !(key in result)) {
      return defaultValue;
    }
    result = result[key];
  }

  return result;
}

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
  const visited = new WeakSet();

  const traverse = (current: any) => {
    if (!current || typeof current !== 'object') return;

    // Prevent circular references
    if (visited.has(current)) return;
    visited.add(current);

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
    processDetail?.ruleVerification === false &&
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
    modelDetail?.ruleVerification === false &&
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
  let currentPath: ReffPath | undefined;
  const handelSameModelWithProcress = async (ref: refDataType) => {
    if (ref['@type'] === 'process data set') {
      const { data: sameModelWithProcress, success } = await getLifeCycleModelDetail(
        ref['@refObjectId'],
        ref['@version'],
      );
      if (sameModelWithProcress && success) {
        dealModel(sameModelWithProcress, unReview, underReview, unRuleVerification, nonExistentRef);
        const modelRefs = getAllRefObj(sameModelWithProcress);
        await checkReferences(
          modelRefs,
          refMaps,
          userTeamId,
          unReview,
          underReview,
          unRuleVerification,
          nonExistentRef,
          currentPath,
        );
      }
    }
  };

  const processRef = async (ref: any) => {
    if (refMaps.has(`${ref['@refObjectId']}:${ref['@version']}:${ref['@type']}`)) {
      const refData = refMaps.get(`${ref['@refObjectId']}:${ref['@version']}:${ref['@type']}`);

      if (refData?.stateCode !== 100 && refData?.stateCode !== 200) {
        const currentPath = new ReffPath(ref, refData?.ruleVerification, false);
        if (parentPath) {
          parentPath.addChild(currentPath);
        }
      }
      await handelSameModelWithProcress(ref);
      return;
    }
    const refResult = await getRefData(
      ref['@refObjectId'],
      ref['@version'],
      getRefTableName(ref['@type']),
      userTeamId,
    );
    refMaps.set(`${ref['@refObjectId']}:${ref['@version']}:${ref['@type']}`, refResult?.data);

    if (refResult.success && refResult?.data) {
      const refData = refResult?.data;
      if (refData?.stateCode !== 100 && refData?.stateCode !== 200) {
        currentPath = new ReffPath(ref, refData?.ruleVerification, !refResult.success);
        if (parentPath) {
          parentPath.addChild(currentPath);
        }
      }
      if (
        refData?.ruleVerification === false &&
        refData?.stateCode !== 100 &&
        refData?.stateCode !== 200
      ) {
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
      await handelSameModelWithProcress(ref);
    } else {
      currentPath = new ReffPath(ref, true, true);
      if (parentPath) {
        parentPath.addChild(currentPath);
      }
      if (
        !nonExistentRef.find(
          (item) =>
            item['@refObjectId'] === ref['@refObjectId'] && item['@version'] === ref['@version'],
        ) &&
        ref['@type'] !== 'lifeCycleModel data set'
      ) {
        nonExistentRef.push(ref);
      }
    }
  };

  const processRefsWithConcurrency = async (refs: any[], concurrencyLimit: number = 5) => {
    const chunks = [];
    for (let i = 0; i < refs.length; i += concurrencyLimit) {
      chunks.push(refs.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(processRef));
    }
  };

  await processRefsWithConcurrency(refs);
  return parentPath;
};

export const checkData = async (
  data: refDataType,
  unRuleVerification: refDataType[],
  nonExistentRef: refDataType[],
  pathRef: ReffPath,
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
      pathRef,
    );
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
  const concurrencyLimit = 5;
  const pendingRequests = new Set<Promise<any>>();
  const queue = [...unReview];
  const results: any[] = [];

  const processItem = async (item: refDataType) => {
    try {
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
      const result = await updateDateToReviewState(
        item['@refObjectId'],
        item['@version'],
        getRefTableName(item['@type']),
        updateData,
      );
      return { success: true, result, item };
    } catch (error) {
      return { success: false, error, item };
    }
  };

  const addNextRequest = () => {
    if (queue.length > 0 && pendingRequests.size < concurrencyLimit) {
      const item = queue.shift()!;
      const requestPromise = processItem(item).then((result) => {
        results.push(result);
        pendingRequests.delete(requestPromise);
        addNextRequest();
        return result;
      });
      pendingRequests.add(requestPromise);
    }
  };

  for (let i = 0; i < Math.min(concurrencyLimit, unReview.length); i++) {
    addNextRequest();
  }

  while (pendingRequests.size > 0) {
    await Promise.race(pendingRequests);
  }

  return results;
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
  const errTabNames: string[] = [];
  const collectedTabNames = new Set<string>();

  if (!formData || Object.keys(formData).length === 0) {
    return { checkResult: false, errTabNames };
  }
  const collectErrTabNames = (tabName: string) => {
    if (tabName && tabName?.length && !collectedTabNames.has(tabName)) {
      errTabNames.push(tabName);
      collectedTabNames.add(tabName);
    }
  };
  for (let field of Object.keys(requiredFields)) {
    const value = get(formData, field);
    if (field === 'modellingAndValidation.validation.review') {
      const { checkResult, tabName } = checkValidationFields(value);
      if (!checkResult) {
        collectErrTabNames(tabName ?? '');
        // return { checkResult, tabName };
      }
    }

    if (field === 'modellingAndValidation.complianceDeclarations.compliance') {
      const { checkResult, tabName } = checkComplianceFields(value);
      if (!checkResult) {
        collectErrTabNames(tabName ?? '');
        // return { checkResult, tabName };
      }
    }

    if (field.includes('common:classification.common:class')) {
      if (!value || (value?.id ?? []).some((item: any) => !item)) {
        collectErrTabNames(requiredFields[field] ?? '');
        // return { checkResult: false, tabName: requiredFields[field] };
      }
    }
    if (!value) {
      collectErrTabNames(requiredFields[field] ?? '');
      // return { checkResult: false, tabName: requiredFields[field] };
    }

    if (Array.isArray(value) && (value.length === 0 || value.every((item) => !item))) {
      collectErrTabNames(requiredFields[field] ?? '');
      // return { checkResult: false, tabName: requiredFields[field] };
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (Object.keys(value).length === 0) {
        collectErrTabNames(requiredFields[field] ?? '');
        // return { checkResult: false, tabName: requiredFields[field] };
      }
      const allPropsEmpty = Object.values(value).every(
        (propValue) => propValue === undefined || propValue === null,
      );
      if (allPropsEmpty) {
        collectErrTabNames(requiredFields[field] ?? '');
        // return { checkResult: false, tabName: requiredFields[field] };
      }
    }
  }

  return { checkResult: errTabNames.length === 0, errTabNames };
};

export function getErrRefTab(ref: refDataType, data: any): string | null {
  if (!data || !ref) {
    return null;
  }

  const visited = new WeakSet();

  const findRefInObject = (obj: any, path: string[] = []): string | null => {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    if (visited.has(obj)) {
      return null;
    }
    visited.add(obj);

    if (obj['@refObjectId'] && obj['@version'] && obj['@type']) {
      if (obj['@refObjectId'] === ref['@refObjectId'] && obj['@version'] === ref['@version']) {
        return path[0] || null;
      }
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            const result = findRefInObject(value[i], [...path, key]);
            if (result) {
              return result;
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          const result = findRefInObject(value, [...path, key]);
          if (result) {
            return result;
          }
        }
      }
    }

    return null;
  };

  return findRefInObject(data);
}
