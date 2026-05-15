import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveSupabaseEnv } from "@/lib/supabase/resolve-env";

let adminClient: SupabaseClient | null = null;

/** Service-role client for Auth Admin API (server only). */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const { enabled, url } = resolveSupabaseEnv();
  if (!enabled || !serviceKey) return null;

  if (!adminClient) {
    adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}
