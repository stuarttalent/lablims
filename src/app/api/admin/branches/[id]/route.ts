import { requireLabAdmin } from "@/lib/admin/require-lab-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireLabAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { id } = await context.params;

  const supabase = await createSupabaseServerClient();
  const { data: current, error: currErr } = await supabase
    .from("lab_branches")
    .select("id, laboratory_id")
    .eq("id", id)
    .maybeSingle();
  if (currErr || !current) return NextResponse.json({ error: "Branch not found." }, { status: 404 });
  if (auth.ctx.role !== "super_admin" && current.laboratory_id !== auth.ctx.laboratoryId) {
    return NextResponse.json({ error: "Branch not in your laboratory." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: string; code?: string; address?: string; active?: boolean }
    | null;
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.code !== undefined) patch.code = body.code.trim() || null;
  if (body.address !== undefined) patch.address = body.address.trim() || null;
  if (body.active !== undefined) patch.active = body.active;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role unavailable." }, { status: 503 });
  const { data, error } = await admin
    .from("lab_branches")
    .update(patch)
    .eq("id", id)
    .select("id, laboratory_id, name, code, address, active")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ branch: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireLabAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data: current, error: currErr } = await supabase
    .from("lab_branches")
    .select("id, laboratory_id")
    .eq("id", id)
    .maybeSingle();
  if (currErr || !current) return NextResponse.json({ error: "Branch not found." }, { status: 404 });
  if (auth.ctx.role !== "super_admin" && current.laboratory_id !== auth.ctx.laboratoryId) {
    return NextResponse.json({ error: "Branch not in your laboratory." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role unavailable." }, { status: 503 });
  const { error } = await admin.from("lab_branches").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
