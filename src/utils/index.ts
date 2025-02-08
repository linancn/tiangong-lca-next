import { message } from "antd";

const convert = require('convert-units');

function convertUnit(value: number, fromUnit: string | undefined, toUnit: string) {
    if(!fromUnit||!toUnit){
        return { value, status: 'success' } 
    }
    try {
        const result = convert(value).from(fromUnit).to(toUnit);
        return { value: result, status: 'success' };
    } catch (error) {
        message.error('Error converting unit');
        console.log(error)
        return { value, status: 'fail' };
    }
}

export { convertUnit };