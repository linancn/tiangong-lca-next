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
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
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

  it('recaches when the stored manifest version is outdated', async () => {
    jest.useFakeTimers();
    mockGetCacheManifest.mockReturnValue({
      version: '1.0.0',
      files: ['flow_factors.json.gz', 'list.json'],
      cachedAt: Date.now(),
      decompressed: true,
    });
    mockCacheAndDecompressMethod.mockResolvedValue(true);

    render(<LCIACacheMonitor />);

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockGetCachedMethodList).not.toHaveBeenCalled();
    expect(mockCacheAndDecompressMethod).toHaveBeenCalledTimes(2);
  });

  it('recaches when the manifest is stale for more than 24 hours', async () => {
    jest.useFakeTimers();
    mockGetCacheManifest.mockReturnValue({
      version: '1.2.4',
      files: ['flow_factors.json.gz', 'list.json'],
      cachedAt: Date.now() - 25 * 60 * 60 * 1000,
      decompressed: true,
    });
    mockCacheAndDecompressMethod.mockResolvedValue(true);

    render(<LCIACacheMonitor />);

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockGetCachedMethodList).not.toHaveBeenCalled();
    expect(mockCacheAndDecompressMethod).toHaveBeenCalledTimes(2);
  });

  it('recaches when manifest is current but IndexedDB is missing files', async () => {
    jest.useFakeTimers();
    mockGetCacheManifest.mockReturnValue({
      version: '1.2.4',
      files: ['flow_factors.json.gz', 'list.json'],
      cachedAt: Date.now(),
      decompressed: true,
    });
    mockGetCachedMethodList.mockResolvedValue(['flow_factors.json.gz']);
    mockCacheAndDecompressMethod.mockResolvedValue(true);

    render(<LCIACacheMonitor />);

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockGetCachedMethodList).toHaveBeenCalledTimes(1);
    expect(mockCacheAndDecompressMethod).toHaveBeenCalledTimes(2);
  });

  it('recaches when stored manifest is not marked as decompressed', async () => {
    jest.useFakeTimers();
    mockGetCacheManifest.mockReturnValue({
      version: '1.2.4',
      files: ['flow_factors.json.gz', 'list.json'],
      cachedAt: Date.now(),
      decompressed: false,
    });
    mockCacheAndDecompressMethod.mockResolvedValue(true);

    render(<LCIACacheMonitor />);

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockGetCachedMethodList).not.toHaveBeenCalled();
    expect(mockCacheAndDecompressMethod).toHaveBeenCalledTimes(2);
  });

  it('recaches when the manifest file list changes', async () => {
    jest.useFakeTimers();
    mockGetCacheManifest.mockReturnValue({
      version: '1.2.4',
      files: ['flow_factors.json.gz'],
      cachedAt: Date.now(),
      decompressed: true,
    });
    mockCacheAndDecompressMethod.mockResolvedValue(true);

    render(<LCIACacheMonitor />);

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockGetCachedMethodList).not.toHaveBeenCalled();
    expect(mockCacheAndDecompressMethod).toHaveBeenCalledTimes(2);
  });

  it('logs partial cache failures when some files fail to cache', async () => {
    jest.useFakeTimers();
    mockGetCacheManifest.mockReturnValue(undefined);
    mockCacheAndDecompressMethod
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('cache failed'));

    render(<LCIACacheMonitor />);

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to cache list.json:', expect.any(Error));
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '⚠️  LCIA methods caching completed with issues: 1/2 successful, 1 errors.',
    );
  });

  it('handles caching errors without crashing the app', async () => {
    jest.useFakeTimers();
    mockGetCacheManifest.mockImplementation(() => {
      throw new Error('manifest unavailable');
    });

    render(<LCIACacheMonitor />);

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '❌ Failed to cache LCIA methods:',
      expect.any(Error),
    );
  });
});
