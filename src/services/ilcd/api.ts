import { supabase } from '@/services/supabase';
import { categoryTypeOptions } from './data';
import { genClassZH } from './util';

export async function getILCDClassification(datatype: string) {
  const result = await supabase
    .from('ilcd_classification')
    .select('category')
    .eq('datatype', datatype);
  if (result.data && result.data.length > 0) {
    const data = result.data[0];
    return Promise.resolve({
      data: {
        category: data.category,
      },
      success: true,
    });
  }
  return Promise.resolve({
    data: null,
    success: true,
  });
}

export async function getILCDClassificationZH(datatype: string) {
  try {
    const thisDataType = categoryTypeOptions.find((i) => i.en === datatype);

    const result = await supabase
      .from('ilcd_classification')
      .select('category')
      .eq('datatype', datatype);

    const resultZH = await supabase
      .from('ilcd_classification')
      .select('category')
      .eq('datatype', thisDataType?.zh);

    const data = result?.data?.[0];
    const dataZH = resultZH?.data?.[0];

    const newDatas = genClassZH(data?.category, dataZH?.category);

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

export async function getILCDFlowCategorization() {
  const result = await supabase
    .from('ilcd')
    .select(
      `
        file_name,
        json->CategorySystem->categories->category
        `,
    )
    .eq('file_name', 'ILCDFlowCategorization');

  if (result.data && result.data.length > 0) {
    const data = result.data[0];
    return Promise.resolve({
      data: {
        category: data.category,
      },
      success: true,
    });
  }
  return Promise.resolve({
    data: null,
    success: true,
  });
}

export async function getILCDFlowCategorizationZH() {
  try {
    const result = await supabase
      .from('ilcd')
      .select(
        `
        file_name,
        json->CategorySystem->categories->category
        `,
      )
      .or('file_name.eq.ILCDFlowCategorization,file_name.eq.ILCDFlowCategorization_zh');

    const data = result?.data?.find((i) => i.file_name === 'ILCDFlowCategorization');
    const dataZH = result?.data?.find((i) => i.file_name === 'ILCDFlowCategorization_zh');

    const newDatas = genClassZH(data?.category, dataZH?.category);

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

export async function getILCDFlowCategorizationAllZH() {
  const result = await getILCDClassificationZH('Flow');
  const resultElementaryFlow = await getILCDFlowCategorizationZH();

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
