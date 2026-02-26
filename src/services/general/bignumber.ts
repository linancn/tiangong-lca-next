import BigNumber from 'bignumber.js';

/**
 * Parse any input into BigNumber without throwing.
 * Invalid input returns fallback (default: NaN) to keep call sites explicit and safe.
 */
export function toBigNumber(value: unknown, fallback: BigNumber.Value = NaN): BigNumber {
  if (BigNumber.isBigNumber(value)) {
    return value as BigNumber;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return new BigNumber(fallback);
  }

  try {
    return new BigNumber(value as BigNumber.Value);
  } catch (error) {
    return new BigNumber(fallback);
  }
}

/**
 * Parse to BigNumber and keep invalid values as NaN.
 */
export function toBigNumberOrNaN(value: unknown): BigNumber {
  return toBigNumber(value, NaN);
}

/**
 * Parse to BigNumber and coerce invalid values to 0.
 */
export function toBigNumberOrZero(value: unknown): BigNumber {
  return toBigNumber(value, 0);
}
