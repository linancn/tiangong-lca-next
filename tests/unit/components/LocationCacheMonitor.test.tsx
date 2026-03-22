import LocationCacheMonitor from '@/components/LocationCacheMonitor';
import { render } from '@testing-library/react';

const mockUseResourceCacheMonitor = jest.fn();
const mockCacheAndDecompressLocationFile = jest.fn();
const mockGetCachedLocationFileList = jest.fn();
const mockGetLocationCacheManifest = jest.fn();
const mockSetLocationCacheManifest = jest.fn();

jest.mock('@/components/CacheMonitor/useResourceCacheMonitor', () => ({
  __esModule: true,
  useResourceCacheMonitor: (...args: any[]) => mockUseResourceCacheMonitor(...args),
}));

jest.mock('@/services/locations/util', () => ({
  __esModule: true,
  cacheAndDecompressLocationFile: (...args: any[]) => mockCacheAndDecompressLocationFile(...args),
  getCachedLocationFileList: (...args: any[]) => mockGetCachedLocationFileList(...args),
  getLocationCacheManifest: (...args: any[]) => mockGetLocationCacheManifest(...args),
  setLocationCacheManifest: (...args: any[]) => mockSetLocationCacheManifest(...args),
}));

describe('LocationCacheMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wires the shared cache monitor hook with location resources', () => {
    const { container } = render(<LocationCacheMonitor />);

    expect(container.firstChild).toBeNull();
    expect(mockUseResourceCacheMonitor).toHaveBeenCalledWith({
      version: '1.1.0',
      files: ['ILCDLocations.min.json.gz', 'ILCDLocations_zh.min.json.gz'],
      batchSize: 2,
      getManifest: expect.any(Function),
      setManifest: expect.any(Function),
      getCachedFileList: expect.any(Function),
      cacheFile: expect.any(Function),
      logMessages: {
        upToDate: '✅ Location cache is up to date.',
        start: '🎯 Starting location files caching...',
        success: expect.any(Function),
        issues: expect.any(Function),
        failure: '❌ Failed to cache location files:',
      },
    });
    const monitorConfig = mockUseResourceCacheMonitor.mock.calls[0][0];
    expect(monitorConfig.logMessages.issues(1, 2, 1)).toBe(
      '⚠️  Location caching completed with issues: 1/2 successful, 1 errors.',
    );
    expect(monitorConfig.logMessages.success(1)).toBe(
      '🎉 Location caching completed! 1 files cached successfully.',
    );
  });
});
