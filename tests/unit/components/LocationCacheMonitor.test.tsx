import LocationCacheMonitor from '@/components/LocationCacheMonitor';
import {
  getReferenceResourceCacheFiles,
  getReferenceResourceCacheVersion,
} from '@/services/referenceResources/manifest';
import { render } from '@testing-library/react';

const mockUseResourceCacheMonitor = jest.fn();
const mockCacheAndDecompressLocationFile = jest.fn();
const mockGetCachedLocationFileList = jest.fn();
const mockGetLocationCacheManifest = jest.fn();
const mockSetLocationCacheManifest = jest.fn();
const mockClearLocationCache = jest.fn();

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

jest.mock('@/services/locations/cache', () => ({
  __esModule: true,
  locationCache: {
    clear: () => mockClearLocationCache(),
  },
}));

describe('LocationCacheMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wires the shared cache monitor hook with location resources', () => {
    const { container, rerender } = render(<LocationCacheMonitor />);

    expect(container.firstChild).toBeNull();
    expect(mockUseResourceCacheMonitor).toHaveBeenCalledWith({
      version: getReferenceResourceCacheVersion('location'),
      files: [...getReferenceResourceCacheFiles('location')],
      batchSize: 2,
      getManifest: expect.any(Function),
      setManifest: expect.any(Function),
      getCachedFileList: expect.any(Function),
      cacheFile: expect.any(Function),
      persistManifestOnPartialSuccess: false,
      onCacheUpdated: expect.any(Function),
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
    monitorConfig.onCacheUpdated(['ILCDLocations.min.json.gz']);
    expect(mockClearLocationCache).toHaveBeenCalledTimes(1);

    const initialFiles = monitorConfig.files;
    rerender(<LocationCacheMonitor />);
    expect(mockUseResourceCacheMonitor.mock.calls[1][0].files).toBe(initialFiles);
  });
});
