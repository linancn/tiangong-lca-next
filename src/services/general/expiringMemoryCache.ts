interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class ExpiringMemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  constructor(private readonly defaultTTL = 5 * 60 * 1000) {}

  createKey(prefix: string, ...args: Array<string | number | boolean | null | undefined>): string {
    return `${prefix}:${args.join(':')}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  clearPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}
