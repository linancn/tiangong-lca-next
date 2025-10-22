/**
 * Unit tests for ILCD cache module
 * Path: src/services/ilcd/cache.ts
 *
 * Coverage focus:
 * - ILCDCache class: get, set, clear, clearPrefix methods
 * - getILCDFlowCategorizationAll: Used in flow data retrieval (src/services/flows/api.ts:172)
 * - getILCDClassification: Classification caching for different category types
 * - getILCDLocationByValues: Location data caching (src/services/flows/api.ts:167)
 * - getFlowReferenceDataAll: Combined flow reference data fetching
 * - getCachedFlowCategorizationAll: Convenience method wrapper
 * - getCachedLocationData: Convenience method wrapper
 * - clearILCDCache: Cache clearing utility
 * - clearILCDCacheByPrefix: Prefix-based cache clearing
 */

import {
  clearILCDCache,
  clearILCDCacheByPrefix,
  getCachedFlowCategorizationAll,
  getCachedLocationData,
  ilcdCache,
} from '@/services/ilcd/cache';

// Mock dependencies
jest.mock('@/services/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

jest.mock('@/services/flows/classification/api', () => ({
  getCPCClassification: jest.fn(),
  getCPCClassificationZH: jest.fn(),
}));

jest.mock('@/services/processes/classification/api', () => ({
  getISICClassification: jest.fn(),
  getISICClassificationZH: jest.fn(),
}));

jest.mock('@/services/ilcd/util', () => ({
  genClass: jest.fn(),
  genClassZH: jest.fn(),
}));

const { supabase } = jest.requireMock('@/services/supabase');
const { getCPCClassification, getCPCClassificationZH } = jest.requireMock(
  '@/services/flows/classification/api',
);
const { getISICClassification, getISICClassificationZH } = jest.requireMock(
  '@/services/processes/classification/api',
);
const { genClass, genClassZH } = jest.requireMock('@/services/ilcd/util');

describe('ILCD Cache Service (src/services/ilcd/cache.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache before each test to ensure isolation
    ilcdCache.clear();
  });

  describe('ILCDCache basic operations', () => {
    it('should store and retrieve data from cache', () => {
      const testData = { id: '123', name: 'Test Data' };
      const cacheKey = 'test:key';

      ilcdCache.set(cacheKey, testData);
      const retrieved = ilcdCache.get(cacheKey);

      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent cache key', () => {
      const retrieved = ilcdCache.get('non-existent-key');
      expect(retrieved).toBeNull();
    });

    it('should clear all cache entries', () => {
      ilcdCache.set('key1', { data: 'value1' });
      ilcdCache.set('key2', { data: 'value2' });

      ilcdCache.clear();

      expect(ilcdCache.get('key1')).toBeNull();
      expect(ilcdCache.get('key2')).toBeNull();
    });

    it('should clear cache entries by prefix', () => {
      ilcdCache.set('ilcd_flow_cat:en', { data: 'flow_en' });
      ilcdCache.set('ilcd_flow_cat:zh', { data: 'flow_zh' });
      ilcdCache.set('ilcd_location:en', { data: 'location_en' });

      ilcdCache.clearPrefix('ilcd_flow_cat');

      expect(ilcdCache.get('ilcd_flow_cat:en')).toBeNull();
      expect(ilcdCache.get('ilcd_flow_cat:zh')).toBeNull();
      expect(ilcdCache.get('ilcd_location:en')).toEqual({ data: 'location_en' });
    });

    it('should handle cache expiration', async () => {
      const testData = { id: '123' };
      const shortTTL = 100; // 100ms

      ilcdCache.set('expiring-key', testData, shortTTL);

      // Immediately should be available
      expect(ilcdCache.get('expiring-key')).toEqual(testData);

      // Wait for expiration
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 150);
      });

      // Should be expired and return null
      expect(ilcdCache.get('expiring-key')).toBeNull();
    });
  });

  describe('getILCDFlowCategorizationAll', () => {
    it('should fetch and cache flow categorization data for English', async () => {
      const mockData = [
        { '@id': 'cat1', '@name': 'Category 1' },
        { '@id': 'cat2', '@name': 'Category 2' },
      ];
      const mockGenerated = [
        { id: 'cat1', label: 'Category 1' },
        { id: 'cat2', label: 'Category 2' },
      ];

      supabase.rpc.mockResolvedValue({ data: mockData });
      genClassZH.mockReturnValue(mockGenerated);

      const result = await ilcdCache.getILCDFlowCategorizationAll('en');

      expect(supabase.rpc).toHaveBeenCalledWith('ilcd_flow_categorization_get', {
        this_file_name: 'ILCDFlowCategorization',
        get_values: ['all'],
      });
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      expect(genClassZH).toHaveBeenCalledWith(mockData, undefined);
      expect(result).toEqual(mockGenerated);
    });

    it('should fetch and cache flow categorization data for Chinese', async () => {
      const mockData = [
        { '@id': 'cat1', '@name': 'Category 1' },
        { '@id': 'cat2', '@name': 'Category 2' },
      ];
      const mockDataZH = [
        { '@id': 'cat1', '@name': '分类1' },
        { '@id': 'cat2', '@name': '分类2' },
      ];
      const mockGenerated = [
        { id: 'cat1', label: '分类1' },
        { id: 'cat2', label: '分类2' },
      ];

      supabase.rpc
        .mockResolvedValueOnce({ data: mockData })
        .mockResolvedValueOnce({ data: mockDataZH });
      genClassZH.mockReturnValue(mockGenerated);

      const result = await ilcdCache.getILCDFlowCategorizationAll('zh');

      expect(supabase.rpc).toHaveBeenCalledWith('ilcd_flow_categorization_get', {
        this_file_name: 'ILCDFlowCategorization',
        get_values: ['all'],
      });
      expect(supabase.rpc).toHaveBeenCalledWith('ilcd_flow_categorization_get', {
        this_file_name: 'ILCDFlowCategorization_zh',
        get_values: ['cat1', 'cat2'],
      });
      expect(genClassZH).toHaveBeenCalledWith(mockData, mockDataZH);
      expect(result).toEqual(mockGenerated);
    });

    it('should return cached data on second call (cache hit)', async () => {
      const mockData = [{ '@id': 'cat1', '@name': 'Category 1' }];
      const mockGenerated = [{ id: 'cat1', label: 'Category 1' }];

      supabase.rpc.mockResolvedValue({ data: mockData });
      genClassZH.mockReturnValue(mockGenerated);

      // First call - cache miss
      const result1 = await ilcdCache.getILCDFlowCategorizationAll('en');
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      const result2 = await ilcdCache.getILCDFlowCategorizationAll('en');
      expect(supabase.rpc).toHaveBeenCalledTimes(1); // No additional calls
      expect(result2).toEqual(result1);
      expect(result2).toEqual(mockGenerated);
    });
  });

  describe('getILCDClassification', () => {
    it('should fetch and cache Process classification with English', async () => {
      const mockData = [{ '@id': 'proc1', '@name': 'Process 1' }];
      const mockGenerated = [{ id: 'proc1', label: 'Process 1' }];

      getISICClassification.mockReturnValue({ data: mockData });
      genClass.mockReturnValue(mockGenerated);

      const result = await ilcdCache.getILCDClassification('Process', 'en', ['all']);

      expect(getISICClassification).toHaveBeenCalledWith(['all']);
      expect(genClass).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockGenerated);
    });

    it('should fetch and cache Process classification with Chinese', async () => {
      const mockData = [{ '@id': 'proc1', '@name': 'Process 1' }];
      const mockDataZH = [{ '@id': 'proc1', '@name': '过程1' }];
      const mockGenerated = [{ id: 'proc1', label: '过程1' }];

      getISICClassification.mockReturnValue({ data: mockData });
      getISICClassificationZH.mockReturnValue({ data: mockDataZH });
      genClassZH.mockReturnValue(mockGenerated);

      const result = await ilcdCache.getILCDClassification('Process', 'zh', ['all']);

      expect(getISICClassification).toHaveBeenCalledWith(['all']);
      expect(getISICClassificationZH).toHaveBeenCalledWith(['all']);
      expect(genClassZH).toHaveBeenCalledWith(mockData, mockDataZH);
      expect(result).toEqual(mockGenerated);
    });

    it('should fetch and cache Flow classification with English', async () => {
      const mockData = [{ '@id': 'flow1', '@name': 'Flow 1' }];
      const mockGenerated = [{ id: 'flow1', label: 'Flow 1' }];

      getCPCClassification.mockReturnValue({ data: mockData });
      genClass.mockReturnValue(mockGenerated);

      const result = await ilcdCache.getILCDClassification('Flow', 'en', ['val1']);

      expect(getCPCClassification).toHaveBeenCalledWith(['val1']);
      expect(genClass).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockGenerated);
    });

    it('should fetch and cache Flow classification with Chinese', async () => {
      const mockData = [{ '@id': 'flow1', '@name': 'Flow 1' }];
      const mockDataZH = [{ '@id': 'flow1', '@name': '流1' }];
      const mockGenerated = [{ id: 'flow1', label: '流1' }];

      getCPCClassification.mockReturnValue({ data: mockData });
      getCPCClassificationZH.mockReturnValue({ data: mockDataZH });
      genClassZH.mockReturnValue(mockGenerated);

      const result = await ilcdCache.getILCDClassification('Flow', 'zh', ['flow1']);

      expect(getCPCClassification).toHaveBeenCalledWith(['flow1']);
      expect(getCPCClassificationZH).toHaveBeenCalledWith(['flow1']);
      expect(genClassZH).toHaveBeenCalledWith(mockData, mockDataZH);
      expect(result).toEqual(mockGenerated);
    });

    it('should fetch and cache LifeCycleModel classification', async () => {
      const mockData = [{ '@id': 'lcm1', '@name': 'LCM 1' }];
      const mockGenerated = [{ id: 'lcm1', label: 'LCM 1' }];

      getISICClassification.mockReturnValue({ data: mockData });
      genClass.mockReturnValue(mockGenerated);

      const result = await ilcdCache.getILCDClassification('LifeCycleModel', 'en', ['all']);

      expect(getISICClassification).toHaveBeenCalledWith(['all']);
      expect(genClass).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockGenerated);
    });

    it('should use supabase RPC for other category types', async () => {
      const mockData = [{ '@id': 'other1', '@name': 'Other 1' }];
      const mockGenerated = [{ id: 'other1', label: 'Other 1' }];

      supabase.rpc.mockResolvedValue({ data: mockData });
      genClass.mockReturnValue(mockGenerated);

      const result = await ilcdCache.getILCDClassification('OtherType', 'en', ['val1']);

      expect(supabase.rpc).toHaveBeenCalledWith('ilcd_classification_get', {
        this_file_name: 'ILCDClassification',
        category_type: 'OtherType',
        get_values: ['val1'],
      });
      expect(genClass).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockGenerated);
    });

    it('should return cached data on subsequent calls with same parameters', async () => {
      const mockData = [{ '@id': 'proc1', '@name': 'Process 1' }];
      const mockGenerated = [{ id: 'proc1', label: 'Process 1' }];

      getISICClassification.mockReturnValue({ data: mockData });
      genClass.mockReturnValue(mockGenerated);

      // First call
      await ilcdCache.getILCDClassification('Process', 'en', ['all']);
      expect(getISICClassification).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await ilcdCache.getILCDClassification('Process', 'en', ['all']);
      expect(getISICClassification).toHaveBeenCalledTimes(1); // No additional calls
    });
  });

  describe('getILCDLocationByValues', () => {
    it('should return empty array for empty input', async () => {
      const result = await ilcdCache.getILCDLocationByValues('en', []);
      expect(result).toEqual([]);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should return empty array for null input', async () => {
      const result = await ilcdCache.getILCDLocationByValues('en', null as any);
      expect(result).toEqual([]);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should filter out null and undefined values', async () => {
      const mockLocations = [
        { '@value': 'CN', '#text': 'China' },
        { '@value': 'US', '#text': 'United States' },
      ];

      supabase.rpc.mockResolvedValue({ data: mockLocations });

      const result = await ilcdCache.getILCDLocationByValues('en', [
        'CN',
        null as any,
        'US',
        undefined as any,
      ]);

      expect(supabase.rpc).toHaveBeenCalledWith('ilcd_location_get', {
        this_file_name: 'ILCDLocations',
        get_values: ['CN', 'US'],
      });
      expect(result).toEqual(mockLocations);
    });

    it('should fetch and cache location data for English', async () => {
      const mockLocations = [
        { '@value': 'CN', '#text': 'China' },
        { '@value': 'US', '#text': 'United States' },
      ];

      supabase.rpc.mockResolvedValue({ data: mockLocations });

      const result = await ilcdCache.getILCDLocationByValues('en', ['CN', 'US']);

      expect(supabase.rpc).toHaveBeenCalledWith('ilcd_location_get', {
        this_file_name: 'ILCDLocations',
        get_values: ['CN', 'US'],
      });
      expect(result).toEqual(mockLocations);
    });

    it('should fetch and cache location data for Chinese', async () => {
      const mockLocations = [
        { '@value': 'CN', '#text': '中国' },
        { '@value': 'US', '#text': '美国' },
      ];

      supabase.rpc.mockResolvedValue({ data: mockLocations });

      const result = await ilcdCache.getILCDLocationByValues('zh', ['CN', 'US']);

      expect(supabase.rpc).toHaveBeenCalledWith('ilcd_location_get', {
        this_file_name: 'ILCDLocations_zh',
        get_values: ['CN', 'US'],
      });
      expect(result).toEqual(mockLocations);
    });

    it('should handle null data from database gracefully', async () => {
      supabase.rpc.mockResolvedValue({ data: null });

      const result = await ilcdCache.getILCDLocationByValues('en', ['CN']);

      expect(result).toEqual([]);
    });

    it('should return cached data on second call with same parameters', async () => {
      const mockLocations = [{ '@value': 'CN', '#text': 'China' }];

      supabase.rpc.mockResolvedValue({ data: mockLocations });

      // First call - cache miss
      const result1 = await ilcdCache.getILCDLocationByValues('en', ['CN', 'US']);
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Second call - cache hit (order matters due to sorting)
      const result2 = await ilcdCache.getILCDLocationByValues('en', ['US', 'CN']);
      expect(supabase.rpc).toHaveBeenCalledTimes(1); // No additional calls
      expect(result2).toEqual(result1);
    });

    it('should handle different order of location values (cache key sorting)', async () => {
      const mockLocations = [{ '@value': 'CN', '#text': 'China' }];

      supabase.rpc.mockResolvedValue({ data: mockLocations });

      // First call with order: CN, US
      await ilcdCache.getILCDLocationByValues('en', ['CN', 'US']);

      // Second call with order: US, CN - should hit cache
      await ilcdCache.getILCDLocationByValues('en', ['US', 'CN']);

      expect(supabase.rpc).toHaveBeenCalledTimes(1); // Only one DB call
    });
  });

  describe('getFlowReferenceDataAll', () => {
    it('should fetch combined flow reference data in parallel', async () => {
      const mockClassification = [{ id: 'class1', label: 'Classification 1' }];
      const mockCategorization = [{ id: 'cat1', label: 'Category 1' }];

      // Mock classification
      getCPCClassification.mockReturnValue({ data: [{ '@id': 'class1' }] });
      genClass.mockReturnValue(mockClassification);

      // Mock categorization
      supabase.rpc.mockResolvedValue({ data: [{ '@id': 'cat1' }] });
      genClassZH.mockReturnValue(mockCategorization);

      const result = await ilcdCache.getFlowReferenceDataAll('en');

      expect(result).toEqual({
        category: mockClassification,
        categoryElementaryFlow: mockCategorization,
      });
    });

    it('should cache combined flow reference data', async () => {
      const mockClassification = [{ id: 'class1', label: 'Classification 1' }];
      const mockCategorization = [{ id: 'cat1', label: 'Category 1' }];

      getCPCClassification.mockReturnValue({ data: [{ '@id': 'class1' }] });
      genClass.mockReturnValue(mockClassification);
      supabase.rpc.mockResolvedValue({ data: [{ '@id': 'cat1' }] });
      genClassZH.mockReturnValue(mockCategorization);

      // First call
      await ilcdCache.getFlowReferenceDataAll('en');

      // Clear mocks to verify second call uses cache
      jest.clearAllMocks();

      // Second call - should use cache
      const result = await ilcdCache.getFlowReferenceDataAll('en');

      expect(getCPCClassification).not.toHaveBeenCalled();
      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(result).toEqual({
        category: mockClassification,
        categoryElementaryFlow: mockCategorization,
      });
    });
  });

  describe('Convenience methods', () => {
    it('getCachedFlowCategorizationAll should call getFlowReferenceDataAll', async () => {
      const mockData = {
        category: [{ id: 'c1' }],
        categoryElementaryFlow: [{ id: 'ce1' }],
      };

      getCPCClassification.mockReturnValue({ data: [] });
      genClass.mockReturnValue(mockData.category);
      supabase.rpc.mockResolvedValue({ data: [] });
      genClassZH.mockReturnValue(mockData.categoryElementaryFlow);

      const result = await getCachedFlowCategorizationAll('en');

      expect(result).toEqual(mockData);
    });

    it('getCachedLocationData should call getILCDLocationByValues', async () => {
      const mockLocations = [{ '@value': 'CN', '#text': 'China' }];

      supabase.rpc.mockResolvedValue({ data: mockLocations });

      const result = await getCachedLocationData('en', ['CN']);

      expect(supabase.rpc).toHaveBeenCalledWith('ilcd_location_get', {
        this_file_name: 'ILCDLocations',
        get_values: ['CN'],
      });
      expect(result).toEqual(mockLocations);
    });
  });

  describe('Cache clearing utilities', () => {
    it('clearILCDCache should clear all cache entries', () => {
      ilcdCache.set('test:key1', { data: 'value1' });
      ilcdCache.set('test:key2', { data: 'value2' });

      clearILCDCache();

      expect(ilcdCache.get('test:key1')).toBeNull();
      expect(ilcdCache.get('test:key2')).toBeNull();
    });

    it('clearILCDCacheByPrefix should clear only matching prefix', () => {
      ilcdCache.set('ilcd_flow_cat:en', { data: 'flow_en' });
      ilcdCache.set('ilcd_flow_cat:zh', { data: 'flow_zh' });
      ilcdCache.set('ilcd_location:en', { data: 'location_en' });
      ilcdCache.set('ilcd_classification:en', { data: 'class_en' });

      clearILCDCacheByPrefix('ilcd_flow_cat');

      expect(ilcdCache.get('ilcd_flow_cat:en')).toBeNull();
      expect(ilcdCache.get('ilcd_flow_cat:zh')).toBeNull();
      expect(ilcdCache.get('ilcd_location:en')).toEqual({ data: 'location_en' });
      expect(ilcdCache.get('ilcd_classification:en')).toEqual({ data: 'class_en' });
    });

    it('clearILCDCacheByPrefix should handle location prefix', () => {
      ilcdCache.set('ilcd_location:en:CN,US', { data: 'loc1' });
      ilcdCache.set('ilcd_location:zh:CN', { data: 'loc2' });
      ilcdCache.set('ilcd_flow_cat:en', { data: 'flow' });

      clearILCDCacheByPrefix('ilcd_location');

      expect(ilcdCache.get('ilcd_location:en:CN,US')).toBeNull();
      expect(ilcdCache.get('ilcd_location:zh:CN')).toBeNull();
      expect(ilcdCache.get('ilcd_flow_cat:en')).toEqual({ data: 'flow' });
    });
  });

  describe('Cache performance optimization scenarios', () => {
    it('should avoid redundant database calls for same data across languages', async () => {
      const mockData = [{ '@id': 'cat1', '@name': 'Category 1' }];
      const mockDataZH = [{ '@id': 'cat1', '@name': '分类1' }];

      supabase.rpc
        .mockResolvedValueOnce({ data: mockData })
        .mockResolvedValueOnce({ data: mockDataZH });
      genClassZH.mockReturnValue([]);

      // Fetch for English
      await ilcdCache.getILCDFlowCategorizationAll('en');
      const enCalls = supabase.rpc.mock.calls.length;

      // Fetch for Chinese
      await ilcdCache.getILCDFlowCategorizationAll('zh');
      const zhCalls = supabase.rpc.mock.calls.length - enCalls;

      // Verify independent caching
      expect(enCalls).toBe(1);
      expect(zhCalls).toBe(2); // Base + ZH versions

      // Subsequent calls should use cache
      jest.clearAllMocks();
      await ilcdCache.getILCDFlowCategorizationAll('en');
      await ilcdCache.getILCDFlowCategorizationAll('zh');
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should cache with appropriate granularity for location data', async () => {
      supabase.rpc.mockResolvedValue({ data: [{ '@value': 'CN', '#text': 'China' }] });

      // Different location sets should have separate cache entries
      await ilcdCache.getILCDLocationByValues('en', ['CN']);
      await ilcdCache.getILCDLocationByValues('en', ['US']);
      await ilcdCache.getILCDLocationByValues('en', ['CN', 'US']);

      // Each should have triggered a database call
      expect(supabase.rpc).toHaveBeenCalledTimes(3);
    });
  });
});
