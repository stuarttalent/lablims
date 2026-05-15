/** Read Supabase URL/key from common env var names (trim quotes/whitespace). */
export function pickEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const raw = process.env[name];
    if (!raw) continue;
    const value = raw.trim().replace(/^["']|["']$/g, "");
    if (value.length > 0) return value;
  }
  return undefined;
}

const URL_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PROJECT_URL",
] as const;

const ANON_KEY_KEYS = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_KEY",
  "SUPABASE_KEY",
] as const;

export type ResolvedSupabaseEnv = {
  enabled: boolean;
  url: string;
  anonKey: string;
  /** Which env keys were found (for diagnostics; never includes values). */
  sources: { urlKey?: string; anonKeyKey?: string };
};

export function resolveSupabaseEnv(): ResolvedSupabaseEnv {
  let urlKey: string | undefined;
  let anonKeyKey: string | undefined;
  let url: string | undefined;
  let anonKey: string | undefined;

  for (const name of URL_KEYS) {
    const v = pickEnv([name]);
    if (v) {
      url = v;
      urlKey = name;
      break;
    }
  }
  for (const name of ANON_KEY_KEYS) {
    const v = pickEnv([name]);
    if (v) {
      anonKey = v;
      anonKeyKey = name;
      break;
    }
  }

  const enabled = Boolean(url && anonKey);
  return {
    enabled,
    url: url ?? "",
    anonKey: anonKey ?? "",
    sources: { urlKey, anonKeyKey },
  };
}
