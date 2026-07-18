import ClassificationCacheMonitor from '@/components/ClassificationCacheMonitor';
import {
  getReferenceResourceCacheFiles,
  getReferenceResourceCacheVersion,
} from '@/services/referenceResources/manifest';
import { render } from '@testing-library/react';

const mockUseResourceCacheMonitor = jest.fn();
const mockCacheAndDecompressClassificationFile = jest.fn();
const mockGetCachedClassificationFileList = jest.fn();
const mockGetClassificationCacheManifest = jest.fn();
const mockSetClassificationCacheManifest = jest.fn();
const mockClearClassificationCache = jest.fn();

jest.mock('@/components/CacheMonitor/useResourceCacheMonitor', () => ({
  __esModule: true,
  useResourceCacheMonitor: (...args: any[]) => mockUseResourceCacheMonitor(...args),
}));

jest.mock('@/services/classifications/util', () => ({
  __esModule: true,
  cacheAndDecompressClassificationFile: (...args: any[]) =>
    mockCacheAndDecompressClassificationFile(...args),
  getCachedClassificationFileList: (...args: any[]) => mockGetCachedClassificationFileList(...args),
  getClassificationCacheManifest: (...args: any[]) => mockGetClassificationCacheManifest(...args),
  setClassificationCacheManifest: (...args: any[]) => mockSetClassificationCacheManifest(...args),
}));

jest.mock('@/services/classifications/cache', () => ({
  __esModule: true,
  classificationCache: {
    clear: () => mockClearClassificationCache(),
  },
}));

describe('ClassificationCacheMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wires the shared cache monitor hook with classification resources', () => {
    const { container, rerender } = render(<ClassificationCacheMonitor />);

    expect(container.firstChild).toBeNull();
    expect(mockUseResourceCacheMonitor).toHaveBeenCalledWith({
      version: getReferenceResourceCacheVersion('classification'),
      files: [...getReferenceResourceCacheFiles('classification')],
      batchSize: 2,
      getManifest: expect.any(Function),
      setManifest: expect.any(Function),
      getCachedFileList: expect.any(Function),
      cacheFile: expect.any(Function),
      persistManifestOnPartialSuccess: false,
      onCacheUpdated: expect.any(Function),
      logMessages: {
        upToDate: '✅ Classification cache is up to date.',
        start: '🎯 Starting classification files caching...',
        success: expect.any(Function),
        issues: expect.any(Function),
        failure: '❌ Failed to cache classification files:',
      },
    });
    const monitorConfig = mockUseResourceCacheMonitor.mock.calls[0][0];
    expect(monitorConfig.logMessages.issues(3, 4, 1)).toBe(
      '⚠️  Classification caching completed with issues: 3/4 successful, 1 errors.',
    );
    expect(monitorConfig.logMessages.success(3)).toBe(
      '🎉 Classification caching completed! 3 files cached successfully.',
    );
    monitorConfig.onCacheUpdated(['CPCClassification.min.json.gz']);
    expect(mockClearClassificationCache).toHaveBeenCalledTimes(1);

    const initialFiles = monitorConfig.files;
    rerender(<ClassificationCacheMonitor />);
    expect(mockUseResourceCacheMonitor.mock.calls[1][0].files).toBe(initialFiles);
  });
});
