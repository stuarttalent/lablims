import { NextResponse } from "next/server";

/** Expose public Supabase keys at runtime (works on Vercel without rebuilding for NEXT_PUBLIC). */
export async function GET() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    "";

  if (!url || !anonKey) {
    return NextResponse.json({
      enabled: false,
      url: null,
      anonKey: null,
    });
  }

  return NextResponse.json({
    enabled: true,
    url,
    anonKey,
  });
}
