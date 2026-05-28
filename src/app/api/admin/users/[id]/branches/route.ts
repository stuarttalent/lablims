import { requireLabAdmin } from "@/lib/admin/require-lab-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireLabAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { id: profileId } = await context.params;

  const body = (await request.json().catch(() => null)) as
    | { branchIds?: string[] }
    | null;
  const branchIds = body?.branchIds ?? [];
  if (!Array.isArray(branchIds)) {
    return NextResponse.json({ error: "branchIds must be an array." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: target, error: targetErr } = await supabase
    .from("profiles")
    .select("id, laboratory_id")
    .eq("id", profileId)
    .maybeSingle();
  if (targetErr || !target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (auth.ctx.role !== "super_admin" && target.laboratory_id !== auth.ctx.laboratoryId) {
    return NextResponse.json({ error: "User not in your laboratory." }, { status: 403 });
  }

  const { data: allowedBranches, error: branchErr } = await supabase
    .from("lab_branches")
    .select("id")
    .eq("laboratory_id", target.laboratory_id);
  if (branchErr) return NextResponse.json({ error: branchErr.message }, { status: 500 });
  const allowed = new Set((allowedBranches ?? []).map((b) => b.id));
  for (const bid of branchIds) {
    if (!allowed.has(bid)) {
      return NextResponse.json({ error: "One or more branches are outside this laboratory." }, { status: 400 });
    }
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role unavailable." }, { status: 503 });

  await admin.from("profile_branch_memberships").delete().eq("profile_id", profileId);
  if (branchIds.length > 0) {
    const { error: insertErr } = await admin.from("profile_branch_memberships").insert(
      branchIds.map((branchId) => ({ profile_id: profileId, branch_id: branchId })),
    );
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
