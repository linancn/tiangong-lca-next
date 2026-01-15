import { getRejectedCommentsByReviewIds } from '@/services/comments/api';
import {
  getRefData,
  getRefDataByIds,
  getReviewsOfData,
  updateDateToReviewState,
} from '@/services/general/api';
import { getLifeCycleModelDetail } from '@/services/lifeCycleModels/api';
import { FormProcess } from '@/services/processes/data';
import { addReviewsApi, getRejectReviewsByProcess } from '@/services/reviews/api';
import { getSourcesByIdsAndVersions } from '@/services/sources/api';
import { getTeamMessageApi } from '@/services/teams/api';
import { getUserId, getUsersByIds } from '@/services/users/api';

export class ConcurrencyController {
  private maxConcurrency: number;
  private running: number = 0;
  private queue: (() => Promise<any>)[] = [];

  constructor(maxConcurrency: number = 5) {
    this.maxConcurrency = maxConcurrency;
  }

  async add<T>(task: () => Promise<T>): Promise<T> {
    let outerResolve: (value: T | PromiseLike<T>) => void = () => {};
    let outerReject: (reason?: any) => void = () => {};

    const promise = new Promise<T>((resolve, reject) => {
      outerResolve = resolve;
      outerReject = reject;
    });

    const wrappedTask = async () => {
      try {
        const result = await task();
        outerResolve(result);
      } catch (error) {
        outerReject(error);
      } finally {
        this.running--;
        this.processQueue();
      }
    };
    this.queue.push(wrappedTask);
    this.processQueue();
    return promise;
  }

  private processQueue() {
    while (this.running < this.maxConcurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        this.running++;
        task();
      }
    }
  }

  async waitForAll(): Promise<void> {
    while (this.running > 0 || this.queue.length > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 10);
      });
    }
  }
}

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

    if (
      '@refObjectId' in current &&
      current['@refObjectId'] &&
      current['@version'] &&
      current['@type']
    ) {
      const tableName = getRefTableName(current['@type']);
      if (tableName !== undefined) {
        result.push(current);
      }
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
  versionUnderReview?: boolean;
  underReviewVersion?: string;
  versionIsInTg?: boolean;
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

  set(ref: refDataType, key: string, value: any): void {
    const visited = new Set<ReffPath>();

    const traverse = (node: ReffPath): boolean => {
      if (visited.has(node)) return false;
      visited.add(node);

      if (
        node['@refObjectId'] === ref['@refObjectId'] &&
        node['@version'] === ref['@version'] &&
        node['@type'] === ref['@type']
      ) {
        (node as any)[key] = value;
        return true;
      }

      for (const child of node.children) {
        if (traverse(child)) {
          return true;
        }
      }

      return false;
    };

    traverse(this);
  }

  findProblemNodes(actionFrom: 'checkData' | 'review' = 'checkData'): ReffPathNode[] {
    const result: ReffPath[] = [];
    const visited = new Set<ReffPath>();
    const uniqueKeys = new Set<string>();

    const getUniqueKey = (node: ReffPath) => `${node['@refObjectId']}_${node['@version']}`;

    const traverse = (node: ReffPath, parentPath: ReffPath[] = []) => {
      if (visited.has(node)) return;
      visited.add(node);

      let isProblemNode =
        node.ruleVerification === false ||
        node.nonExistent === true ||
        node?.versionIsInTg === true;

      if (actionFrom === 'checkData') {
        isProblemNode =
          isProblemNode ||
          (node?.versionUnderReview === true && node['@version'] !== node.underReviewVersion);
      } else if (actionFrom === 'review') {
        isProblemNode = isProblemNode || node?.versionUnderReview === true;
      }

      if (isProblemNode) {
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

const isCurrentVersionLessThanReleased = (
  currentVersion: string,
  releasedVersion: string,
): boolean => {
  if (!currentVersion || !releasedVersion) {
    return false;
  }

  const parseVersion = (version: string): number[] => {
    return version.split('.').map((part) => parseInt(part, 10) || 0);
  };

  const compareVersions = (v1: number[], v2: number[]): number => {
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const part1 = v1[i] || 0;
      const part2 = v2[i] || 0;
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }
    return 0;
  };

  const currentParts = parseVersion(currentVersion);
  const releaseParts = parseVersion(releasedVersion);
  return compareVersions(currentParts, releaseParts) < 0;
};

export const checkVersions = async (refs: Set<string>, path?: ReffPath) => {
  const refsRecord: Record<string, string[]> = {};

  // { type: { id: Set<version> } }
  const refsMap: Record<string, Record<string, Set<string>>> = {};

  refs.forEach((ref) => {
    const parts = ref.split(':');
    if (parts.length >= 3) {
      const id = parts[0];
      const version = parts[1];
      const type = parts[2];

      if (!refsRecord[type]) {
        refsRecord[type] = [];
      }
      if (!refsRecord[type].includes(id)) {
        refsRecord[type].push(id);
      }

      if (!refsMap[type]) {
        refsMap[type] = {};
      }
      if (!refsMap[type][id]) {
        refsMap[type][id] = new Set();
      }
      refsMap[type][id].add(version);
    }
  });

  for (let tableName of Object.keys(refsRecord)) {
    const { data: details } = await getRefDataByIds(
      refsRecord[tableName],
      getRefTableName(tableName),
    );

    if (details && details.length > 0) {
      details.forEach((detail: any) => {
        const referencedVersions = refsMap[tableName]?.[detail.id] || new Set();

        if (detail.state_code >= 20 && detail.state_code < 100) {
          referencedVersions.forEach((refVersion) => {
            if (path) {
              path.set(
                {
                  '@type': tableName,
                  '@refObjectId': detail.id,
                  '@version': refVersion,
                },
                'versionUnderReview',
                true,
              );
              path.set(
                {
                  '@type': tableName,
                  '@refObjectId': detail.id,
                  '@version': refVersion,
                },
                'underReviewVersion',
                detail.version,
              );
            }
          });
        }
        if (detail.state_code === 100) {
          referencedVersions.forEach((refVersion) => {
            if (isCurrentVersionLessThanReleased(refVersion, detail.version)) {
              if (path) {
                path.set(
                  {
                    '@type': tableName,
                    '@refObjectId': detail.id,
                    '@version': refVersion,
                  },
                  'versionIsInTg',
                  true,
                );
              }
            }
          });
        }
      });
    }
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
  requestKeysSet?: Set<string>,
): Promise<ReffPath | undefined> => {
  let currentPath: ReffPath | undefined;
  const requestKeys = requestKeysSet || new Set<string>();
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
          requestKeys,
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

  const controller = new ConcurrencyController(5);
  for (const ref of refs) {
    const key = `${ref['@refObjectId']}:${ref['@version']}:${ref['@type']}`;
    if (!requestKeys.has(key)) {
      requestKeys.add(key);
      controller.add(() => processRef(ref));
    }
  }

  await controller.waitForAll();
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
  const userId = await getUserId();
  const user = await getUsersByIds([userId]);
  const reviewJson = {
    data,
    team: {
      id: teamId,
      name: team?.data?.[0]?.json?.title,
    },
    user: {
      id: userId,
      name: user?.[0]?.display_name,
      email: user?.[0]?.email,
    },
    comment: {
      message: '',
    },
    logs: [
      {
        action: 'submit_review',
        time: new Date(),
        user: {
          id: userId,
          display_name: user?.[0]?.display_name,
        },
      },
    ],
  };
  const result = await addReviewsApi(reviewId, reviewJson);
  return result;
};

export const updateUnReviewToUnderReview = async (unReview: refDataType[], reviewId: string) => {
  const controller = new ConcurrencyController(5);
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

  for (const item of unReview) {
    controller.add(async () => {
      const result = await processItem(item);
      results.push(result);
      return result;
    });
  }

  await controller.waitForAll();
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
    // technology.processes' is not under any tab
    if (
      !obj ||
      typeof obj !== 'object' ||
      path.join('.').includes('lifeCycleModelInformation.technology.processes')
    ) {
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

export async function checkReviewReport(reviews: any) {
  const reportRefs: { id: string; version: string }[] = [];

  if (Array.isArray(reviews)) {
    reviews.forEach((review: any) => {
      const report = review?.['common:referenceToCompleteReviewReport'];
      if (report?.['@refObjectId'] && report?.['@version']) {
        reportRefs.push({
          id: report['@refObjectId'],
          version: report['@version'],
        });
      }
    });
  } else {
    const report = reviews?.['common:referenceToCompleteReviewReport'];
    if (report?.['@refObjectId'] && report?.['@version']) {
      reportRefs.push({
        id: report['@refObjectId'],
        version: report['@version'],
      });
    }
  }

  if (reportRefs.length === 0) {
    return [];
  }

  const sources = await getSourcesByIdsAndVersions(reportRefs);

  const reportUnderReview: any[] = [];
  sources?.data?.forEach((item: any) => {
    if (item.state_code >= 20 && item.state_code < 100) {
      reportUnderReview.push({
        id: item.id,
        version: item.version,
        stateCode: item.state_code,
      });
    }
  });

  return reportUnderReview;
}

export const getRejectedComments = async (processId: string, processVersion: string) => {
  if (!processId || !processVersion) {
    return [];
  }

  const { data: reviewData, error: reviewError } = await getRejectReviewsByProcess(
    processId,
    processVersion,
  );

  if (reviewError || !reviewData || reviewData.length === 0) {
    return [];
  }

  const reviewIds = reviewData.map((review) => review?.id);

  if (!reviewIds.length) {
    return [];
  }

  const { data: commentsData, error: commentsError } =
    await getRejectedCommentsByReviewIds(reviewIds);

  if (commentsError || !commentsData || commentsData.length === 0) {
    return [];
  }

  return commentsData.map((e) => e.json);
};

export const mergeCommentsToData = (
  comments: FormProcess['modellingAndValidation'][],
  data: FormProcess,
) => {
  // Merge rejected comments into formData.modellingAndValidation
  if (Array.isArray(comments) && comments.length) {
    data.modellingAndValidation = data.modellingAndValidation || {};
    comments.forEach((r: any) => {
      const mv = r?.modellingAndValidation || {};

      // merge validation
      if (mv.validation) {
        if (!data.modellingAndValidation.validation) {
          data.modellingAndValidation.validation = mv.validation;
        } else {
          Object.keys(mv.validation).forEach((k) => {
            const val = mv.validation[k];
            const target = data.modellingAndValidation.validation as any;
            if (Array.isArray(val)) {
              if (!Array.isArray(target[k])) target[k] = [];
              target[k] = [...target[k], ...val];
            } else {
              if (Array.isArray(target[k])) target[k].push(val);
              else if (target[k] !== undefined) target[k] = [target[k], val];
              else target[k] = val;
            }
          });
        }
      }

      // merge complianceDeclarations
      if (mv.complianceDeclarations) {
        if (!data.modellingAndValidation.complianceDeclarations) {
          data.modellingAndValidation.complianceDeclarations = mv.complianceDeclarations;
        } else {
          Object.keys(mv.complianceDeclarations).forEach((k) => {
            const val = mv.complianceDeclarations[k];
            const target = data.modellingAndValidation.complianceDeclarations as any;
            if (Array.isArray(val)) {
              if (!Array.isArray(target[k])) target[k] = [];
              target[k] = [...target[k], ...val];
            } else {
              if (Array.isArray(target[k])) target[k].push(val);
              else if (target[k] !== undefined) target[k] = [target[k], val];
              else target[k] = val;
            }
          });
        }
      }
    });
  }
};
