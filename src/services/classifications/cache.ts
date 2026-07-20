import type { Classification } from '../general/data';
import { ExpiringMemoryCache } from '../general/expiringMemoryCache';
import {
  getReferenceResourceDefinition,
  type ReferenceResourceId,
} from '../referenceResources/manifest';
import {
  reportReferenceResourceResolution,
  resolveReferenceResource,
} from '../referenceResources/resolver';
import { getILCDClassification as fetchILCDClassification, getILCDFlowCategorization } from './api';

const getClassificationResourceId = (categoryType: string): ReferenceResourceId => {
  if (categoryType === 'Flow') {
    return 'cpc';
  }
  if (categoryType === 'Process' || categoryType === 'LifeCycleModel') {
    return 'isic';
  }
  return 'ilcd-classification';
};

const getResolvedResourceIdentity = (resourceId: ReferenceResourceId, lang: string): string => {
  const definition = getReferenceResourceDefinition(resourceId);
  const resolution = resolveReferenceResource(resourceId, lang);
  reportReferenceResourceResolution(resolution);
  const localizedAsset = resolution.localizedAsset ?? resolution.baseAsset;

  return [
    `${resourceId}@${definition.cacheRevision}`,
    resolution.baseAsset.fileName,
    localizedAsset.fileName,
  ].join(':');
};

class ClassificationCache {
  private cache = new ExpiringMemoryCache();

  private async getILCDFlowCategorizationResult(lang: string) {
    return getILCDFlowCategorization(lang, ['all']);
  }

  private async getILCDClassificationResult(
    categoryType: string,
    lang: string,
    getValues: string[],
  ): Promise<{ data: Classification[]; success: boolean }> {
    const resourceIdentity = getResolvedResourceIdentity(
      getClassificationResourceId(categoryType),
      lang,
    );
    const cacheKey = this.cache.createKey(
      'ilcd_classification',
      categoryType,
      resourceIdentity,
      getValues.join(','),
    );
    const cached = this.get<Classification[]>(cacheKey);

    if (cached) {
      console.log('[Cache Hit] ILCD Classification:', categoryType, lang);
      return { data: cached, success: true };
    }

    console.log('[Cache Miss] ILCD Classification:', categoryType, lang);
    const result = await fetchILCDClassification(categoryType, lang, getValues);

    if (result.success) {
      this.set(cacheKey, result.data);
    }

    return result;
  }

  get<T>(key: string): T | null {
    return this.cache.get<T>(key);
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, data, ttl);
  }

  clear(): void {
    this.cache.clear();
  }

  clearPrefix(prefix: string): void {
    this.cache.clearPrefix(prefix);
  }

  async getILCDFlowCategorizationAll(lang: string): Promise<Classification[]> {
    const result = await this.getILCDFlowCategorizationResult(lang);
    return result.data;
  }

  async getILCDClassification(
    categoryType: string,
    lang: string,
    getValues: string[],
  ): Promise<Classification[]> {
    const result = await this.getILCDClassificationResult(categoryType, lang, getValues);
    return result.data;
  }

  async getFlowReferenceDataAll(lang: string): Promise<{
    category: Classification[];
    categoryElementaryFlow: Classification[];
  }> {
    const classificationIdentity = getResolvedResourceIdentity('cpc', lang);
    const categorizationIdentity = getResolvedResourceIdentity('ilcd-flow-categorization', lang);
    const cacheKey = this.cache.createKey(
      'flow_ref_all',
      classificationIdentity,
      categorizationIdentity,
    );
    const cached = this.get<{
      category: Classification[];
      categoryElementaryFlow: Classification[];
    }>(cacheKey);

    if (cached) {
      console.log('[Cache Hit] Flow Reference Data All');
      return cached;
    }

    console.log('[Cache Miss] Flow Reference Data All - fetching...');

    const [classificationResult, flowCategorizationResult] = await Promise.all([
      this.getILCDClassificationResult('Flow', lang, ['all']),
      this.getILCDFlowCategorizationResult(lang),
    ]);

    const data = {
      category: classificationResult.data,
      categoryElementaryFlow: flowCategorizationResult.data,
    };

    if (classificationResult.success && flowCategorizationResult.success) {
      this.set(cacheKey, data);
    }

    return data;
  }
}

export const classificationCache = new ClassificationCache();

export async function getCachedFlowCategorizationAll(lang: string) {
  return classificationCache.getFlowReferenceDataAll(lang);
}

export async function getCachedClassificationData(
  categoryType: string,
  lang: string,
  getIds: string[],
) {
  return classificationCache.getILCDClassification(categoryType, lang, getIds);
}
