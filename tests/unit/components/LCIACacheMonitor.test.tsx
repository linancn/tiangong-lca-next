/**
 * Tests for LCIACacheMonitor component
 * Path: src/components/LCIACacheMonitor/index.tsx
 */

import LCIACacheMonitor from '@/components/LCIACacheMonitor';
import { act, render } from '@testing-library/react';

const mockCacheAndDecompressMethod = jest.fn();
const mockGetCacheManifest = jest.fn();
const mockGetCachedMethodList = jest.fn();
const mockSetCacheManifest = jest.fn();

jest.mock('@/services/lciaMethods/util', () => ({
  cacheAndDecompressMethod: (...args: any[]) => mockCacheAndDecompressMethod(...args),
  getCacheManifest: (...args: any[]) => mockGetCacheManifest(...args),
  getCachedMethodList: (...args: any[]) => mockGetCachedMethodList(...args),
  setCacheManifest: (...args: any[]) => mockSetCacheManifest(...args),
}));

const flushCacheMonitor = async () => {
  await act(async () => {
    jest.advanceTimersByTime(3000);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

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

    await flushCacheMonitor();

    expect(mockCacheAndDecompressMethod).toHaveBeenCalledTimes(2);
    expect(mockSetCacheManifest).toHaveBeenCalledTimes(1);
    expect(mockSetCacheManifest).toHaveBeenCalledWith({
      version: '1.2.4',
      files: ['flow_factors.json.gz', 'list.json'],
      cachedAt: expect.any(Number),
      decompressed: true,
    });
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

    await flushCacheMonitor();

    expect(mockGetCachedMethodList).toHaveBeenCalled();
    expect(mockCacheAndDecompressMethod).not.toHaveBeenCalled();
    expect(mockSetCacheManifest).not.toHaveBeenCalled();
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

    await flushCacheMonitor();

    expect(mockGetCachedMethodList).not.toHaveBeenCalled();
    expect(mockCacheAndDecompressMethod).toHaveBeenCalledTimes(2);
    expect(mockSetCacheManifest).toHaveBeenCalledTimes(1);
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

    await flushCacheMonitor();

    expect(mockGetCachedMethodList).not.toHaveBeenCalled();
    expect(mockCacheAndDecompressMethod).toHaveBeenCalledTimes(2);
    expect(mockSetCacheManifest).toHaveBeenCalledTimes(1);
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

    await flushCacheMonitor();

    expect(mockGetCachedMethodList).toHaveBeenCalledTimes(1);
    expect(mockCacheAndDecompressMethod).toHaveBeenCalledTimes(2);
    expect(mockSetCacheManifest).toHaveBeenCalledTimes(1);
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

    await flushCacheMonitor();

    expect(mockGetCachedMethodList).not.toHaveBeenCalled();
    expect(mockCacheAndDecompressMethod).toHaveBeenCalledTimes(2);
    expect(mockSetCacheManifest).toHaveBeenCalledTimes(1);
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

    await flushCacheMonitor();

    expect(mockGetCachedMethodList).not.toHaveBeenCalled();
    expect(mockCacheAndDecompressMethod).toHaveBeenCalledTimes(2);
    expect(mockSetCacheManifest).toHaveBeenCalledTimes(1);
  });

  it('logs partial cache failures when some files fail to cache', async () => {
    jest.useFakeTimers();
    mockGetCacheManifest.mockReturnValue(undefined);
    mockCacheAndDecompressMethod
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('cache failed'));

    render(<LCIACacheMonitor />);

    await flushCacheMonitor();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to cache list.json:', expect.any(Error));
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '⚠️  LCIA methods caching completed with issues: 1/2 successful, 1 errors.',
    );
    expect(mockSetCacheManifest).toHaveBeenCalledTimes(1);
  });

  it('handles caching errors without crashing the app', async () => {
    jest.useFakeTimers();
    mockGetCacheManifest.mockImplementation(() => {
      throw new Error('manifest unavailable');
    });

    render(<LCIACacheMonitor />);

    await flushCacheMonitor();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '❌ Failed to cache LCIA methods:',
      expect.any(Error),
    );
    expect(mockSetCacheManifest).not.toHaveBeenCalled();
  });
});
