import { createClient } from '@supabase/supabase-js';
import { supabasePublishableKey, supabaseUrl } from './key';

const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
};
export const supabase = createClient(supabaseUrl, supabasePublishableKey, options);
