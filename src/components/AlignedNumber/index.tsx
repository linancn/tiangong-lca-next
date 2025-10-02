import BigNumber from 'bignumber.js';

// Use scientific notation only for very large/small numbers
const EXP_POS_THRESHOLD = 1e6; // 1 million
const EXP_NEG_THRESHOLD = 1e-5; // 0.00001
const ROUNDING_MODE = BigNumber.ROUND_DOWN; // match display tests by trimming towards zero

export function toSuperscript(num: string) {
  // Add null/undefined check
  if (!num || typeof num !== 'string') {
    return '';
  }
  const map: Record<string, string> = {
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
    '+': '',
    '-': '⁻',
  };
  return num?.replace(/[0-9+-]/g, (c) => (map[c] !== undefined ? map[c] : c));
}

function trimTrailingZeros(s: string) {
  // Remove unnecessary trailing zeros and decimal point
  if (s.indexOf('.') === -1) return s;

  if (s.includes('e')) {
    return s.replace(/(\.\d*?)0+(e[+-]?\d+)$/, '$1$2').replace(/\.e/, 'e');
  }

  return s.replace(/\.?0+$/, '');
}

const placeholder = (
  <span style={{ textAlign: 'right', display: 'inline-block', width: '100%' }}>-</span>
);

const AlignedNumber = ({
  value,
  precision = 4,
}: {
  value: number | string | null | undefined;
  precision?: number;
}) => {
  if (value === null || value === undefined) {
    return placeholder;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return placeholder;
  }

  let bn: BigNumber;
  try {
    bn = new BigNumber(value as BigNumber.Value);
  } catch (error) {
    return placeholder;
  }

  if (!bn.isFinite() || bn.isNaN()) {
    return placeholder;
  }

  let strValue = '';

  // Determine if scientific notation is needed
  if (
    (!bn.isZero() && bn.abs().gte(EXP_POS_THRESHOLD)) ||
    (!bn.isZero() && bn.abs().lte(EXP_NEG_THRESHOLD))
  ) {
    // 科学计数法格式化为 2.90×10⁸
    const expStr = trimTrailingZeros(bn.toExponential(precision, ROUNDING_MODE));
    const match = expStr.match(/^([\d.]+)e([+-]?\d+)$/);
    if (match) {
      const base = match[1];
      let exp = match[2].replace(/^\+/, '');
      strValue = `${base}×10${toSuperscript(exp)}`;
    } else {
      strValue = expStr;
    }
  } else {
    // For small decimals between EXP_NEG_THRESHOLD and 1, use more decimal places to avoid rounding to 0
    if (!bn.isZero() && bn.abs().lt(1) && bn.abs().gte(EXP_NEG_THRESHOLD)) {
      // Calculate needed decimal places for small numbers
      const decimalPlaces = Math.max(
        precision,
        -Math.floor(Math.log10(bn.abs().toNumber())) + precision - 1,
      );
      strValue = trimTrailingZeros(bn.toFormat(decimalPlaces, ROUNDING_MODE));
    } else {
      // Automatically remove unnecessary zeros; do not show decimal point for integers
      strValue = trimTrailingZeros(bn.toFormat(precision, ROUNDING_MODE));
    }
  }

  return <span className='decimal-align'>{strValue}</span>;
};

export default AlignedNumber;
