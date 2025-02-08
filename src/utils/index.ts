import { message } from 'antd';
import { getIntl } from 'umi';
const convert = require('convert-units');

function convertUnit(value: number, fromUnit: string | undefined, toUnit: string) {
  const intl = getIntl();
  if (!fromUnit || !toUnit) {
    return { value, status: 'success' };
  }
  try {
    const result = convert(value).from(fromUnit).to(toUnit);
    return { value: result, status: 'success' };
  } catch (error) {
    message.error(intl.formatMessage({ id: 'prompts.convertUnit.error' }));
    console.log(error);
    return { value, status: 'fail' };
  }
}

export { convertUnit };
