import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL environment variable. Please add it to your .env.local file.");
  }
  if (!supabaseAnonKey) {
    throw new Error("Missing SUPABASE_ANON_KEY environment variable. Please add it to your .env.local file.");
  }

  _client = createClient(supabaseUrl, supabaseAnonKey);
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
