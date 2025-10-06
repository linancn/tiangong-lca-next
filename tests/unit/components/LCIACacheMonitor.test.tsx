/**
 * Tests for LCIACacheMonitor component
 * Path: src/components/LCIACacheMonitor/index.tsx
 */

import LCIACacheMonitor from '@/components/LCIACacheMonitor';
import { act, render } from '@testing-library/react';

const mockCacheAndDecompressMethod = jest.fn();
const mockGetCacheManifest = jest.fn();
const mockGetCachedMethodList = jest.fn();

jest.mock('@/services/lciaMethods/util', () => ({
  cacheAndDecompressMethod: (...args: any[]) => mockCacheAndDecompressMethod(...args),
  getCacheManifest: (...args: any[]) => mockGetCacheManifest(...args),
  getCachedMethodList: (...args: any[]) => mockGetCachedMethodList(...args),
}));

describe('LCIACacheMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('caches LCIA methods when no manifest is stored', async () => {
    jest.useFakeTimers();
    mockGetCacheManifest.mockReturnValue(undefined);
    mockGetCachedMethodList.mockResolvedValue([]);
    mockCacheAndDecompressMethod.mockResolvedValue(true);

    render(<LCIACacheMonitor />);

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockCacheAndDecompressMethod).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('lcia_methods_cache_manifest')).not.toBeNull();
  });

  it('skips caching when manifest is current and files are already cached', async () => {
    jest.useFakeTimers();
    const now = Date.now();
    const manifest = {
      version: '1.2.4',
      files: ['flow_factors.json.gz', 'list.json'],
      cachedAt: now,
      decompressed: true,
    };

    mockGetCacheManifest.mockReturnValue(manifest);
    mockGetCachedMethodList.mockResolvedValue(manifest.files);

    render(<LCIACacheMonitor />);

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockGetCachedMethodList).toHaveBeenCalled();
    expect(mockCacheAndDecompressMethod).not.toHaveBeenCalled();
  });
});
