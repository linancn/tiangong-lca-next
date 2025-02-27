// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from '@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const session = new Supabase.ai.Session('gte-small');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Get the session or user object
  const authHeader = req.headers.get('Authorization');
  const xKey = req.headers.get('x_key');

  // If no authHeader and no xKey, return error
  if (!authHeader && !xKey) {
    return new Response('Unauthorized Request', { status: 401 });
  }

  let user;
  if (xKey === Deno.env.get('X_KEY')) {
    // Allow user if xKey is present
    user = { role: 'authenticated' };
  } else {
    const token = authHeader?.replace('Bearer ', '') ?? '';

    const supabaseClient = createClient(
      Deno.env.get('REMOTE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('REMOTE_SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data } = await supabaseClient.auth.getUser(token);
    if (!data || !data.user) {
      return new Response('User Not Found', { status: 404 });
    }
    user = data.user;
  }

  if (user?.role !== 'authenticated') {
    return new Response('Forbidden', { status: 403 });
  }

  // Extract input string from JSON body
  const { input } = await req.json();

  // Generate the embedding from the user input
  const embedding = await session.run(input, {
    mean_pool: true,
    normalize: true,
  });

  // Return the embedding
  return new Response(JSON.stringify({ embedding }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
