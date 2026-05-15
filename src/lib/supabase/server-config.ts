import type { SupabaseRuntimeConfig } from "@/lib/supabase/config";
import { resolveSupabaseEnv } from "@/lib/supabase/resolve-env";

/** Server-only: read Supabase config from process.env on each request. */
export function getServerSupabaseConfig(): SupabaseRuntimeConfig {
  const { enabled, url, anonKey } = resolveSupabaseEnv();
  return { enabled, url, anonKey };
}

export function getSupabaseEnvDiagnostics() {
  const resolved = resolveSupabaseEnv();
  return {
    enabled: resolved.enabled,
    urlKey: resolved.sources.urlKey ?? null,
    anonKeyKey: resolved.sources.anonKeyKey ?? null,
    missing: [
      !resolved.sources.urlKey ? "SUPABASE URL (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)" : null,
      !resolved.sources.anonKeyKey
        ? "anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY)"
        : null,
    ].filter(Boolean) as string[],
  };
}
