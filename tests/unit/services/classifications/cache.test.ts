/**
 * Tests for classifications service cache functions
 * Path: src/services/classifications/cache.ts
 */

const mockGetILCDClassification = jest.fn();
const mockGetILCDFlowCategorization = jest.fn();
const mockResolveReferenceResource = jest.fn();

jest.mock('@/services/classifications/api', () => ({
  getILCDClassification: (...args: any[]) => mockGetILCDClassification(...args),
  getILCDFlowCategorization: (...args: any[]) => mockGetILCDFlowCategorization(...args),
}));

jest.mock('@/services/referenceResources/resolver', () => {
  const actual = jest.requireActual('@/services/referenceResources/resolver');
  return {
    __esModule: true,
    ...actual,
    resolveReferenceResource: (...args: any[]) => mockResolveReferenceResource(...args),
  };
});

import {
  classificationCache,
  getCachedClassificationData,
  getCachedFlowCategorizationAll,
} from '@/services/classifications/cache';

describe('Classifications Cache (src/services/classifications/cache.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const actual = jest.requireActual('@/services/referenceResources/resolver');
    mockResolveReferenceResource.mockReset();
    mockResolveReferenceResource.mockImplementation(actual.resolveReferenceResource);
    classificationCache.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('supports direct get/set/clear operations on the shared cache instance', () => {
    classificationCache.set('manual:key', { value: 1 });
    expect(classificationCache.get<{ value: number }>('manual:key')).toEqual({ value: 1 });

    classificationCache.clear();
    expect(classificationCache.get('manual:key')).toBeNull();
  });

  it('clears entries by prefix', () => {
    classificationCache.set('ilcd_classification:Flow:en:all', [{ id: 'a' }]);
    classificationCache.set('flow_ref_all:en', { category: [], categoryElementaryFlow: [] });

    classificationCache.clearPrefix('ilcd_classification');

    expect(classificationCache.get('ilcd_classification:Flow:en:all')).toBeNull();
    expect(classificationCache.get('flow_ref_all:en')).toEqual({
      category: [],
      categoryElementaryFlow: [],
    });
  });

  it('caches classification lookups after the first fetch', async () => {
    mockGetILCDClassification.mockResolvedValue({
      data: [{ id: 'flow-1', label: 'Flow 1' }],
      success: true,
    });

    const first = await classificationCache.getILCDClassification('Flow', 'en', ['all']);
    const second = await classificationCache.getILCDClassification('Flow', 'en', ['all']);

    expect(first).toEqual([{ id: 'flow-1', label: 'Flow 1' }]);
    expect(second).toEqual(first);
    expect(mockGetILCDClassification).toHaveBeenCalledTimes(1);
  });

  it('does not cache a transient failed classification lookup', async () => {
    mockGetILCDClassification
      .mockResolvedValueOnce({ data: [], success: false })
      .mockResolvedValueOnce({
        data: [{ id: 'flow-1', label: 'Flow 1' }],
        success: true,
      });

    await expect(classificationCache.getILCDClassification('Flow', 'en', ['all'])).resolves.toEqual(
      [],
    );
    await expect(classificationCache.getILCDClassification('Flow', 'en', ['all'])).resolves.toEqual(
      [{ id: 'flow-1', label: 'Flow 1' }],
    );

    expect(mockGetILCDClassification).toHaveBeenCalledTimes(2);
  });

  it('shares cache entries when requested languages resolve to the same runtime asset', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetILCDClassification.mockResolvedValue({
      data: [{ id: 'flow-1', label: 'Flow 1' }],
      success: true,
    });

    const german = await classificationCache.getILCDClassification('Flow', 'de', ['all']);
    const french = await classificationCache.getILCDClassification('Flow', 'fr', ['all']);

    expect(french).toEqual(german);
    expect(mockGetILCDClassification).toHaveBeenCalledTimes(1);
    expect(mockGetILCDClassification).toHaveBeenCalledWith('Flow', 'de', ['all']);
    consoleWarnSpy.mockRestore();
  });

  it('uses the ISIC cache identity for Process-family classifications', async () => {
    mockGetILCDClassification.mockResolvedValue({
      data: [{ id: 'process-1', label: 'Process 1' }],
      success: true,
    });

    await expect(
      classificationCache.getILCDClassification('Process', 'en', ['all']),
    ).resolves.toEqual([{ id: 'process-1', label: 'Process 1' }]);
    expect(mockGetILCDClassification).toHaveBeenCalledWith('Process', 'en', ['all']);
  });

  it('builds a stable cache identity from the base asset when localization is missing', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockResolveReferenceResource.mockReturnValue({
      status: 'missing',
      resourceId: 'ilcd-classification',
      requestedLanguage: 'en',
      usedFallback: false,
      ownerIssue: '#634',
      diagnostic: 'ILCD classification English labels are unavailable.',
      baseAsset: {
        language: 'en',
        fileName: 'ILCDClassification.min.json.gz',
      },
    });
    mockGetILCDClassification.mockResolvedValue({
      data: [{ id: 'contact-1', label: 'Contact 1' }],
      success: true,
    });

    const first = await classificationCache.getILCDClassification('Contact', 'en', ['all']);
    const second = await classificationCache.getILCDClassification('Contact', 'en', ['all']);

    expect(second).toEqual(first);
    expect(mockGetILCDClassification).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('returns flow categorization data directly from the API result payload', async () => {
    mockGetILCDFlowCategorization.mockResolvedValue({
      data: [{ id: 'elem-1', label: 'Elementary 1' }],
      success: true,
    });

    const result = await classificationCache.getILCDFlowCategorizationAll('zh');

    expect(mockGetILCDFlowCategorization).toHaveBeenCalledWith('zh', ['all']);
    expect(result).toEqual([{ id: 'elem-1', label: 'Elementary 1' }]);
  });

  it('caches combined flow reference data after the first fetch', async () => {
    mockGetILCDClassification.mockResolvedValue({
      data: [{ id: 'flow-root', label: 'Flow Root' }],
      success: true,
    });
    mockGetILCDFlowCategorization.mockResolvedValue({
      data: [{ id: 'elem-root', label: 'Elementary Root' }],
      success: true,
    });

    const first = await classificationCache.getFlowReferenceDataAll('en');
    const second = await classificationCache.getFlowReferenceDataAll('en');

    expect(first).toEqual({
      category: [{ id: 'flow-root', label: 'Flow Root' }],
      categoryElementaryFlow: [{ id: 'elem-root', label: 'Elementary Root' }],
    });
    expect(second).toEqual(first);
    expect(mockGetILCDClassification).toHaveBeenCalledTimes(1);
    expect(mockGetILCDFlowCategorization).toHaveBeenCalledTimes(1);
  });

  it('does not cache combined flow reference data when either source fails transiently', async () => {
    mockGetILCDClassification
      .mockResolvedValueOnce({ data: [], success: false })
      .mockResolvedValueOnce({
        data: [{ id: 'flow-root', label: 'Flow Root' }],
        success: true,
      });
    mockGetILCDFlowCategorization
      .mockResolvedValueOnce({ data: [], success: false })
      .mockResolvedValueOnce({
        data: [{ id: 'elem-root', label: 'Elementary Root' }],
        success: true,
      });

    await expect(classificationCache.getFlowReferenceDataAll('en')).resolves.toEqual({
      category: [],
      categoryElementaryFlow: [],
    });
    await expect(classificationCache.getFlowReferenceDataAll('en')).resolves.toEqual({
      category: [{ id: 'flow-root', label: 'Flow Root' }],
      categoryElementaryFlow: [{ id: 'elem-root', label: 'Elementary Root' }],
    });

    expect(mockGetILCDClassification).toHaveBeenCalledTimes(2);
    expect(mockGetILCDFlowCategorization).toHaveBeenCalledTimes(2);
  });

  it('exposes convenience wrappers for combined and direct classification cache access', async () => {
    mockGetILCDClassification.mockResolvedValue({
      data: [{ id: 'contact-1', label: 'Contact 1' }],
      success: true,
    });
    mockGetILCDFlowCategorization.mockResolvedValue({
      data: [{ id: 'elem-1', label: 'Elementary 1' }],
      success: true,
    });

    const combined = await getCachedFlowCategorizationAll('en');
    const classification = await getCachedClassificationData('Contact', 'en', ['all']);

    expect(combined).toEqual({
      category: [{ id: 'contact-1', label: 'Contact 1' }],
      categoryElementaryFlow: [{ id: 'elem-1', label: 'Elementary 1' }],
    });
    expect(classification).toEqual([{ id: 'contact-1', label: 'Contact 1' }]);
  });
});
