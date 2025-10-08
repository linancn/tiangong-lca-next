/**
 * Tests for Validator component
 * Path: src/components/Validator/index.tsx
 *
 * Coverage focuses on:
 * - Validation rules export correctly
 * - Rule structure and properties
 * - FormattedMessage integration
 * - Different validation types (required, optional, etc.)
 */

import {
  CASNumber,
  dataSetVersion,
  emailvalidation,
  FTMultiLang_r,
  NullableString,
  ST_r,
  STMultiLang_o,
  STMultiLang_r,
  String_m,
  String_o,
  String_r,
  StringMultiLang_o,
  StringMultiLang_r,
  WWWAddress,
  Yearvalidation_r,
} from '@/components/Validator';

describe('Validator Component', () => {
  describe('StringMultiLang_r (Required)', () => {
    it('should export correct validation rules', () => {
      expect(StringMultiLang_r).toBeDefined();
      expect(Array.isArray(StringMultiLang_r)).toBe(true);
      expect(StringMultiLang_r).toHaveLength(2);
    });

    it('should have warningOnly rule for empty values', () => {
      const warningRule = StringMultiLang_r[0];
      expect(warningRule.warningOnly).toBe(true);
      expect(warningRule.message).toBeDefined();
    });

    it('should have max length validation', () => {
      const maxRule = StringMultiLang_r[1];
      expect(maxRule.max).toBe(500);
      expect(maxRule.message).toBeDefined();
    });
  });

  describe('StringMultiLang_o (Optional)', () => {
    it('should export correct validation rules', () => {
      expect(StringMultiLang_o).toBeDefined();
      expect(Array.isArray(StringMultiLang_o)).toBe(true);
      expect(StringMultiLang_o).toHaveLength(2);
    });

    it('should have optional message for empty values', () => {
      const optionalRule = StringMultiLang_o[0];
      expect(optionalRule.message).toBeDefined();
    });

    it('should have max length validation', () => {
      const maxRule = StringMultiLang_o[1];
      expect(maxRule.max).toBe(500);
      expect(maxRule.message).toBeDefined();
    });
  });

  describe('STMultiLang_r (Short Text Required)', () => {
    it('should export correct validation rules', () => {
      expect(STMultiLang_r).toBeDefined();
      expect(Array.isArray(STMultiLang_r)).toBe(true);
      expect(STMultiLang_r).toHaveLength(2);
    });

    it('should have warningOnly rule for empty values', () => {
      const warningRule = STMultiLang_r[0];
      expect(warningRule.warningOnly).toBe(true);
      expect(warningRule.message).toBeDefined();
    });

    it('should have max length validation of 1000', () => {
      const maxRule = STMultiLang_r[1];
      expect(maxRule.max).toBe(1000);
      expect(maxRule.message).toBeDefined();
    });
  });

  describe('STMultiLang_o (Short Text Optional)', () => {
    it('should export correct validation rules', () => {
      expect(STMultiLang_o).toBeDefined();
      expect(Array.isArray(STMultiLang_o)).toBe(true);
      expect(STMultiLang_o).toHaveLength(2);
    });

    it('should have optional message for empty values', () => {
      const optionalRule = STMultiLang_o[0];
      expect(optionalRule.message).toBeDefined();
    });

    it('should have max length validation of 1000', () => {
      const maxRule = STMultiLang_o[1];
      expect(maxRule.max).toBe(1000);
      expect(maxRule.message).toBeDefined();
    });
  });

  describe('FTMultiLang_r (Full Text Required)', () => {
    it('should export correct validation rules', () => {
      expect(FTMultiLang_r).toBeDefined();
      expect(Array.isArray(FTMultiLang_r)).toBe(true);
      expect(FTMultiLang_r).toHaveLength(1);
    });

    it('should have warningOnly rule for empty values', () => {
      const warningRule = FTMultiLang_r[0];
      expect(warningRule.warningOnly).toBe(true);
      expect(warningRule.message).toBeDefined();
    });
  });

  describe('String_m (Mandatory)', () => {
    it('should export correct validation rules', () => {
      expect(String_m).toBeDefined();
      expect(Array.isArray(String_m)).toBe(true);
      expect(String_m).toHaveLength(2);
    });

    it('should have warningOnly rule for empty values', () => {
      const warningRule = String_m[0];
      expect(warningRule.warningOnly).toBe(true);
      expect(warningRule.message).toBeDefined();
    });

    it('should have whitespace, min, and max validation', () => {
      const validationRule = String_m[1];
      expect(validationRule.whitespace).toBe(true);
      expect(validationRule.min).toBe(1);
      expect(validationRule.max).toBe(500);
      expect(validationRule.message).toBeDefined();
    });
  });

  describe('String_r (Required)', () => {
    it('should export correct validation rules', () => {
      expect(String_r).toBeDefined();
      expect(Array.isArray(String_r)).toBe(true);
      expect(String_r).toHaveLength(2);
    });

    it('should have warningOnly rule for empty values', () => {
      const warningRule = String_r[0];
      expect(warningRule.warningOnly).toBe(true);
      expect(warningRule.message).toBeDefined();
    });

    it('should have whitespace, min, and max validation', () => {
      const validationRule = String_r[1];
      expect(validationRule.whitespace).toBe(true);
      expect(validationRule.min).toBe(1);
      expect(validationRule.max).toBe(500);
      expect(validationRule.message).toBeDefined();
    });
  });

  describe('String_o (Optional)', () => {
    it('should export correct validation rules', () => {
      expect(String_o).toBeDefined();
      expect(Array.isArray(String_o)).toBe(true);
      expect(String_o).toHaveLength(2);
    });

    it('should have optional message for empty values', () => {
      const optionalRule = String_o[0];
      expect(optionalRule.message).toBeDefined();
    });

    it('should have whitespace, min, and max validation', () => {
      const validationRule = String_o[1];
      expect(validationRule.whitespace).toBe(true);
      expect(validationRule.min).toBe(1);
      expect(validationRule.max).toBe(500);
      expect(validationRule.message).toBeDefined();
    });
  });

  describe('ST_r (Short Text Required)', () => {
    it('should export correct validation rules', () => {
      expect(ST_r).toBeDefined();
      expect(Array.isArray(ST_r)).toBe(true);
      expect(ST_r).toHaveLength(2);
    });

    it('should have warningOnly rule for empty values', () => {
      const warningRule = ST_r[0];
      expect(warningRule.warningOnly).toBe(true);
      expect(warningRule.message).toBeDefined();
    });

    it('should have max length validation of 1000', () => {
      const maxRule = ST_r[1];
      expect(maxRule.max).toBe(1000);
      expect(maxRule.message).toBeDefined();
    });
  });

  describe('dataSetVersion', () => {
    it('should export correct validation rules', () => {
      expect(dataSetVersion).toBeDefined();
      expect(Array.isArray(dataSetVersion)).toBe(true);
      expect(dataSetVersion).toHaveLength(2);
    });

    it('should have required rule', () => {
      const requiredRule = dataSetVersion[0];
      expect(requiredRule.required).toBe(true);
      expect(requiredRule.message).toBeDefined();
    });

    it('should have pattern validation for version format', () => {
      const patternRule = dataSetVersion[1];
      expect(patternRule.pattern).toBeDefined();
      expect(patternRule.pattern?.toString()).toBe('/^\\d{2}\\.\\d{2}\\.\\d{3}$/');
      expect(patternRule.message).toBeDefined();
    });
  });

  describe('emailvalidation', () => {
    it('should export correct validation rules', () => {
      expect(emailvalidation).toBeDefined();
      expect(Array.isArray(emailvalidation)).toBe(true);
      expect(emailvalidation).toHaveLength(1);
    });

    it('should have email type validation', () => {
      const emailRule = emailvalidation[0];
      expect((emailRule as any).type).toBe('email');
      expect((emailRule as any).message).toBeDefined();
    });
  });

  describe('WWWAddress', () => {
    it('should export correct validation rules', () => {
      expect(WWWAddress).toBeDefined();
      expect(Array.isArray(WWWAddress)).toBe(true);
      expect(WWWAddress).toHaveLength(2);
    });

    it('should have warningOnly rule for empty values', () => {
      const warningRule = WWWAddress[0];
      expect((warningRule as any).warningOnly).toBe(true);
      expect((warningRule as any).message).toBeDefined();
    });

    it('should have URL type validation', () => {
      const urlRule = WWWAddress[1];
      expect((urlRule as any).type).toBe('url');
      expect((urlRule as any).message).toBeDefined();
    });
  });

  describe('CASNumber', () => {
    it('should export correct validation rules', () => {
      expect(CASNumber).toBeDefined();
      expect(Array.isArray(CASNumber)).toBe(true);
      expect(CASNumber).toHaveLength(2);
    });

    it('should have warningOnly rule for empty values', () => {
      const warningRule = CASNumber[0];
      expect(warningRule.warningOnly).toBe(true);
      expect(warningRule.message).toBeDefined();
    });

    it('should have pattern validation for CAS number format', () => {
      const patternRule = CASNumber[1];
      expect(patternRule.pattern).toBeDefined();
      expect(patternRule.pattern?.toString()).toBe('/^\\d{2,7}-\\d{2}-\\d$/');
      expect(patternRule.message).toBeDefined();
    });
  });

  describe('NullableString', () => {
    it('should export correct validation rules', () => {
      expect(NullableString).toBeDefined();
      expect(Array.isArray(NullableString)).toBe(true);
      expect(NullableString).toHaveLength(2);
    });

    it('should have warningOnly rule for empty values', () => {
      const warningRule = NullableString[0];
      expect(warningRule.warningOnly).toBe(true);
      expect(warningRule.message).toBeDefined();
    });

    it('should have string type and max length validation', () => {
      const validationRule = NullableString[1];
      expect(validationRule.type).toBe('string');
      expect(validationRule.max).toBe(500);
      expect(validationRule.message).toBeDefined();
    });
  });

  describe('Yearvalidation_r (Year Required)', () => {
    it('should export correct validation rules', () => {
      expect(Yearvalidation_r).toBeDefined();
      expect(Array.isArray(Yearvalidation_r)).toBe(true);
      expect(Yearvalidation_r).toHaveLength(2);
    });

    it('should have warningOnly rule for empty values', () => {
      const warningRule = Yearvalidation_r[0];
      expect(warningRule.warningOnly).toBe(true);
      expect(warningRule.message).toBeDefined();
    });

    it('should have pattern validation for year format', () => {
      const patternRule = Yearvalidation_r[1];
      expect(patternRule.pattern).toBeDefined();
      expect(patternRule.pattern?.toString()).toBe('/^[0-9]{4}$/');
      expect(patternRule.message).toBeDefined();
    });
  });

  describe('Validation rule structure', () => {
    it('should have consistent structure across all rules', () => {
      const allRules = [
        StringMultiLang_r,
        StringMultiLang_o,
        STMultiLang_r,
        STMultiLang_o,
        FTMultiLang_r,
        String_m,
        String_r,
        String_o,
        ST_r,
        dataSetVersion,
        emailvalidation,
        WWWAddress,
        CASNumber,
        NullableString,
        Yearvalidation_r,
      ];

      allRules.forEach((ruleArray) => {
        expect(Array.isArray(ruleArray)).toBe(true);
        ruleArray.forEach((rule) => {
          expect(rule).toHaveProperty('message');
          expect((rule as any).message).toBeDefined();
        });
      });
    });
  });
});
