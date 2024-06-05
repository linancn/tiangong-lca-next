import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';

export async function flowHybridSearch(query: string) {
  const { data } = await supabase.rpc('flow_hybrid_search', { query: query });
  return data;
}

export async function returnUserEdgeFunction() {
  const session = await supabase.auth.getSession();
  const { data } = await supabase.functions.invoke('return_user', {
    headers: {
      Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
    },
    body: {},
    region: FunctionRegion.UsEast1,
  });
  return data;
}

export async function jsonSelectTest() {
  const { data, error } = await supabase
    .from('contacts')
    .select(
      `
        id,
        json->contactDataSet->contactInformation->dataSetInformation->"common:shortName",
        json->contactDataSet->contactInformation->dataSetInformation->"common:name",
        json->contactDataSet->contactInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
        json->contactDataSet->contactInformation->dataSetInformation->email,
        created_at
        `,
    )
    .order('created_at', { ascending: true })
    // .limit(10)
    .range(10, 20);
  console.log('data', data);
  console.log('error', error);
  return data;
}
