import { createClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from './key';

const options = {
  auth: {
    autorRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);
