import { createClient } from '@supabase/supabase-js@2';

const supabaseUrl =
  Deno.env.get('REMOTE_SUPABASE_URL') ??
  Deno.env.get('SUPABASE_URL') ??
  Deno.env.get('SUPABASE_PUBLIC_URL') ??
  '';

const supabaseKey =
  Deno.env.get('REMOTE_SERVICE_API_KEY') ??
  Deno.env.get('SERVICE_API_KEY') ??
  Deno.env.get('REMOTE_SUPABASE_SERVICE_ROLE_KEY') ??
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  Deno.env.get('SUPABASE_ANON_KEY') ??
  '';

export const supabaseClient = createClient(
  supabaseUrl,
  supabaseKey,
);
