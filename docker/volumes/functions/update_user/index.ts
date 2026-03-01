import '@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { supabaseClient } from '../_shared/supabase_client.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authResult = await authenticateRequest(req, {
    supabase: supabaseClient,
    allowedMethods: [AuthMethod.JWT],
  });

  if (!authResult.isAuthenticated) {
    return authResult.response!;
  }

  const user = authResult.user;

  const { userId, data } = await req.json();
  if (!user || !user.id) {
    return new Response('Unauthorized Request', { status: 401 });
  }

  const updateResult = await supabaseClient.from('users').update(data).eq('id', userId);

  return new Response(JSON.stringify(updateResult), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
});

