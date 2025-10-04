/**
 * Tests for flows classification API functions
 * Path: src/services/flows/classification/api.ts
 *
 * Coverage focuses on:
 * - getCPCClassification: Get CPC (Central Product Classification) categories in English
 * - getCPCClassificationZH: Get CPC categories in Chinese
 */

import { getCPCClassification, getCPCClassificationZH } from '@/services/flows/classification/api';

// Mock JSON data
jest.mock('@/services/flows/classification/CPCClassification_en-US.json', () => ({
  CategorySystem: {
    categories: [
      {
        category: [
          { '@id': 'cpc1', '@name': 'Products of agriculture' },
          { '@id': 'cpc2', '@name': 'Food products' },
          { '@id': 'cpc3', '@name': 'Chemicals' },
        ],
      },
    ],
  },
}));

jest.mock('@/services/flows/classification/CPCClassification_zh-CN.json', () => ({
  CategorySystem: {
    categories: [
      {
        category: [
          { '@id': 'cpc1', '@name': '农产品' },
          { '@id': 'cpc2', '@name': '食品' },
          { '@id': 'cpc3', '@name': '化学品' },
        ],
      },
    ],
  },
}));

describe('Flows Classification API (src/services/flows/classification/api.ts)', () => {
  describe('getCPCClassification', () => {
    it('should return all data when request is "all"', () => {
      const result = getCPCClassification(['all']);
      // Should return the full mock data
      expect(result.data).toBeDefined();
      expect(result.data).not.toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should filter CPC classifications by specific names', () => {
      const result = getCPCClassification(['Food products', 'Chemicals']);

      expect(result.data).toBeDefined();
      expect(result.data).not.toBeNull();
      expect(result.data!.length).toBe(2);
      expect(result.data![0]['@name']).toBe('Food products');
      expect(result.data![1]['@name']).toBe('Chemicals');
    });

    it('should return empty array when no matches found', () => {
      const result = getCPCClassification(['NonExistent']);

      expect(result.data).toBeDefined();
      expect(result.data).not.toBeNull();
      expect(result.data!.length).toBe(0);
    });

    it('should handle empty getValues array', () => {
      const result = getCPCClassification([]);

      expect(result.data).toBeDefined();
      expect(result.data).not.toBeNull();
      expect(result.data!.length).toBe(0);
    });
  });

  describe('getCPCClassificationZH', () => {
    it('should get all CPC classifications in Chinese when "all" is requested', () => {
      const result = getCPCClassificationZH(['all']);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBe(3);
      expect(result.data![0]['@name']).toBe('农产品');
    });

    it('should filter CPC classifications by specific IDs', () => {
      const result = getCPCClassificationZH(['cpc2', 'cpc3']);

      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(2);
      expect(result.data![0]['@name']).toBe('食品');
      expect(result.data![1]['@name']).toBe('化学品');
    });

    it('should return empty array when no IDs match', () => {
      const result = getCPCClassificationZH(['nonexistent']);

      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(0);
    });

    it('should handle empty getValues array', () => {
      const result = getCPCClassificationZH([]);

      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(0);
    });

    it('should filter by ID not by name', () => {
      // getCPCClassificationZH filters by @id, not @name
      const result = getCPCClassificationZH(['食品']); // Passing Chinese name

      // Should not match because it looks for @id
      expect(result.data!.length).toBe(0);

      // Should match when using @id
      const result2 = getCPCClassificationZH(['cpc2']);
      expect(result2.data!.length).toBe(1);
      expect(result2.data![0]['@id']).toBe('cpc2');
    });
  });

  describe('Integration scenarios', () => {
    it('should return matching data structures for English and Chinese', () => {
      const resultEN = getCPCClassification(['all']);
      const resultZH = getCPCClassificationZH(['all']);

      expect(resultEN.data!.length).toBe(resultZH.data!.length);
      expect(resultEN.data![0]['@id']).toBe(resultZH.data![0]['@id']);
    });

    it('should support looking up by ID across languages', () => {
      const resultEN = getCPCClassification(['all']);
      const firstId = resultEN.data![0]['@id'];

      const resultZH = getCPCClassificationZH([firstId]);

      expect(resultZH.data!.length).toBe(1);
      expect(resultZH.data![0]['@id']).toBe(firstId);
    });
  });
});
