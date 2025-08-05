import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';

import { createClient } from '@supabase/supabase-js@2';
import getUserRole from '../_shared/get_user_role.ts';

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

  const { reviewIds, data } = await req.json();

  const { data: userRole } = await getUserRole(user.id, supabase);
  // const isReviewMember = userRole?.find((item: any) => item.role === 'review-member');
  const isReviewAdmin = userRole?.find((item: any) => item.role === 'review-admin');
  if (!isReviewAdmin && user.id !== data?.json?.user?.id) {
    return new Response('Forbidden', { status: 403 });
  }

  const updateResult = await supabase.from('reviews').update(data).in('id', reviewIds).select();

  return new Response(JSON.stringify(updateResult), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
});
