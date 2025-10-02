/**
 * Tests for general utility functions
 * Path: src/services/general/util.ts
 */

import {
  classificationToJsonList,
  classificationToString,
  classificationToStringList,
  comparePercentDesc,
  formatDateTime,
  genClassIdList,
  genClassStr,
  getDataSource,
  getLang,
  getLangJson,
  getLangList,
  getLangText,
  isValidURL,
  jsonToList,
  listToJson,
  mergeLangArrays,
  percentStringToNumber,
  removeEmptyObjects,
  toAmountNumber,
  validatePasswordStrength,
} from '@/services/general/util';

// Mock classification data
const mockClassificationData = [
  {
    id: '1',
    value: 'category1',
    label: 'Category 1',
    children: [
      {
        id: '1-1',
        value: 'subcategory1',
        label: 'Subcategory 1',
        children: [],
      },
      {
        id: '1-2',
        value: 'subcategory2',
        label: 'Subcategory 2',
        children: [],
      },
    ],
  },
  {
    id: '2',
    value: 'category2',
    label: 'Category 2',
    children: [],
  },
];

describe('General Utility Functions', () => {
  describe('removeEmptyObjects', () => {
    it('should remove empty objects from nested structure', () => {
      const input = {
        a: 1,
        b: {},
        c: {
          d: 2,
          e: {},
        },
      };
      const result = removeEmptyObjects(input);
      expect(result).toEqual({
        a: 1,
        c: {
          d: 2,
        },
      });
    });

    it('should handle null and undefined gracefully', () => {
      const input = {
        a: null,
        b: undefined,
        c: 1,
      };
      const result = removeEmptyObjects(input);
      expect(result).toEqual({
        a: null,
        b: undefined,
        c: 1,
      });
    });

    it('should handle deeply nested empty objects', () => {
      const input = {
        a: {
          b: {
            c: {},
          },
        },
      };
      const result = removeEmptyObjects(input);
      expect(result).toEqual({});
    });

    it('should preserve non-empty nested objects', () => {
      const input = {
        a: {
          b: {
            c: 'value',
          },
        },
      };
      const result = removeEmptyObjects(input);
      expect(result).toEqual({
        a: {
          b: {
            c: 'value',
          },
        },
      });
    });
  });

  describe('comparePercentDesc', () => {
    it('should compare percent strings in descending order', () => {
      expect(comparePercentDesc('10%', '20%')).toBeGreaterThan(0);
      expect(comparePercentDesc('30%', '10%')).toBeLessThan(0);
      expect(comparePercentDesc('50%', '50%')).toBe(0);
    });

    it('should handle decimal percentages', () => {
      expect(comparePercentDesc('10.5%', '20.7%')).toBeGreaterThan(0);
      expect(comparePercentDesc('99.9%', '99.1%')).toBeLessThan(0);
    });

    it('should handle negative percentages', () => {
      expect(comparePercentDesc('-10%', '20%')).toBeGreaterThan(0);
      expect(comparePercentDesc('-30%', '-10%')).toBeLessThan(0);
    });
  });

  describe('percentStringToNumber', () => {
    it('should convert valid percent string to number', () => {
      expect(percentStringToNumber('50%')).toBe(0.5);
      expect(percentStringToNumber('100%')).toBe(1);
      expect(percentStringToNumber('25.5%')).toBe(0.255);
    });

    it('should handle negative percentages', () => {
      expect(percentStringToNumber('-10%')).toBe(-0.1);
    });

    it('should return null for invalid inputs', () => {
      expect(percentStringToNumber('invalid')).toBeNull();
      expect(percentStringToNumber('50')).toBeNull();
      expect(percentStringToNumber('')).toBeNull();
    });

    it('should return null for non-string inputs', () => {
      expect(percentStringToNumber(50 as any)).toBeNull();
      expect(percentStringToNumber(null as any)).toBeNull();
      expect(percentStringToNumber(undefined as any)).toBeNull();
    });
  });

  describe('genClassStr', () => {
    const classification = mockClassificationData;

    it('should generate classification string for single level', () => {
      const result = genClassStr(['category1'], 0, classification);
      expect(result).toBe('Category 1');
    });

    it('should generate classification string for multiple levels', () => {
      const result = genClassStr(['category1', 'subcategory1'], 0, classification);
      expect(result).toBe('Category 1 > Subcategory 1');
    });

    it('should handle missing classifications', () => {
      const result = genClassStr(['unknown'], 0, classification);
      expect(result).toBe('unknown');
    });

    it('should return empty string for empty data', () => {
      const result = genClassStr([], 0, classification);
      expect(result).toBe('');
    });

    it('should handle partially matched classifications', () => {
      const result = genClassStr(['category1', 'unknown'], 0, classification);
      expect(result).toBe('Category 1 > unknown');
    });
  });

  describe('genClassIdList', () => {
    const classification = mockClassificationData;

    it('should generate ID list for classifications', () => {
      const result = genClassIdList(['category1', 'subcategory1'], 0, classification);
      expect(result).toEqual(['1', '1-1']);
    });

    it('should handle missing classifications with empty strings', () => {
      const result = genClassIdList(['unknown'], 0, classification);
      expect(result).toEqual(['']);
    });

    it('should handle mixed matched/unmatched classifications', () => {
      const result = genClassIdList(['category1', 'unknown'], 0, classification);
      expect(result).toEqual(['1', '']);
    });
  });

  describe('getLang', () => {
    it('should return "zh" for "zh-CN"', () => {
      expect(getLang('zh-CN')).toBe('zh');
    });

    it('should return "en" for other locales', () => {
      expect(getLang('en-US')).toBe('en');
      expect(getLang('fr-FR')).toBe('en');
      expect(getLang('de-DE')).toBe('en');
    });
  });

  describe('getLangText', () => {
    it('should get text for specified language', () => {
      const langTexts = [
        { '@xml:lang': 'en', '#text': 'Hello' },
        { '@xml:lang': 'zh', '#text': '你好' },
      ];
      expect(getLangText(langTexts, 'zh')).toBe('你好');
      expect(getLangText(langTexts, 'en')).toBe('Hello');
    });

    it('should fallback to English if language not found', () => {
      const langTexts = [
        { '@xml:lang': 'en', '#text': 'Hello' },
        { '@xml:lang': 'zh', '#text': '你好' },
      ];
      expect(getLangText(langTexts, 'fr')).toBe('Hello');
    });

    it('should use first item if no English fallback', () => {
      const langTexts = [
        { '@xml:lang': 'zh', '#text': '你好' },
        { '@xml:lang': 'fr', '#text': 'Bonjour' },
      ];
      expect(getLangText(langTexts, 'de')).toBe('你好');
    });

    it('should handle single object instead of array', () => {
      const langTexts = { '@xml:lang': 'en', '#text': 'Hello' };
      expect(getLangText(langTexts, 'en')).toBe('Hello');
    });

    it('should return "-" for missing text', () => {
      const langTexts = [{ '@xml:lang': 'en' }];
      expect(getLangText(langTexts, 'en')).toBe('-');
    });
  });

  describe('getLangJson', () => {
    it('should return object for single item array', () => {
      const input = [{ '@xml:lang': 'en', '#text': 'Hello' }];
      const result = getLangJson(input);
      expect(result).toEqual({ '@xml:lang': 'en', '#text': 'Hello' });
    });

    it('should return array for multiple items', () => {
      const input = [
        { '@xml:lang': 'en', '#text': 'Hello' },
        { '@xml:lang': 'zh', '#text': '你好' },
      ];
      const result = getLangJson(input);
      expect(result).toEqual(input);
    });

    it('should filter out empty items', () => {
      const input = [
        { '@xml:lang': 'en', '#text': 'Hello' },
        null,
        { '@xml:lang': 'zh', '#text': '你好' },
      ];
      const result = getLangJson(input);
      expect(result).toHaveLength(2);
    });

    it('should return object for non-array input', () => {
      const input = { '@xml:lang': 'en', '#text': 'Hello' };
      expect(getLangJson(input)).toEqual(input);
    });

    it('should return empty object for null/undefined', () => {
      expect(getLangJson(null)).toEqual({});
      expect(getLangJson(undefined)).toEqual({});
    });
  });

  describe('getLangList', () => {
    it('should convert single object to array', () => {
      const input = { '@xml:lang': 'en', '#text': 'Hello' };
      const result = getLangList(input);
      expect(result).toEqual([input]);
    });

    it('should return array as is', () => {
      const input = [
        { '@xml:lang': 'en', '#text': 'Hello' },
        { '@xml:lang': 'zh', '#text': '你好' },
      ];
      const result = getLangList(input);
      expect(result).toEqual(input);
    });

    it('should return empty array for null/undefined', () => {
      expect(getLangList(null)).toEqual([]);
      expect(getLangList(undefined)).toEqual([]);
    });
  });

  describe('mergeLangArrays', () => {
    it('should merge arrays with common languages', () => {
      const arr1 = [
        { '@xml:lang': 'en', '#text': 'Hello' },
        { '@xml:lang': 'zh', '#text': '你好' },
      ];
      const arr2 = [
        { '@xml:lang': 'en', '#text': ' World' },
        { '@xml:lang': 'zh', '#text': '世界' },
      ];
      const result = mergeLangArrays(arr1, arr2);
      expect(result).toEqual([
        { '@xml:lang': 'en', '#text': 'Hello World' },
        { '@xml:lang': 'zh', '#text': '你好世界' },
      ]);
    });

    it('should only include common languages', () => {
      const arr1 = [
        { '@xml:lang': 'en', '#text': 'Hello' },
        { '@xml:lang': 'zh', '#text': '你好' },
      ];
      const arr2 = [
        { '@xml:lang': 'en', '#text': ' World' },
        { '@xml:lang': 'fr', '#text': ' Monde' },
      ];
      const result = mergeLangArrays(arr1, arr2);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ '@xml:lang': 'en', '#text': 'Hello World' });
    });

    it('should return empty array for no arguments', () => {
      const result = mergeLangArrays();
      expect(result).toEqual([]);
    });
  });

  describe('classificationToString', () => {
    it('should convert classification array to string', () => {
      const classifications = [
        { '@level': '0', '#text': 'Level 0' },
        { '@level': '1', '#text': 'Level 1' },
        { '@level': '2', '#text': 'Level 2' },
      ];
      const result = classificationToString(classifications);
      expect(result).toBe('Level 0 > Level 1 > Level 2');
    });

    it('should return "-" for empty array', () => {
      const result = classificationToString([]);
      expect(result).toBe('-');
    });

    it('should handle single level classification', () => {
      const classifications = [{ '@level': '0', '#text': 'Level 0' }];
      const result = classificationToString(classifications);
      expect(result).toBe('Level 0');
    });
  });

  describe('classificationToStringList', () => {
    it('should extract id and value lists for regular classification', () => {
      const classifications = [
        { '@level': '0', '@classId': 'id1', '#text': 'Class 1' },
        { '@level': '1', '@classId': 'id2', '#text': 'Class 2' },
      ];
      const result = classificationToStringList(classifications, false);
      expect(result).toEqual({
        id: ['id1', 'id2'],
        value: ['Class 1', 'Class 2'],
      });
    });

    it('should extract id and value lists for elementary flow', () => {
      const classifications = [
        { '@level': '0', '@catId': 'cat1', '#text': 'Category 1' },
        { '@level': '1', '@catId': 'cat2', '#text': 'Category 2' },
      ];
      const result = classificationToStringList(classifications, true);
      expect(result).toEqual({
        id: ['cat1', 'cat2'],
        value: ['Category 1', 'Category 2'],
      });
    });

    it('should handle single classification object', () => {
      const classification = { '@level': '0', '@classId': 'id1', '#text': 'Class 1' };
      const result = classificationToStringList(classification, false);
      expect(result).toEqual({
        id: ['id1'],
        value: ['Class 1'],
      });
    });
  });

  describe('classificationToJsonList', () => {
    it('should convert value/id pair to JSON for single item', () => {
      const input = {
        id: ['id1'],
        value: ['Class 1'],
      };
      const result = classificationToJsonList(input, false);
      expect(result).toEqual({
        '@level': '0',
        '@classId': 'id1',
        '#text': 'Class 1',
      });
    });

    it('should convert value/id pair to JSON array for multiple items', () => {
      const input = {
        id: ['id1', 'id2'],
        value: ['Class 1', 'Class 2'],
      };
      const result = classificationToJsonList(input, false);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        '@level': '0',
        '@classId': 'id1',
        '#text': 'Class 1',
      });
    });

    it('should handle elementary flow with catId', () => {
      const input = {
        id: ['cat1'],
        value: ['Category 1'],
      };
      const result = classificationToJsonList(input, true);
      expect(result).toEqual({
        '@level': '0',
        '@catId': 'cat1',
        '#text': 'Category 1',
      });
    });

    it('should return existing array structure as is', () => {
      const input = [{ '@level': '0', '@classId': 'id1', '#text': 'Class 1' }];
      const result = classificationToJsonList(input, false);
      expect(result).toEqual(input);
    });
  });

  describe('isValidURL', () => {
    it('should validate correct URLs', () => {
      expect(isValidURL('https://example.com')).toBe(true);
      expect(isValidURL('http://example.com')).toBe(true);
      expect(isValidURL('https://example.com/path')).toBe(true);
      expect(isValidURL('https://example.com:8080')).toBe(true);
      expect(isValidURL('https://example.com?query=test')).toBe(true);
      expect(isValidURL('https://sub.example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidURL('')).toBe(false);
      expect(isValidURL('not a url')).toBe(false);
      expect(isValidURL('example')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidURL('ftp://example.com')).toBe(false); // Only http/https
    });
  });

  describe('formatDateTime', () => {
    it('should format date with correct pattern', () => {
      const date = new Date('2024-01-15T10:30:45Z');
      const result = formatDateTime(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    });

    it('should include timezone offset', () => {
      const date = new Date('2024-01-15T10:30:45Z');
      const result = formatDateTime(date);
      expect(result).toContain('+');
    });

    it('should pad single digits with zero', () => {
      const date = new Date('2024-01-05T09:08:07Z');
      const result = formatDateTime(date);
      expect(result).toContain('-01-05');
      expect(result).toContain('T09:08:07');
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong passwords', async () => {
      await expect(validatePasswordStrength(null, 'Test123!@#')).resolves.toBeUndefined();
      await expect(validatePasswordStrength(null, 'MyP@ssw0rd')).resolves.toBeUndefined();
    });

    it('should reject empty passwords', async () => {
      await expect(validatePasswordStrength(null, '')).rejects.toThrow();
    });

    it('should reject short passwords', async () => {
      await expect(validatePasswordStrength(null, 'Test1!')).rejects.toThrow(
        'Password must be at least 8 characters long!',
      );
    });

    it('should reject passwords without uppercase', async () => {
      await expect(validatePasswordStrength(null, 'test123!@#')).rejects.toThrow(
        'Password must contain at least one uppercase letter!',
      );
    });

    it('should reject passwords without lowercase', async () => {
      await expect(validatePasswordStrength(null, 'TEST123!@#')).rejects.toThrow(
        'Password must contain at least one lowercase letter!',
      );
    });

    it('should reject passwords without numbers', async () => {
      await expect(validatePasswordStrength(null, 'TestTest!@#')).rejects.toThrow(
        'Password must contain at least one number!',
      );
    });

    it('should reject passwords without special characters', async () => {
      await expect(validatePasswordStrength(null, 'TestTest123')).rejects.toThrow(
        'Password must contain at least one special character!',
      );
    });
  });

  describe('jsonToList', () => {
    it('should return array as is', () => {
      const input = [1, 2, 3];
      expect(jsonToList(input)).toEqual([1, 2, 3]);
    });

    it('should convert single object to array', () => {
      const input = { id: 1 };
      expect(jsonToList(input)).toEqual([{ id: 1 }]);
    });

    it('should return empty array for null/undefined', () => {
      expect(jsonToList(null)).toEqual([]);
      expect(jsonToList(undefined)).toEqual([]);
    });

    it('should handle primitive values', () => {
      expect(jsonToList('string')).toEqual(['string']);
      expect(jsonToList(123)).toEqual([123]);
    });
  });

  describe('listToJson', () => {
    it('should convert single item array to object', () => {
      const input = [{ id: 1 }];
      expect(listToJson(input)).toEqual({ id: 1 });
    });

    it('should return array for multiple items', () => {
      const input = [{ id: 1 }, { id: 2 }];
      expect(listToJson(input)).toEqual(input);
    });

    it('should return object for non-array input', () => {
      const input = { id: 1 };
      expect(listToJson(input)).toEqual({ id: 1 });
    });

    it('should return empty object for null/undefined/empty array', () => {
      expect(listToJson(null)).toEqual({});
      expect(listToJson(undefined)).toEqual({});
      expect(listToJson([])).toEqual({});
    });
  });

  describe('toAmountNumber', () => {
    it('should convert valid number strings', () => {
      expect(toAmountNumber('123')).toBe(123);
      expect(toAmountNumber('123.45')).toBe(123.45);
      expect(toAmountNumber('-50')).toBe(-50);
    });

    it('should return 0 for invalid inputs', () => {
      expect(toAmountNumber('abc')).toBe(0);
      expect(toAmountNumber('12abc')).toBe(0);
      expect(toAmountNumber('')).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(toAmountNumber('0')).toBe(0);
      expect(toAmountNumber('0.0')).toBe(0);
    });
  });

  describe('getDataSource', () => {
    it('should identify data source from pathname', () => {
      expect(getDataSource('/mydata/flows')).toBe('my');
      expect(getDataSource('/tgdata/processes')).toBe('tg');
      expect(getDataSource('/codata/sources')).toBe('co');
      expect(getDataSource('/tedata/units')).toBe('te');
    });

    it('should return empty string for unknown paths', () => {
      expect(getDataSource('/unknown/path')).toBe('');
      expect(getDataSource('/home')).toBe('');
    });

    it('should match partial paths', () => {
      expect(getDataSource('/prefix/mydata/suffix')).toBe('my');
    });
  });
});
