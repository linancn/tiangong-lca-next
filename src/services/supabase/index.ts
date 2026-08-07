import { createClient } from '@supabase/supabase-js';
import { supabasePublishableKey, supabaseUrl } from './key';

const options = {
  db: {
    schema: 'api',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
};
export const supabase = createClient(supabaseUrl, supabasePublishableKey, options);
