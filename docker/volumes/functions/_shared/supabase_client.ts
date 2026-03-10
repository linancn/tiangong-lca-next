import { createClient } from '@supabase/supabase-js@2';

export const supabaseClient = createClient(
  Deno.env.get('REMOTE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('REMOTE_SERVICE_API_KEY') ?? Deno.env.get('SERVICE_API_KEY') ?? '',
);
