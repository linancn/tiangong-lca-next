import { createClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl,serviceRoleKey } from './key';

const options = {
  auth: {
    autorRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
};

const authOptions = {
  db: {
    schema: 'public',
  },
  auth: {
    autorRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);
export const supabaseAuth = createClient(supabaseUrl, serviceRoleKey, options);
