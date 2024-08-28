import { supabase } from '@/services/supabase';
import { categoryTypeOptions } from './data';

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

function genClassZH(data: any, dataZH: any) {
  if (data) {
    return data.map((i: any) => {
      const zh = dataZH.find((j: any) => j['@id'] === i['@id']);
      return {
        '@id': i['@id'],
        '@name': i['@name'],
        '@nameZH': zh?.['@name'] ?? i['@name'],
        category: genClassZH(i?.category, zh?.category),
      };
    });
  }
}

export async function getILCDClassificationZh(datatype: string) {
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
