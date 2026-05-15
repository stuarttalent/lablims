import { isSupabaseConfiguredAtBuild } from "@/lib/supabase/config";

/** True when env vars were present at build time. Runtime may still enable Supabase via API. */
export function isSupabaseConfigured(): boolean {
  return isSupabaseConfiguredAtBuild();
}
