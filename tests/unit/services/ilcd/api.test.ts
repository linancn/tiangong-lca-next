/**
 * Tests for ILCD service API functions
 * Path: src/services/ilcd/api.ts
 *
 * Coverage focuses on:
 * - getILCDClassification: Used in LevelTextItem components for classification data
 * - getILCDFlowCategorization: Used for flow categorization data
 * - getILCDFlowCategorizationAll: Combined classification and categorization
 * - getILCDLocationAll: Used in LocationTextItem for location selection
 * - getILCDLocationByValues: Batch location lookup
 * - getILCDLocationByValue: Single location lookup with formatted output
 */

import {
  getILCDClassification,
  getILCDFlowCategorization,
  getILCDFlowCategorizationAll,
  getILCDLocationAll,
  getILCDLocationByValue,
  getILCDLocationByValues,
} from '@/services/ilcd/api';

// Mock dependencies
jest.mock('@/services/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
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

describe('ILCD API Service (src/services/ilcd/api.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getILCDClassification', () => {
    it('should handle Process category type with English', async () => {
      const mockData = [{ '@id': 'proc1', '@name': 'Process Category' }];
      getISICClassification.mockReturnValue({ data: mockData }); // Changed from mockResolvedValue
      genClass.mockReturnValue([{ id: 'proc1', label: 'Process Category' }]);

      const result = await getILCDClassification('Process', 'en', ['all']);

      expect(getISICClassification).toHaveBeenCalledWith(['all']);
      expect(genClass).toHaveBeenCalledWith(mockData);
      expect(result).toEqual({
        data: [{ id: 'proc1', label: 'Process Category' }],
        success: true,
      });
    });

    it('should handle Process category type with Chinese', async () => {
      const mockData = [{ '@id': 'proc1', '@name': 'Process Category' }];
      const mockDataZH = [{ '@id': 'proc1', '@name': '过程分类' }];
      getISICClassification.mockReturnValue({ data: mockData });
      getISICClassificationZH.mockReturnValue({ data: mockDataZH });
      genClassZH.mockReturnValue([{ id: 'proc1', label: '过程分类' }]);

      const result = await getILCDClassification('Process', 'zh', ['all']);

      expect(getISICClassification).toHaveBeenCalledWith(['all']);
      expect(getISICClassificationZH).toHaveBeenCalledWith(['all']);
      expect(genClassZH).toHaveBeenCalledWith(mockData, mockDataZH);
      expect(result).toEqual({
        data: [{ id: 'proc1', label: '过程分类' }],
        success: true,
      });
    });

    it('should handle Flow category type with English', async () => {
      const mockData = [{ '@id': 'flow1', '@name': 'Flow Category' }];
      getCPCClassification.mockReturnValue({ data: mockData });
      genClass.mockReturnValue([{ id: 'flow1', label: 'Flow Category' }]);

      const result = await getILCDClassification('Flow', 'en', ['val1']);

      expect(getCPCClassification).toHaveBeenCalledWith(['val1']);
      expect(genClass).toHaveBeenCalledWith(mockData);
      expect(result.success).toBe(true);
    });

    it('should handle Flow category type with Chinese', async () => {
      const mockData = [{ '@id': 'flow1', '@name': 'Flow Category' }];
      const mockDataZH = [{ '@id': 'flow1', '@name': '流分类' }];
      getCPCClassification.mockReturnValue({ data: mockData });
      getCPCClassificationZH.mockReturnValue({ data: mockDataZH });
      genClassZH.mockReturnValue([{ id: 'flow1', label: '流分类' }]);

      const result = await getILCDClassification('Flow', 'zh', ['flow1']);

      expect(getCPCClassification).toHaveBeenCalledWith(['flow1']);
      expect(getCPCClassificationZH).toHaveBeenCalledWith(['flow1']);
      expect(result.success).toBe(true);
    });

    it('should handle other category types with RPC call', async () => {
      const mockData = [{ '@id': 'cat1', '@name': 'Category 1' }];
      supabase.rpc.mockResolvedValue({ data: mockData });
      genClass.mockReturnValue([{ id: 'cat1', label: 'Category 1' }]);

      const result = await getILCDClassification('FlowProperty', 'en', ['all']);

      expect(supabase.rpc).toHaveBeenCalledWith('ilcd_classification_get', {
        this_file_name: 'ILCDClassification',
        category_type: 'FlowProperty',
        get_values: ['all'],
      });
      expect(result.success).toBe(true);
    });

    it('should handle other category types with Chinese via RPC', async () => {
      const mockData = [{ '@id': 'cat1', '@name': 'Category 1' }];
      const mockDataZH = [{ '@id': 'cat1', '@name': '分类 1' }];
      supabase.rpc
        .mockResolvedValueOnce({ data: mockData })
        .mockResolvedValueOnce({ data: mockDataZH });
      genClassZH.mockReturnValue([{ id: 'cat1', label: '分类 1' }]);

      const result = await getILCDClassification('Contact', 'zh', ['all']);

      expect(supabase.rpc).toHaveBeenCalledTimes(2);
      expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'ilcd_classification_get', {
        this_file_name: 'ILCDClassification',
        category_type: 'Contact',
        get_values: ['all'],
      });
      expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'ilcd_classification_get', {
        this_file_name: 'ILCDClassification_zh',
        category_type: '联系信息',
        get_values: ['all'],
      });
      expect(result.success).toBe(true);
    });

    it('should handle LifeCycleModel like Process', async () => {
      const mockData = [{ '@id': 'lcm1', '@name': 'Life Cycle Model' }];
      getISICClassification.mockResolvedValue({ data: mockData });
      genClass.mockReturnValue([{ id: 'lcm1', label: 'Life Cycle Model' }]);

      const result = await getILCDClassification('LifeCycleModel', 'en', ['all']);

      expect(getISICClassification).toHaveBeenCalledWith(['all']);
      expect(result.success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      supabase.rpc.mockRejectedValue(new Error('Database error'));

      const result = await getILCDClassification('Source', 'en', ['all']);

      expect(result).toEqual({
        data: null,
        success: false,
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should extract IDs from data for Chinese translation lookup', async () => {
      const mockData = [
        { '@id': 'id1', '@name': 'Name 1' },
        { '@id': 'id2', '@name': 'Name 2' },
      ];
      const mockDataZH = [
        { '@id': 'id1', '@name': '名称 1' },
        { '@id': 'id2', '@name': '名称 2' },
      ];
      supabase.rpc
        .mockResolvedValueOnce({ data: mockData })
        .mockResolvedValueOnce({ data: mockDataZH });
      genClassZH.mockReturnValue([]);

      await getILCDClassification('UnitGroup', 'zh', ['id1', 'id2']);

      expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'ilcd_classification_get', {
        this_file_name: 'ILCDClassification_zh',
        category_type: '单位组',
        get_values: ['id1', 'id2'],
      });
    });
  });

  describe('getILCDFlowCategorization', () => {
    it('should fetch flow categorization with English', async () => {
      const mockData = [{ '@id': 'elem1', '@name': 'Elementary Flow' }];
      supabase.rpc.mockResolvedValue({ data: mockData });
      genClassZH.mockReturnValue([{ id: 'elem1', label: 'Elementary Flow' }]);

      const result = await getILCDFlowCategorization('en', ['all']);

      expect(supabase.rpc).toHaveBeenCalledWith('ilcd_flow_categorization_get', {
        this_file_name: 'ILCDFlowCategorization',
        get_values: ['all'],
      });
      expect(result).toEqual({
        data: [{ id: 'elem1', label: 'Elementary Flow' }],
        success: true,
      });
    });

    it('should fetch flow categorization with Chinese', async () => {
      const mockData = [{ '@id': 'elem1', '@name': 'Elementary Flow' }];
      const mockDataZH = [{ '@id': 'elem1', '@name': '基本流' }];
      supabase.rpc
        .mockResolvedValueOnce({ data: mockData })
        .mockResolvedValueOnce({ data: mockDataZH });
      genClassZH.mockReturnValue([{ id: 'elem1', label: '基本流' }]);

      const result = await getILCDFlowCategorization('zh', ['all']);

      expect(supabase.rpc).toHaveBeenCalledTimes(2);
      expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'ilcd_flow_categorization_get', {
        this_file_name: 'ILCDFlowCategorization_zh',
        get_values: ['elem1'],
      });
      expect(result.success).toBe(true);
    });

    it('should handle errors in flow categorization', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      supabase.rpc.mockRejectedValue(new Error('RPC error'));

      const result = await getILCDFlowCategorization('en', ['all']);

      expect(result).toEqual({
        data: null,
        success: false,
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getILCDFlowCategorizationAll', () => {
    it('should combine classification and categorization results', async () => {
      const mockClassData = [{ id: 'class1', label: 'Classification' }];
      const mockCatData = [{ id: 'cat1', label: 'Categorization' }];

      // Mock getILCDClassification
      getCPCClassification.mockResolvedValue({ data: [] });
      genClass.mockReturnValue(mockClassData);

      // Mock getILCDFlowCategorization
      supabase.rpc.mockResolvedValue({ data: [] });
      genClassZH.mockReturnValue(mockCatData);

      const result = await getILCDFlowCategorizationAll('en');

      expect(result).toEqual({
        data: {
          category: mockClassData,
          categoryElementaryFlow: mockCatData,
        },
        success: true,
      });
    });
  });

  describe('getILCDLocationAll', () => {
    it('should fetch all locations in English', async () => {
      const mockLocations = [{ file_name: 'ILCDLocations', location: [] }];
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: mockLocations });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq,
        }),
      });

      const result = await getILCDLocationAll('en');

      expect(supabase.from).toHaveBeenCalledWith('ilcd');
      expect(mockEq).toHaveBeenCalledWith('file_name', 'ILCDLocations');
      expect(result).toEqual({
        data: mockLocations,
        success: true,
      });
    });

    it('should fetch all locations in Chinese', async () => {
      const mockLocations = [{ file_name: 'ILCDLocations_zh', location: [] }];
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: mockLocations });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq,
        }),
      });

      const result = await getILCDLocationAll('zh');

      expect(mockEq).toHaveBeenCalledWith('file_name', 'ILCDLocations_zh');
      expect(result.success).toBe(true);
    });

    it('should handle null data gracefully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: null });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq,
        }),
      });

      const result = await getILCDLocationAll('en');

      expect(result).toEqual({
        data: [],
        success: true,
      });
    });
  });

  describe('getILCDLocationByValues', () => {
    it('should fetch locations by values in English', async () => {
      const mockData = [{ '@value': 'US', '#text': 'United States' }];
      supabase.rpc.mockResolvedValue({ data: mockData });

      const result = await getILCDLocationByValues('en', ['US', 'CN']);

      expect(supabase.rpc).toHaveBeenCalledWith('ilcd_location_get', {
        this_file_name: 'ILCDLocations',
        get_values: ['US', 'CN'],
      });
      expect(result).toEqual({
        data: mockData,
        success: true,
      });
    });

    it('should fetch locations by values in Chinese', async () => {
      const mockData = [{ '@value': 'CN', '#text': '中国' }];
      supabase.rpc.mockResolvedValue({ data: mockData });

      const result = await getILCDLocationByValues('zh', ['CN']);

      expect(supabase.rpc).toHaveBeenCalledWith('ilcd_location_get', {
        this_file_name: 'ILCDLocations_zh',
        get_values: ['CN'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getILCDLocationByValue', () => {
    it('should format location with description when available', async () => {
      const mockData = [{ '@value': 'US', '#text': 'United States' }];
      supabase.rpc.mockResolvedValue({ data: mockData });

      const result = await getILCDLocationByValue('en', 'US');

      expect(supabase.rpc).toHaveBeenCalledWith('ilcd_location_get', {
        this_file_name: 'ILCDLocations',
        get_values: ['US'],
      });
      expect(result).toEqual({
        data: 'US (United States)',
        success: true,
      });
    });

    it('should return code only when description not available', async () => {
      const mockData = [{ '@value': 'XX' }];
      supabase.rpc.mockResolvedValue({ data: mockData });

      const result = await getILCDLocationByValue('en', 'XX');

      expect(result).toEqual({
        data: 'XX',
        success: true,
      });
    });

    it('should handle empty result array', async () => {
      supabase.rpc.mockResolvedValue({ data: [] });

      const result = await getILCDLocationByValue('en', 'UNKNOWN');

      expect(result).toEqual({
        data: 'UNKNOWN',
        success: true,
      });
    });

    it('should use Chinese file for Chinese language', async () => {
      const mockData = [{ '@value': 'CN', '#text': '中国' }];
      supabase.rpc.mockResolvedValue({ data: mockData });

      const result = await getILCDLocationByValue('zh', 'CN');

      expect(supabase.rpc).toHaveBeenCalledWith('ilcd_location_get', {
        this_file_name: 'ILCDLocations_zh',
        get_values: ['CN'],
      });
      expect(result.data).toBe('CN (中国)');
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle unknown category types', async () => {
      supabase.rpc.mockResolvedValue({ data: [] });
      genClass.mockReturnValue([]);

      const result = await getILCDClassification('UnknownType', 'en', ['all']);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle empty get_values array', async () => {
      supabase.rpc.mockResolvedValue({ data: [] });
      genClass.mockReturnValue([]);

      const result = await getILCDClassification('Source', 'en', []);

      expect(result.success).toBe(true);
    });

    it('should handle RPC returning null data', async () => {
      supabase.rpc.mockResolvedValue({ data: null });
      genClass.mockReturnValue(null);

      const result = await getILCDClassification('LCIAMethod', 'en', ['all']);

      expect(result).toEqual({
        data: null,
        success: true,
      });
    });
  });
});
