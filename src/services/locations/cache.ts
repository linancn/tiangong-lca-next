import { ExpiringMemoryCache } from '../general/expiringMemoryCache';
import { getReferenceResourceDefinition } from '../referenceResources/manifest';
import {
  reportReferenceResourceResolution,
  resolveReferenceResource,
} from '../referenceResources/resolver';
import { getILCDLocationEntries } from './api';

const getResolvedLocationResourceIdentity = (lang: string): string => {
  const definition = getReferenceResourceDefinition('ilcd-locations');
  const resolution = resolveReferenceResource('ilcd-locations', lang);
  reportReferenceResourceResolution(resolution);
  const localizedAsset = resolution.localizedAsset ?? resolution.baseAsset;

  return [
    `ilcd-locations@${definition.cacheRevision}`,
    resolution.baseAsset.fileName,
    localizedAsset.fileName,
  ].join(':');
};

class LocationCache {
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

  async getILCDLocationByValues(
    lang: string,
    getValues: string[],
  ): Promise<Array<Record<string, unknown>>> {
    if (!getValues || getValues.length === 0) {
      return [];
    }

    const validValues = getValues.filter((value) => value !== null && value !== undefined);
    if (validValues.length === 0) {
      return [];
    }

    const normalizedValues = [...validValues].sort();
    const cacheKey = this.cache.createKey(
      'ilcd_location',
      getResolvedLocationResourceIdentity(lang),
      normalizedValues.join(','),
    );
    const cached = this.get<Array<Record<string, unknown>>>(cacheKey);

    if (cached) {
      console.log('[Cache Hit] ILCD Location:', validValues.length, 'values');
      return cached;
    }

    console.log('[Cache Miss] ILCD Location:', validValues.length, 'values');

    let data: Array<Record<string, unknown>>;
    try {
      data =
        ((await getILCDLocationEntries(lang, normalizedValues)) as Array<
          Record<string, unknown>
        > | null) ?? [];
    } catch (error) {
      console.error(
        `[i18n-reference-resource] Failed to resolve location labels for ${lang}; preserving raw location codes.`,
        error,
      );
      return [];
    }

    this.set(cacheKey, data);

    return data;
  }
}

export const locationCache = new LocationCache();

export async function getCachedLocationData(lang: string, locations: string[]) {
  return locationCache.getILCDLocationByValues(lang, locations);
}
