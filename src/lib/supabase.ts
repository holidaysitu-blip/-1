import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxssdnqxtfrpqelbndm.supabase.co';
const supabaseAnonKey = 'sb_publishable_MRWE76p6NKjJ5VCg-PRv0w_NX05Rx_R';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);