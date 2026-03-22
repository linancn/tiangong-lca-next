import type { Classification } from '../general/data';
import { ExpiringMemoryCache } from '../general/expiringMemoryCache';
import { getILCDClassification as fetchILCDClassification, getILCDFlowCategorization } from './api';

class ClassificationCache {
  private cache = new ExpiringMemoryCache();

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
    const result = await getILCDFlowCategorization(lang, ['all']);
    return result.data;
  }

  async getILCDClassification(
    categoryType: string,
    lang: string,
    getValues: string[],
  ): Promise<Classification[]> {
    const cacheKey = this.cache.createKey(
      'ilcd_classification',
      categoryType,
      lang,
      getValues.join(','),
    );
    const cached = this.get<Classification[]>(cacheKey);

    if (cached) {
      console.log('[Cache Hit] ILCD Classification:', categoryType, lang);
      return cached;
    }

    console.log('[Cache Miss] ILCD Classification:', categoryType, lang);
    const result = await fetchILCDClassification(categoryType, lang, getValues);
    const newDatas = result.data;

    this.set(cacheKey, newDatas);

    return newDatas;
  }

  async getFlowReferenceDataAll(lang: string): Promise<{
    category: Classification[];
    categoryElementaryFlow: Classification[];
  }> {
    const cacheKey = this.cache.createKey('flow_ref_all', lang);
    const cached = this.get<{
      category: Classification[];
      categoryElementaryFlow: Classification[];
    }>(cacheKey);

    if (cached) {
      console.log('[Cache Hit] Flow Reference Data All');
      return cached;
    }

    console.log('[Cache Miss] Flow Reference Data All - fetching...');

    const [classification, flowCategorization] = await Promise.all([
      this.getILCDClassification('Flow', lang, ['all']),
      this.getILCDFlowCategorizationAll(lang),
    ]);

    const data = {
      category: classification,
      categoryElementaryFlow: flowCategorization,
    };

    this.set(cacheKey, data);

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
