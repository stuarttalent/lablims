import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";

let client: SupabaseClient | null = null;

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const config = await getSupabaseConfig();
  if (!config.enabled) return null;

  if (!client) {
    client = createBrowserClient(config.url, config.anonKey);
  }
  return client;
}

/** @deprecated Prefer getSupabaseClient() — throws if not configured at build time only. */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_URL / SUPABASE_ANON_KEY on the server.",
    );
  }
  return createBrowserClient(url, key);
}

export function resetSupabaseClient() {
  client = null;
}
