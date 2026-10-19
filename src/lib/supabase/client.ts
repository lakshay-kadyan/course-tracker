import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// NEXT_PUBLIC_* values are meant for the browser: the URL and the publishable (anon) key. Row-level security in the
// database is what protects the data. Never put the service-role / secret key in any NEXT_PUBLIC_ variable.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
// Both names are accepted: ANON_KEY (older) and PUBLISHABLE_KEY (what the Supabase Next.js panel shows).
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

/** True when both variables are set. When false the app runs as the local demo (localStorage, sample data). */
export const supabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  if (!url || !key) throw new Error("Supabase is not configured");
  return (client ??= createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }));
}
