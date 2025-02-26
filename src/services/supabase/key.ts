export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL_SELF_HOSTING ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'http://kong:8000';

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SELF_HOSTING ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const supabaseStorageBucket = 'external_docs';
