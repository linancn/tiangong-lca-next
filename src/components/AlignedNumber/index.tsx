import BigNumber from 'bignumber.js';

// Use scientific notation only for very large/small numbers
const EXP_POS_THRESHOLD = 1e6; // 1 million
const EXP_NEG_THRESHOLD = 1e-5; // 0.00001

export function toSuperscript(num: string) {
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
  return num.replace(/[0-9+-]/g, (c) => map[c] || c);
}

function trimTrailingZeros(s: string) {
  // Remove unnecessary trailing zeros and decimal point
  if (s.indexOf('.') === -1) return s;

  if (s.includes('e')) {
    return s.replace(/(\.\d*?)0+(e[+-]?\d+)$/, '$1$2').replace(/\.e/, 'e');
  }

  return s.replace(/\.?0+$/, '');
}

const AlignedNumber = ({ number, precision = 4 }: { number: number; precision?: number }) => {
  if (number === null || number === undefined || isNaN(number)) {
    return <span style={{ textAlign: 'right', display: 'inline-block', width: '100%' }}>-</span>;
  }

  const bn = new BigNumber(number);
  let strValue = '';

  // Determine if scientific notation is needed
  if (
    (!bn.isZero() && bn.abs().gte(EXP_POS_THRESHOLD)) ||
    (!bn.isZero() && bn.abs().lt(EXP_NEG_THRESHOLD))
  ) {
    // 科学计数法格式化为 2.90×10⁸
    const expStr = trimTrailingZeros(bn.toExponential(precision));
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
      strValue = trimTrailingZeros(bn.toFormat(decimalPlaces));
    } else {
      // Automatically remove unnecessary zeros; do not show decimal point for integers
      strValue = trimTrailingZeros(bn.toFormat(precision));
    }
  }

  return <span className='decimal-align'>{strValue}</span>;
};

export default AlignedNumber;
