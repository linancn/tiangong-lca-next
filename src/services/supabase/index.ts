import { createClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from './key';

const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);
