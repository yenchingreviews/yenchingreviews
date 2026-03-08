export function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const missingVars = [
    !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : null,
  ].filter((name): name is string => Boolean(name));

  return {
    supabaseUrl,
    supabaseAnonKey,
    isConfigured: missingVars.length === 0,
    missingVars,
  };
}

export function getSupabaseSetupMessage() {
  const { missingVars } = getSupabaseEnv();

  if (missingVars.length === 0) {
    return null;
  }

  return `Supabase is not configured. Missing ${missingVars.join(', ')}.`;
}
