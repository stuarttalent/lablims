import { resolveSupabaseEnv } from "@/lib/supabase/resolve-env";

export type SupabaseRuntimeConfig = {
  enabled: boolean;
  url: string;
  anonKey: string;
};

let cached: SupabaseRuntimeConfig | null = null;
let inflight: Promise<SupabaseRuntimeConfig> | null = null;

/** Set from server layout so the client does not depend on a client-side env bundle. */
export function seedSupabaseConfig(config: SupabaseRuntimeConfig) {
  if (config.enabled) cached = config;
}

/** Build-time check (may be false on Vercel until redeploy). */
export function isSupabaseConfiguredAtBuild(): boolean {
  return resolveSupabaseEnv().enabled;
}

/** Resolves config from env or /api/supabase/config (runtime). */
export async function getSupabaseConfig(): Promise<SupabaseRuntimeConfig> {
  if (cached?.enabled) return cached;

  const buildTime = resolveSupabaseEnv();
  if (buildTime.enabled) {
    cached = {
      enabled: true,
      url: buildTime.url,
      anonKey: buildTime.anonKey,
    };
    return cached;
  }

  if (!inflight) {
    inflight = fetch("/api/supabase/config", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as {
          enabled?: boolean;
          url?: string | null;
          anonKey?: string | null;
        };
        if (data.enabled && data.url && data.anonKey) {
          return { enabled: true, url: data.url, anonKey: data.anonKey };
        }
        return { enabled: false, url: "", anonKey: "" };
      })
      .catch(() => ({ enabled: false, url: "", anonKey: "" }))
      .finally(() => {
        inflight = null;
      });
  }

  const result = await inflight;
  cached = result;
  return result;
}

export function clearSupabaseConfigCache() {
  cached = null;
}
