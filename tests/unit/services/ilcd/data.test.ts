/**
 * Tests for ILCD data type definitions
 * Path: src/services/ilcd/data.ts
 *
 * This module defines type options for ILCD category types.
 * Tests verify the correctness of category type options.
 */

import { categoryTypeOptions } from '@/services/ilcd/data';

describe('ILCD Data Types (src/services/ilcd/data.ts)', () => {
  describe('categoryTypeOptions', () => {
    it('should contain correct number of category types', () => {
      expect(categoryTypeOptions).toHaveLength(7);
    });

    it('should have both English and Chinese names for each category', () => {
      categoryTypeOptions.forEach((option) => {
        expect(option).toHaveProperty('en');
        expect(option).toHaveProperty('zh');
        expect(typeof option.en).toBe('string');
        expect(typeof option.zh).toBe('string');
        expect(option.en.length).toBeGreaterThan(0);
        expect(option.zh.length).toBeGreaterThan(0);
      });
    });

    it('should include Process category type', () => {
      const processOption = categoryTypeOptions.find((opt) => opt.en === 'Process');
      expect(processOption).toBeDefined();
      expect(processOption?.zh).toBe('过程');
    });

    it('should include Flow category type', () => {
      const flowOption = categoryTypeOptions.find((opt) => opt.en === 'Flow');
      expect(flowOption).toBeDefined();
      expect(flowOption?.zh).toBe('流');
    });

    it('should include FlowProperty category type', () => {
      const flowPropertyOption = categoryTypeOptions.find((opt) => opt.en === 'FlowProperty');
      expect(flowPropertyOption).toBeDefined();
      expect(flowPropertyOption?.zh).toBe('流属性');
    });

    it('should include UnitGroup category type', () => {
      const unitGroupOption = categoryTypeOptions.find((opt) => opt.en === 'UnitGroup');
      expect(unitGroupOption).toBeDefined();
      expect(unitGroupOption?.zh).toBe('单位组');
    });

    it('should include Contact category type', () => {
      const contactOption = categoryTypeOptions.find((opt) => opt.en === 'Contact');
      expect(contactOption).toBeDefined();
      expect(contactOption?.zh).toBe('联系信息');
    });

    it('should include Source category type', () => {
      const sourceOption = categoryTypeOptions.find((opt) => opt.en === 'Source');
      expect(sourceOption).toBeDefined();
      expect(sourceOption?.zh).toBe('来源');
    });

    it('should include LCIAMethod category type', () => {
      const lciaMethodOption = categoryTypeOptions.find((opt) => opt.en === 'LCIAMethod');
      expect(lciaMethodOption).toBeDefined();
      expect(lciaMethodOption?.zh).toBe('生命周期影响评估方法');
    });

    it('should have unique English names', () => {
      const enNames = categoryTypeOptions.map((opt) => opt.en);
      const uniqueEnNames = new Set(enNames);
      expect(uniqueEnNames.size).toBe(enNames.length);
    });

    it('should have unique Chinese names', () => {
      const zhNames = categoryTypeOptions.map((opt) => opt.zh);
      const uniqueZhNames = new Set(zhNames);
      expect(uniqueZhNames.size).toBe(zhNames.length);
    });

    it('should maintain expected order of categories', () => {
      const expectedOrder = [
        'Process',
        'Flow',
        'FlowProperty',
        'UnitGroup',
        'Contact',
        'Source',
        'LCIAMethod',
      ];

      categoryTypeOptions.forEach((option, index) => {
        expect(option.en).toBe(expectedOrder[index]);
      });
    });

    it('should be used for category type lookups', () => {
      // Simulate usage pattern from src/services/ilcd/api.ts
      const categoryType = 'FlowProperty';
      const thisCategoryType = categoryTypeOptions.find((i) => i.en === categoryType);

      expect(thisCategoryType).toBeDefined();
      expect(thisCategoryType?.en).toBe('FlowProperty');
      expect(thisCategoryType?.zh).toBe('流属性');
    });

    it('should handle lookup for non-existent category type', () => {
      const categoryType = 'NonExistentType';
      const thisCategoryType = categoryTypeOptions.find((i) => i.en === categoryType);

      expect(thisCategoryType).toBeUndefined();
    });

    it('should support filtering for specific category types', () => {
      const dataTypes = ['Process', 'Flow', 'Contact'];
      const filtered = categoryTypeOptions.filter((opt) => dataTypes.includes(opt.en));

      expect(filtered).toHaveLength(3);
      expect(filtered.map((opt) => opt.en)).toEqual(['Process', 'Flow', 'Contact']);
    });
  });
});
