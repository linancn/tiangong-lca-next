import BigNumber from 'bignumber.js';

const AlignedNumber = ({ number, precision = 4 }: { number: number; precision?: number }) => {
  const value = new BigNumber(number).toExponential(precision);
  const strValue = String(value);
  const hasDecimal = strValue.includes('.');
  const [intPart, decPart = ''] = strValue.split('.');

  return (
    <>
      {isNaN(number) ? (
        <span style={{ textAlign: 'right' }}>-</span>
      ) : (
        <div className='decimal-align'>
          <span className='int'>{intPart}</span>
          <span className='dec'>
            {hasDecimal ? '.' : ''}
            {decPart}
          </span>
        </div>
      )}
    </>
  );
};

export default AlignedNumber;
