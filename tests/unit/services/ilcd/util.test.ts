/**
 * Tests for ILCD utility functions
 * Path: src/services/ilcd/util.ts
 *
 * Coverage focuses on:
 * - genClass: Used in various components for classification tree generation
 * - genClassZH: Used for Chinese language classification tree generation
 */

import { genClass, genClassZH } from '@/services/ilcd/util';

describe('ILCD Utility Functions (src/services/ilcd/util.ts)', () => {
  describe('genClass', () => {
    it('should handle null or undefined data', () => {
      expect(genClass(null)).toBeUndefined();
      expect(genClass(undefined)).toBeUndefined();
    });

    it('should transform single level classification data', () => {
      const inputData = [
        { '@id': 'cat1', '@name': 'Category 1' },
        { '@id': 'cat2', '@name': 'Category 2' },
      ];

      const result = genClass(inputData);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'cat1',
        value: 'Category 1',
        label: 'Category 1',
        children: undefined,
      });
      expect(result[1]).toEqual({
        id: 'cat2',
        value: 'Category 2',
        label: 'Category 2',
        children: undefined,
      });
    });

    it('should transform hierarchical classification data with children', () => {
      const inputData = [
        {
          '@id': 'parent1',
          '@name': 'Parent Category',
          category: [
            { '@id': 'child1', '@name': 'Child Category 1' },
            { '@id': 'child2', '@name': 'Child Category 2' },
          ],
        },
      ];

      const result = genClass(inputData);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('parent1');
      expect(result[0].label).toBe('Parent Category');
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0]).toEqual({
        id: 'child1',
        value: 'Child Category 1',
        label: 'Child Category 1',
        children: undefined,
      });
    });

    it('should handle deeply nested hierarchical data', () => {
      const inputData = [
        {
          '@id': 'level1',
          '@name': 'Level 1',
          category: [
            {
              '@id': 'level2',
              '@name': 'Level 2',
              category: [
                {
                  '@id': 'level3',
                  '@name': 'Level 3',
                },
              ],
            },
          ],
        },
      ];

      const result = genClass(inputData);

      expect(result[0].id).toBe('level1');
      expect(result[0].children[0].id).toBe('level2');
      expect(result[0].children[0].children[0].id).toBe('level3');
      expect(result[0].children[0].children[0].label).toBe('Level 3');
    });

    it('should handle empty array', () => {
      const result = genClass([]);
      expect(result).toEqual([]);
    });

    it('should handle data without category property', () => {
      const inputData = [{ '@id': 'simple', '@name': 'Simple Category' }];

      const result = genClass(inputData);

      expect(result[0]).toEqual({
        id: 'simple',
        value: 'Simple Category',
        label: 'Simple Category',
        children: undefined,
      });
    });
  });

  describe('genClassZH', () => {
    it('should handle null or undefined data', () => {
      expect(genClassZH(null, null)).toBeUndefined();
      expect(genClassZH(undefined, undefined)).toBeUndefined();
    });

    it('should use Chinese names when dataZH is provided', () => {
      const data = [
        { '@id': 'cat1', '@name': 'Category 1' },
        { '@id': 'cat2', '@name': 'Category 2' },
      ];

      const dataZH = [
        { '@id': 'cat1', '@name': '分类 1' },
        { '@id': 'cat2', '@name': '分类 2' },
      ];

      const result = genClassZH(data, dataZH);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'cat1',
        value: 'Category 1',
        label: '分类 1',
        children: undefined,
      });
      expect(result[1]).toEqual({
        id: 'cat2',
        value: 'Category 2',
        label: '分类 2',
        children: undefined,
      });
    });

    it('should fallback to English name when Chinese name not found', () => {
      const data = [
        { '@id': 'cat1', '@name': 'Category 1' },
        { '@id': 'cat2', '@name': 'Category 2' },
      ];

      const dataZH = [{ '@id': 'cat1', '@name': '分类 1' }];

      const result = genClassZH(data, dataZH);

      expect(result[0].label).toBe('分类 1');
      expect(result[1].label).toBe('Category 2'); // Falls back to English
    });

    it('should handle hierarchical data with Chinese translations', () => {
      const data = [
        {
          '@id': 'parent1',
          '@name': 'Parent Category',
          category: [
            { '@id': 'child1', '@name': 'Child Category 1' },
            { '@id': 'child2', '@name': 'Child Category 2' },
          ],
        },
      ];

      const dataZH = [
        {
          '@id': 'parent1',
          '@name': '父分类',
          category: [
            { '@id': 'child1', '@name': '子分类 1' },
            { '@id': 'child2', '@name': '子分类 2' },
          ],
        },
      ];

      const result = genClassZH(data, dataZH);

      expect(result[0].label).toBe('父分类');
      expect(result[0].children[0].label).toBe('子分类 1');
      expect(result[0].children[1].label).toBe('子分类 2');
    });

    it('should handle null dataZH parameter', () => {
      const data = [{ '@id': 'cat1', '@name': 'Category 1' }];

      const result = genClassZH(data, null);

      expect(result[0]).toEqual({
        id: 'cat1',
        value: 'Category 1',
        label: 'Category 1',
        children: undefined,
      });
    });

    it('should handle undefined dataZH parameter', () => {
      const data = [{ '@id': 'cat1', '@name': 'Category 1' }];

      const result = genClassZH(data, undefined);

      expect(result[0].label).toBe('Category 1');
    });

    it('should handle mismatched hierarchy in Chinese data', () => {
      const data = [
        {
          '@id': 'parent1',
          '@name': 'Parent Category',
          category: [{ '@id': 'child1', '@name': 'Child Category 1' }],
        },
      ];

      const dataZH = [
        {
          '@id': 'parent1',
          '@name': '父分类',
          // Missing category for children
        },
      ];

      const result = genClassZH(data, dataZH);

      expect(result[0].label).toBe('父分类');
      expect(result[0].children[0].label).toBe('Child Category 1'); // Fallback to English
    });

    it('should handle deeply nested structure with partial Chinese translations', () => {
      const data = [
        {
          '@id': 'level1',
          '@name': 'Level 1',
          category: [
            {
              '@id': 'level2',
              '@name': 'Level 2',
              category: [{ '@id': 'level3', '@name': 'Level 3' }],
            },
          ],
        },
      ];

      const dataZH = [
        {
          '@id': 'level1',
          '@name': '层级 1',
          category: [
            {
              '@id': 'level2',
              '@name': '层级 2',
              // level3 missing
            },
          ],
        },
      ];

      const result = genClassZH(data, dataZH);

      expect(result[0].label).toBe('层级 1');
      expect(result[0].children[0].label).toBe('层级 2');
      expect(result[0].children[0].children[0].label).toBe('Level 3'); // Fallback
    });

    it('should handle empty arrays', () => {
      const result = genClassZH([], []);
      expect(result).toEqual([]);
    });

    it('should preserve value field in English regardless of label language', () => {
      const data = [{ '@id': 'cat1', '@name': 'Category 1' }];
      const dataZH = [{ '@id': 'cat1', '@name': '分类 1' }];

      const result = genClassZH(data, dataZH);

      expect(result[0].value).toBe('Category 1'); // English value preserved
      expect(result[0].label).toBe('分类 1'); // Chinese label
    });
  });

  describe('Integration scenarios', () => {
    it('should handle real-world ILCD classification structure', () => {
      // Based on actual ILCD classification data structure
      const data = [
        {
          '@id': '01.00.000',
          '@name': 'Energy carriers and technologies',
          category: [
            {
              '@id': '01.01.000',
              '@name': 'Electricity',
              category: [
                { '@id': '01.01.001', '@name': 'Electricity from fossil fuels' },
                { '@id': '01.01.002', '@name': 'Electricity from renewable sources' },
              ],
            },
          ],
        },
      ];

      const result = genClass(data);

      expect(result[0].id).toBe('01.00.000');
      expect(result[0].children[0].id).toBe('01.01.000');
      expect(result[0].children[0].children).toHaveLength(2);
    });

    it('should handle mixed languages in hierarchy', () => {
      const data = [
        {
          '@id': 'mixed1',
          '@name': 'English Name',
          category: [{ '@id': 'mixed2', '@name': 'Another English Name' }],
        },
      ];

      const dataZH = [
        {
          '@id': 'mixed1',
          '@name': '中文名称',
          // Intentionally missing child translation
        },
      ];

      const result = genClassZH(data, dataZH);

      expect(result[0].label).toBe('中文名称');
      expect(result[0].children[0].label).toBe('Another English Name');
    });
  });
});
