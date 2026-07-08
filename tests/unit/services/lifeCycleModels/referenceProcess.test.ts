import {
  toReferenceProcessKey,
  toReferenceProcessNumber,
} from '@/services/lifeCycleModels/referenceProcess';

describe('reference process id normalization', () => {
  describe('toReferenceProcessNumber', () => {
    it('returns integers from numeric and string inputs', () => {
      expect(toReferenceProcessNumber(0)).toBe(0);
      expect(toReferenceProcessNumber(' 12 ')).toBe(12);
      expect(toReferenceProcessNumber('-3')).toBe(-3);
    });

    it('rejects non-integer or non-string inputs', () => {
      expect(toReferenceProcessNumber(1.5)).toBeUndefined();
      expect(toReferenceProcessNumber('1.5')).toBeUndefined();
      expect(toReferenceProcessNumber('abc')).toBeUndefined();
      expect(toReferenceProcessNumber({ id: '1' })).toBeUndefined();
    });
  });

  describe('toReferenceProcessKey', () => {
    it('returns stable string keys from finite numbers and non-empty strings', () => {
      expect(toReferenceProcessKey(0)).toBe('0');
      expect(toReferenceProcessKey(' nodeA ')).toBe('nodeA');
    });

    it('rejects missing, non-finite, blank, or unsupported values', () => {
      expect(toReferenceProcessKey(null)).toBeUndefined();
      expect(toReferenceProcessKey(undefined)).toBeUndefined();
      expect(toReferenceProcessKey(Number.NaN)).toBeUndefined();
      expect(toReferenceProcessKey(Number.POSITIVE_INFINITY)).toBeUndefined();
      expect(toReferenceProcessKey('   ')).toBeUndefined();
      expect(toReferenceProcessKey({ id: 'nodeA' })).toBeUndefined();
    });
  });
});
