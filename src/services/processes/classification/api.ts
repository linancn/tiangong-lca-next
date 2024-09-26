import CPCClassification_en from './ISICClassification_en-US.json';
import CPCClassification_zh from './ISICClassification_zh-CN.json';

export function getISICClassification(
    getValues: string[],
) {
    try {
        let result = null;
        if (getValues.includes('all')) {
            result = CPCClassification_en?.CategorySystem?.categories?.[0]?.category;
        }
        else {
            result = CPCClassification_en?.CategorySystem?.categories?.[0]?.category?.filter((i: any) => getValues.includes(i['@name']));
        }

        return {
            data: result
        };
    } catch (e) {
        console.error(e);
        return {
            data: null,
        };
    }
}

export function getISICClassificationZH(
    getValues: string[],
) {
    try {
        let result = null;
        if (getValues.includes('all')) {
            result = CPCClassification_zh?.CategorySystem?.categories?.[0]?.category;
        }
        else {
            result = CPCClassification_zh?.CategorySystem?.categories?.[0]?.category?.filter((i: any) => getValues.includes(i['@id']));
        }

        return {
            data: result
        };
    } catch (e) {
        console.error(e);
        return {
            data: null,
        };
    }
}