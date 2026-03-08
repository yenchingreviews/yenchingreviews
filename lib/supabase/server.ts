import { createClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './env';

export function createSupabaseServerClient() {
  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    return null;
  }

  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: false,
    },
  });
}
