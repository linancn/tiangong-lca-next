/**
 * Tests for classifications service cache functions
 * Path: src/services/classifications/cache.ts
 */

const mockGetILCDClassification = jest.fn();
const mockGetILCDFlowCategorization = jest.fn();

jest.mock('@/services/classifications/api', () => ({
  getILCDClassification: (...args: any[]) => mockGetILCDClassification(...args),
  getILCDFlowCategorization: (...args: any[]) => mockGetILCDFlowCategorization(...args),
}));

import {
  classificationCache,
  getCachedClassificationData,
  getCachedFlowCategorizationAll,
} from '@/services/classifications/cache';

describe('Classifications Cache (src/services/classifications/cache.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    classificationCache.clear();
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
