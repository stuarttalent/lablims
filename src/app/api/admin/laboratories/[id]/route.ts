import { requireLabAdmin } from "@/lib/admin/require-lab-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireLabAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { id } = await context.params;
  if (auth.ctx.role !== "super_admin" && id !== auth.ctx.laboratoryId) {
    return NextResponse.json({ error: "Not allowed for this laboratory." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as
    | { name?: string; slug?: string }
    | null;
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.slug !== undefined) patch.slug = body.slug.trim().toLowerCase();
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role unavailable." }, { status: 503 });
  const { data, error } = await admin
    .from("laboratories")
    .update(patch)
    .eq("id", id)
    .select("id, name, slug")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ laboratory: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireLabAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  if (auth.ctx.role !== "super_admin") {
    return NextResponse.json({ error: "Only super_admin can delete laboratories." }, { status: 403 });
  }
  const { id } = await context.params;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role unavailable." }, { status: 503 });
  const { error } = await admin.from("laboratories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
