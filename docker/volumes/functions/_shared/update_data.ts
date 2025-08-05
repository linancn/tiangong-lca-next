import { SupabaseClient } from '@supabase/supabase-js@2';

async function updateData(
  id: string,
  version: string,
  table: string,
  data: any,
  supabase: SupabaseClient,
) {
  const updateResult = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .eq('version', version)
    .select();
  return Promise.resolve(updateResult);
}

export default updateData;
