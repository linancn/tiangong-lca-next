/**
 * Tests for processes classification API functions
 * Path: src/services/processes/classification/api.ts
 */

import ISICClassificationEn from '@/services/processes/classification/ISICClassification_en-US.json';
import ISICClassificationZh from '@/services/processes/classification/ISICClassification_zh-CN.json';
import {
  getISICClassification,
  getISICClassificationZH,
} from '@/services/processes/classification/api';

describe('Processes Classification API (src/services/processes/classification/api.ts)', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const originalEnglishCategory = ISICClassificationEn.CategorySystem.categories[0].category;
  const originalChineseCategory = ISICClassificationZh.CategorySystem.categories[0].category;

  beforeEach(() => {
    ISICClassificationEn.CategorySystem.categories[0].category = originalEnglishCategory;
    ISICClassificationZh.CategorySystem.categories[0].category = originalChineseCategory;
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('getISICClassification', () => {
    it('should get all ISIC classifications when "all" is requested', () => {
      const result = getISICClassification(['all']);
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should filter by specific names', () => {
      const result = getISICClassification(['Manufacturing']);
      expect(result).toBeDefined();
    });

    it('should return null data when english classification traversal throws', () => {
      ISICClassificationEn.CategorySystem.categories[0].category = {} as any;

      const result = getISICClassification(['Manufacturing']);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result).toEqual({
        data: null,
      });
    });
  });

  describe('getISICClassificationZH', () => {
    it('should get Chinese classifications', () => {
      const result = getISICClassificationZH(['all']);
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should filter chinese classifications by id', () => {
      const allResult = getISICClassificationZH(['all']);
      const firstId = allResult.data?.[0]?.['@id'];
      expect(firstId).toBeDefined();

      const result = getISICClassificationZH([firstId as string]);

      expect(result).toEqual({
        data: allResult.data?.filter((item: any) => item['@id'] === firstId),
      });
    });

    it('should return null data when chinese classification traversal throws', () => {
      ISICClassificationZh.CategorySystem.categories[0].category = {} as any;

      const result = getISICClassificationZH(['manufacturing']);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result).toEqual({
        data: null,
      });
    });
  });
});
