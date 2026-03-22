import { ExpiringMemoryCache } from '@/services/general/expiringMemoryCache';

describe('ExpiringMemoryCache', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates composite keys and returns cached entries before they expire', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const cache = new ExpiringMemoryCache(500);

    expect(cache.createKey('prefix', 'en', 1, true, null, undefined)).toBe('prefix:en:1:true::');

    cache.set('alpha', { value: 1 });

    expect(cache.get<{ value: number }>('alpha')).toEqual({ value: 1 });
    expect(nowSpy).toHaveBeenCalled();
  });

  it('evicts expired entries on read', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(2_000);

    const cache = new ExpiringMemoryCache(100);
    cache.set('beta', { value: 2 });

    nowSpy.mockReturnValue(2_101);

    expect(cache.get('beta')).toBeNull();
    expect(cache.get('beta')).toBeNull();
  });

  it('clears all entries and clears entries by prefix', () => {
    const cache = new ExpiringMemoryCache();

    cache.set('group:one', 1);
    cache.set('group:two', 2);
    cache.set('other:one', 3);

    cache.clearPrefix('group:');

    expect(cache.get('group:one')).toBeNull();
    expect(cache.get('group:two')).toBeNull();
    expect(cache.get('other:one')).toBe(3);

    cache.clear();

    expect(cache.get('other:one')).toBeNull();
  });
});
