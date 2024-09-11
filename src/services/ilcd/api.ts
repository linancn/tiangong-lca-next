import { supabase } from '@/services/supabase';
import { categoryTypeOptions } from './data';
import { genClassZH } from './util';

export async function getILCDClassification(
  categoryType: string,
  lang: string,
  getValues: string[],
) {
  try {
    const thisCategoryType = categoryTypeOptions.find((i) => i.en === categoryType);

    const result = await supabase.rpc('ilcd_classification_get', {
      this_file_name: 'ILCDClassification',
      category_type: categoryType,
      get_values: getValues,
    });

    let resultZH = null;
    if (lang === 'zh') {
      const getIds = result?.data?.map((i: any) => i['@id']);
      resultZH = await supabase.rpc('ilcd_classification_get', {
        this_file_name: 'ILCDClassification_zh',
        category_type: thisCategoryType?.zh,
        get_values: getIds,
      });
    }

    const newDatas = genClassZH(result?.data, resultZH?.data);

    return Promise.resolve({
      data: { category: newDatas },
      success: true,
    });
  } catch (e) {
    console.error(e);
    return Promise.resolve({
      data: null,
      success: false,
    });
  }
}

export async function getILCDFlowCategorization(lang: string, getValues: string[]) {
  try {
    const result = await supabase.rpc('ilcd_flow_categorization_get', {
      this_file_name: 'ILCDFlowCategorization',
      get_values: getValues,
    });

    let resultZH = null;
    if (lang === 'zh') {
      const getIds = result?.data?.map((i: any) => i['@id']);
      resultZH = await supabase.rpc('ilcd_flow_categorization_get', {
        this_file_name: 'ILCDFlowCategorization_zh',
        get_values: getIds,
      });
    }
    const newDatas = genClassZH(result?.data, resultZH?.data);

    return Promise.resolve({
      data: { category: newDatas },
      success: true,
    });
  } catch (e) {
    console.error(e);
    return Promise.resolve({
      data: null,
      success: false,
    });
  }
}

export async function getILCDFlowCategorizationAll(lang: string) {
  const result = await getILCDClassification('Flow', lang, ['all']);
  const resultElementaryFlow = await getILCDFlowCategorization(lang, ['all']);

  const newDatas = {
    category: result.data?.category,
    categoryElementaryFlow: resultElementaryFlow.data?.category,
  };

  return Promise.resolve({
    data: newDatas,
    success: true,
  });
}

export async function getILCDLocationAll(lang: string) {
  let file_name = 'ILCDLocations';
  if (lang === 'zh') {
    file_name = 'ILCDLocations_zh';
  }
  const result = await supabase
    .from('ilcd')
    .select(
      `
      file_name,
      json_ordered->ILCDLocations->location
      `,
    )
    .eq('file_name', file_name);
  return Promise.resolve({
    data: result.data ?? [],
    success: true,
  });
}

export async function getILCDLocationByValues(lang: string, get_values: string[]) {
  let file_name = 'ILCDLocations';
  if (lang === 'zh') {
    file_name = 'ILCDLocations_zh';
  }
  const result = await supabase.rpc('ilcd_location_get', {
    this_file_name: file_name,
    get_values: get_values,
  });

  return Promise.resolve({
    data: result.data,
    success: true,
  });
}

export async function getILCDLocationByValue(lang: string, get_value: string) {
  let file_name = 'ILCDLocations';
  if (lang === 'zh') {
    file_name = 'ILCDLocations_zh';
  }
  const result = await supabase.rpc('ilcd_location_get', {
    this_file_name: file_name,
    get_values: [get_value],
  });

  if (result.data?.[0]?.['#text']) {
    return Promise.resolve({
      data: get_value + ' (' + result.data?.[0]?.['#text'] + ')',
      success: true,
    });
  } else {
    return Promise.resolve({
      data: get_value,
      success: true,
    });
  }
}
