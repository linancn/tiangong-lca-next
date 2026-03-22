import { useResourceCacheMonitor } from '@/components/CacheMonitor/useResourceCacheMonitor';
import { act, render } from '@testing-library/react';

const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

const flushTimers = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('useResourceCacheMonitor', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('processes files in multiple batches and waits between batches', async () => {
    jest.useFakeTimers();

    const getManifest = jest.fn(() => null);
    const setManifest = jest.fn();
    const getCachedFileList = jest.fn().mockResolvedValue([]);
    const cacheFile = jest.fn().mockResolvedValue(true);

    const TestComponent = () => {
      useResourceCacheMonitor({
        version: '1.0.0',
        files: ['file-a', 'file-b', 'file-c'],
        batchSize: 2,
        getManifest,
        setManifest,
        getCachedFileList,
        cacheFile,
        logMessages: {
          upToDate: 'up to date',
          start: 'starting cache',
          success: (successCount, totalFiles) => `success ${successCount}/${totalFiles}`,
          issues: (successCount, totalFiles, errorCount) =>
            `issues ${successCount}/${totalFiles}/${errorCount}`,
          failure: 'cache failed',
        },
        startDelayMs: 1,
        batchDelayMs: 25,
      });

      return null;
    };

    render(<TestComponent />);

    await flushTimers(1);
    await flushTimers(25);

    expect(cacheFile).toHaveBeenNthCalledWith(1, 'file-a');
    expect(cacheFile).toHaveBeenNthCalledWith(2, 'file-b');
    expect(cacheFile).toHaveBeenNthCalledWith(3, 'file-c');
    expect(setManifest).toHaveBeenCalledWith({
      version: '1.0.0',
      files: ['file-a', 'file-b', 'file-c'],
      cachedAt: expect.any(Number),
      decompressed: true,
    });
    expect(consoleLogSpy).toHaveBeenCalledWith('starting cache');
    expect(consoleLogSpy).toHaveBeenCalledWith('success 3/3');
    expect(getCachedFileList).not.toHaveBeenCalled();
  });
});
