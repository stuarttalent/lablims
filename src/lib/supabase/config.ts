export type SupabaseRuntimeConfig = {
  enabled: boolean;
  url: string;
  anonKey: string;
};

let cached: SupabaseRuntimeConfig | null = null;
let inflight: Promise<SupabaseRuntimeConfig> | null = null;

/** Build-time check (may be false on Vercel until redeploy). */
export function isSupabaseConfiguredAtBuild(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Resolves config from env or /api/supabase/config (runtime). */
export async function getSupabaseConfig(): Promise<SupabaseRuntimeConfig> {
  if (cached) return cached;

  if (isSupabaseConfiguredAtBuild()) {
    cached = {
      enabled: true,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
