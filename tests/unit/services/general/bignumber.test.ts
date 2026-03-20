import BigNumber from 'bignumber.js';

import { toBigNumber, toBigNumberOrNaN, toBigNumberOrZero } from '@/services/general/bignumber';

describe('BigNumber parsing helpers (src/services/general/bignumber.ts)', () => {
  it('returns the same BigNumber instance when the input is already normalized', () => {
    const value = new BigNumber('123.45');

    expect(toBigNumber(value)).toBe(value);
  });

  it('uses the fallback when the input is a blank string', () => {
    expect(toBigNumber('   ', '7.5').toString()).toBe('7.5');
  });

  it('falls back when BigNumber construction throws for an unsupported value', () => {
    expect(toBigNumber(Symbol('bad-input'), 42).toString()).toBe('42');
  });

  it('keeps invalid parses as NaN in the explicit NaN helper', () => {
    expect(toBigNumberOrNaN('not-a-number').isNaN()).toBe(true);
  });

  it('coerces invalid parses to zero in the zero helper', () => {
    expect(toBigNumberOrZero(Symbol('bad-input')).toNumber()).toBe(0);
  });
});
