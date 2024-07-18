import { supabase } from '@/services/supabase';

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
