import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { resolveSupabaseEnv } from "@/lib/supabase/resolve-env";

/** Supabase client for Route Handlers / Server Components (session from cookies). */
export async function createSupabaseServerClient() {
  const { enabled, url, anonKey } = resolveSupabaseEnv();
  if (!enabled) {
    throw new Error("Supabase is not configured");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component without mutable cookies — ignore.
        }
      },
    },
  });
}
