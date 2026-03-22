import { getAllCachedKeys } from '@/services/general/browserResourceCache';

describe('browserResourceCache', () => {
  it('stringifies cache keys returned from IndexedDB', async () => {
    const request: any = {};
    const db: any = {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          getAllKeys: jest.fn(() => request),
        })),
      })),
    };

    const promise = getAllCachedKeys(db, 'cache-store');
    request.result = [1, 'two'];
    request.onsuccess();

    await expect(promise).resolves.toEqual(['1', 'two']);
  });

  it('falls back to an empty key list when IndexedDB returns no keys payload', async () => {
    const request: any = {};
    const db: any = {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          getAllKeys: jest.fn(() => request),
        })),
      })),
    };

    const promise = getAllCachedKeys(db, 'cache-store');
    request.result = undefined;
    request.onsuccess();

    await expect(promise).resolves.toEqual([]);
  });
});
