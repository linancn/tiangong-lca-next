// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import '@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';

import { createClient, SupabaseClient } from '@supabase/supabase-js@2';
import check_state_code from '../_shared/check_state_code.ts';
import getDataStatus from '../_shared/get_data_status.ts';
import getUserRole from '../_shared/get_user_role.ts';
// import updateData from '../_shared/update_data.ts';

const supabase_url = Deno.env.get('REMOTE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '';
const supabase_service_key =
  Deno.env.get('REMOTE_SUPABASE_SERVICE_ROLE_KEY') ??
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  '';

const supabase = createClient(supabase_url, supabase_service_key);

const userSupabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

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
    .select('state_code,rule_verification');
  return Promise.resolve(updateResult);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // const time_start = Date.now();

  // Get the session or user object
  const authHeader = req.headers.get('Authorization');

  // If no Authorization header, return error immediately
  if (!authHeader) {
    return new Response('Unauthorized Request', { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');

  // const time_1 = Date.now();
  // console.log('Time to get Supabase Client (global) cost', time_1 - time_start, 'ms');

  const userData = await userSupabase.auth.getUser(token);

  // const time_2 = Date.now();
  // console.log('Time to get User Data cost', time_2 - time_1, 'ms');

  if (!userData?.data || !userData.data.user) {
    return new Response('User Not Found', { status: 404 });
  }

  const user = userData.data.user;
  if (user?.role !== 'authenticated') {
    return new Response('Forbidden', { status: 403 });
  }

  // const time_3 = Date.now();
  // console.log('Time to check User Auth cost', time_3 - time_2, 'ms');

  const { id, version, table, data } = await req.json();
  if (!table) {
    return new Response('Table Not Found', { status: 404 });
  }

  // Optimization: Fetch oldData and userRole concurrently
  const [oldDataResult, userRoleResult] = await Promise.all([
    getDataStatus(id, version, table, supabase),
    getUserRole(user.id, supabase),
  ]);
  const { data: oldData, success: oldDataSuccess } = oldDataResult;
  const { data: userRole } = userRoleResult;

  // const time_4 = Date.now();
  // console.log('Time to get Old Data & User Role cost', time_4 - time_3, 'ms');

  if (!oldDataSuccess) {
    return new Response('Data Not Found', { status: 404 });
  }

  if (typeof data?.state_code === 'number') {
    const checkResult = check_state_code(oldData?.stateCode, data?.state_code);
    if (!checkResult) {
      return new Response('State Code Not Allowed', { status: 403 });
    }
  }
  if (!userRole?.find((item: any) => item.role === 'review-admin') && oldData?.userId !== user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  const updateResult = await updateData(id, version, table, data, supabase);

  // const time_5 = Date.now();
  // console.log('Time to update Data cost', time_5 - time_4, 'ms');

  // const time_6 = Date.now();
  // console.log('Time total cost', time_6 - time_start, 'ms');

  return new Response(JSON.stringify(updateResult), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/update_contact' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
