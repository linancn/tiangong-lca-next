/**
 * Tests for LCIACacheMonitor component
 * Path: src/components/LCIACacheMonitor/index.tsx
 */

import { useResourceCacheMonitor } from '@/components/CacheMonitor/useResourceCacheMonitor';
import LCIACacheMonitor, { isLciaCacheManifestCurrent } from '@/components/LCIACacheMonitor';
import { STATIC_LCIA_CACHE_MANIFEST } from '@/services/lciaMethods/evidence';
import { act, render } from '@testing-library/react';

const mockCacheAndDecompressMethod = jest.fn();
const mockGetCacheManifest = jest.fn();
const mockGetCachedMethodList = jest.fn();
const mockSetCacheManifest = jest.fn();
const currentManifest = (overrides: Record<string, unknown> = {}) => ({
  version: 'lcia.browser_cache_manifest.v2',
  cacheSchemaVersion: 'lcia.browser_cache_manifest.v2' as const,
  bundleVersion: STATIC_LCIA_CACHE_MANIFEST.bundle_version,
  sourceSnapshotSha256: STATIC_LCIA_CACHE_MANIFEST.source_snapshot_sha256,
  files: ['flow_factors.json.gz', 'list.json'],
  cachedAt: Date.now(),
  decompressed: true,
  ...overrides,
});

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

const GenericCacheMonitor = ({ options }: any) => {
  useResourceCacheMonitor(options);
  return null;
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
      version: 'lcia.browser_cache_manifest.v2',
      cacheSchemaVersion: 'lcia.browser_cache_manifest.v2',
      bundleVersion: STATIC_LCIA_CACHE_MANIFEST.bundle_version,
      sourceSnapshotSha256: STATIC_LCIA_CACHE_MANIFEST.source_snapshot_sha256,
      files: ['flow_factors.json.gz', 'list.json'],
      cachedAt: expect.any(Number),
      decompressed: true,
    });
  });

  it('skips caching when manifest is current and files are already cached', async () => {
    jest.useFakeTimers();
    const now = Date.now();
    const manifest = currentManifest({ cachedAt: now });

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
    mockGetCacheManifest.mockReturnValue(
      currentManifest({ cachedAt: Date.now() - 25 * 60 * 60 * 1000 }),
    );
    mockCacheAndDecompressMethod.mockResolvedValue(true);

    render(<LCIACacheMonitor />);

    await flushCacheMonitor();

    expect(mockGetCachedMethodList).not.toHaveBeenCalled();
    expect(mockCacheAndDecompressMethod).toHaveBeenCalledTimes(2);
    expect(mockSetCacheManifest).toHaveBeenCalledTimes(1);
  });

  it('recaches when manifest is current but IndexedDB is missing files', async () => {
    jest.useFakeTimers();
    mockGetCacheManifest.mockReturnValue(currentManifest());
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
    mockGetCacheManifest.mockReturnValue(currentManifest({ decompressed: false }));
    mockCacheAndDecompressMethod.mockResolvedValue(true);

    render(<LCIACacheMonitor />);

    await flushCacheMonitor();

    expect(mockGetCachedMethodList).not.toHaveBeenCalled();
    expect(mockCacheAndDecompressMethod).toHaveBeenCalledTimes(2);
    expect(mockSetCacheManifest).toHaveBeenCalledTimes(1);
  });

  it('recaches when the manifest file list changes', async () => {
    jest.useFakeTimers();
    mockGetCacheManifest.mockReturnValue(currentManifest({ files: ['flow_factors.json.gz'] }));
    mockCacheAndDecompressMethod.mockResolvedValue(true);

    render(<LCIACacheMonitor />);

    await flushCacheMonitor();

    expect(mockGetCachedMethodList).not.toHaveBeenCalled();
    expect(mockCacheAndDecompressMethod).toHaveBeenCalledTimes(2);
    expect(mockSetCacheManifest).toHaveBeenCalledTimes(1);
  });

  it('uses a stable predicate that rejects cache schema, bundle, or source drift', () => {
    const current = currentManifest();
    expect(isLciaCacheManifestCurrent(current, current)).toBe(true);
    expect(
      isLciaCacheManifestCurrent(currentManifest({ cacheSchemaVersion: undefined }), current),
    ).toBe(false);
    expect(isLciaCacheManifestCurrent(currentManifest({ bundleVersion: 'other' }), current)).toBe(
      false,
    );
    expect(
      isLciaCacheManifestCurrent(
        currentManifest({ sourceSnapshotSha256: '0'.repeat(64) }),
        current,
      ),
    ).toBe(false);
  });

  it('treats a matching generic manifest as current when no custom predicate is supplied', async () => {
    jest.useFakeTimers();
    const cachedAt = Date.now();
    const cacheFile = jest.fn();
    const getCachedFileList = jest.fn().mockResolvedValue(['a.json']);
    render(
      <GenericCacheMonitor
        options={{
          version: 'v1',
          files: ['a.json'],
          batchSize: 1,
          getManifest: () => ({
            version: 'v1',
            files: ['a.json'],
            cachedAt,
            decompressed: true,
          }),
          setManifest: jest.fn(),
          getCachedFileList,
          cacheFile,
          startDelayMs: 0,
          logMessages: {
            upToDate: 'up to date',
            start: 'start',
            success: () => 'success',
            issues: () => 'issues',
            failure: 'failure',
          },
        }}
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getCachedFileList).toHaveBeenCalledTimes(1);
    expect(cacheFile).not.toHaveBeenCalled();
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
    expect(mockSetCacheManifest).not.toHaveBeenCalled();
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
