import CPCClassification_en from './CPCClassification_en-US.json';
import CPCClassification_zh from './CPCClassification_zh-CN.json';

export function getCPCClassification(getValues: string[]) {
  try {
    let result = null;
    if (getValues.includes('all')) {
      result = CPCClassification_en?.CategorySystem?.categories?.[0]?.category;
    } else {
      result = CPCClassification_en?.CategorySystem?.categories?.[0]?.category?.filter((i: any) =>
        getValues.includes(i['@name']),
      );
    }

    return {
      data: result,
    };
  } catch (e) {
    console.error(e);
    return {
      data: null,
    };
  }
}

export function getCPCClassificationZH(getValues: string[]) {
  try {
    let result = null;
    if (getValues.includes('all')) {
      result = CPCClassification_zh?.CategorySystem?.categories?.[0]?.category;
    } else {
      result = CPCClassification_zh?.CategorySystem?.categories?.[0]?.category?.filter((i: any) =>
        getValues.includes(i['@id']),
      );
    }

    return {
      data: result,
    };
  } catch (e) {
    console.error(e);
    return {
      data: null,
    };
  }
}
