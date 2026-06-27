import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;
