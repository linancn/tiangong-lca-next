// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import '@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';

import { createClient } from '@supabase/supabase-js@2';
import check_state_code from '../_shared/check_state_code.ts';
import getDataDetail from '../_shared/get_data.ts';
import getUserRole from '../_shared/get_user_role.ts';
import updateData from '../_shared/update_data.ts';

const supabase_url = Deno.env.get('REMOTE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '';
const supabase_service_key =
  Deno.env.get('REMOTE_SUPABASE_SERVICE_ROLE_KEY') ??
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  '';

const supabase = createClient(supabase_url, supabase_service_key);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Get the session or user object
  const authHeader = req.headers.get('Authorization');

  // If no Authorization header, return error immediately
  if (!authHeader) {
    return new Response('Unauthorized Request', { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');

  const userSupabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );

  const userData = await userSupabase.auth.getUser(token);

  if (!userData?.data || !userData.data.user) {
    return new Response('User Not Found', { status: 404 });
  }

  const user = userData.data.user;
  if (user?.role !== 'authenticated') {
    return new Response('Forbidden', { status: 403 });
  }

  const { id, version, table, data } = await req.json();
  if (!table) {
    return new Response('Table Not Found', { status: 404 });
  }
  const { data: oldData, success: oldDataSuccess } = await getDataDetail(
    id,
    version,
    table,
    supabase,
  );
  const { data: userRole } = await getUserRole(user.id, supabase);

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
