import ClassificationCacheMonitor from '@/components/ClassificationCacheMonitor';
import { render } from '@testing-library/react';

const mockUseResourceCacheMonitor = jest.fn();
const mockCacheAndDecompressClassificationFile = jest.fn();
const mockGetCachedClassificationFileList = jest.fn();
const mockGetClassificationCacheManifest = jest.fn();
const mockSetClassificationCacheManifest = jest.fn();

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

describe('ClassificationCacheMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wires the shared cache monitor hook with classification resources', () => {
    const { container } = render(<ClassificationCacheMonitor />);

    expect(container.firstChild).toBeNull();
    expect(mockUseResourceCacheMonitor).toHaveBeenCalledWith({
      version: '1.3.0',
      files: [
        'CPCClassification.min.json.gz',
        'CPCClassification_zh.min.json.gz',
        'ISICClassification.min.json.gz',
        'ISICClassification_zh.min.json.gz',
        'ILCDClassification.min.json.gz',
        'ILCDClassification_zh.min.json.gz',
        'ILCDFlowCategorization.min.json.gz',
        'ILCDFlowCategorization_zh.min.json.gz',
      ],
      batchSize: 2,
      getManifest: expect.any(Function),
      setManifest: expect.any(Function),
      getCachedFileList: expect.any(Function),
      cacheFile: expect.any(Function),
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
  });
});
