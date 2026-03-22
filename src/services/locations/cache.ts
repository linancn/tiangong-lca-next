import { ExpiringMemoryCache } from '../general/expiringMemoryCache';
import { getILCDLocationEntries } from './api';

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

    const cacheKey = this.cache.createKey('ilcd_location', lang, validValues.sort().join(','));
    const cached = this.get<Array<Record<string, unknown>>>(cacheKey);

    if (cached) {
      console.log('[Cache Hit] ILCD Location:', validValues.length, 'values');
      return cached;
    }

    console.log('[Cache Miss] ILCD Location:', validValues.length, 'values');

    const data =
      ((await getILCDLocationEntries(lang, validValues)) as Array<
        Record<string, unknown>
      > | null) ?? [];

    this.set(cacheKey, data);

    return data;
  }
}

export const locationCache = new LocationCache();

export async function getCachedLocationData(lang: string, locations: string[]) {
  return locationCache.getILCDLocationByValues(lang, locations);
}
