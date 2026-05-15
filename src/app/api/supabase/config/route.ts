import { getSupabaseEnvDiagnostics } from "@/lib/supabase/server-config";
import { resolveSupabaseEnv } from "@/lib/supabase/resolve-env";
import { NextResponse } from "next/server";

/** Expose public Supabase keys at runtime (works on Vercel without rebuilding for NEXT_PUBLIC). */
export async function GET() {
  const { enabled, url, anonKey } = resolveSupabaseEnv();
  const diagnostics = getSupabaseEnvDiagnostics();

  if (!enabled) {
    return NextResponse.json({
      enabled: false,
      url: null,
      anonKey: null,
      diagnostics,
    });
  }

  return NextResponse.json({
    enabled: true,
    url,
    anonKey,
    diagnostics,
  });
}
