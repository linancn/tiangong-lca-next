/**
 * Tests for processes classification API functions
 * Path: src/services/processes/classification/api.ts
 */

import {
  getISICClassification,
  getISICClassificationZH,
} from '@/services/processes/classification/api';

describe('Processes Classification API (src/services/processes/classification/api.ts)', () => {
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
  });

  describe('getISICClassificationZH', () => {
    it('should get Chinese classifications', () => {
      const result = getISICClassificationZH(['all']);
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });
  });
});
