import { SupabaseClient } from '@supabase/supabase-js@2';

async function getDataDetail(id: string, version: string, table: string, supabase: SupabaseClient) {
  let result: any = {};
  if (id && id.length === 36) {
    if (version && version.length === 9) {
      result = await supabase
        .from(table)
        .select('json,version, modified_at,user_id,state_code')
        .eq('id', id)
        .eq('version', version);
      if (result?.data === null || result.data.length === 0) {
        result = await supabase
          .from(table)
          .select('json,version, modified_at,user_id,state_code')
          .eq('id', id)
          .order('version', { ascending: false })
          .range(0, 0);
      }
    } else {
      result = await supabase
        .from(table)
        .select('json,version, modified_at,user_id,state_code')
        .eq('id', id)
        .order('version', { ascending: false })
        .range(0, 0);
    }
    if (result?.data && result.data.length > 0) {
      const data = result.data[0];
      return Promise.resolve({
        data: {
          id: id,
          version: data.version,
          json: data.json,
          modifiedAt: data?.modified_at,
          userId: data?.user_id,
          stateCode: data?.state_code,
        },
        success: true,
      });
    }
  }
  return Promise.resolve({
    data: null,
    success: false,
  });
}

export default getDataDetail;
