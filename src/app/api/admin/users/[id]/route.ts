import { requireLabAdmin } from "@/lib/admin/require-lab-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SUPER_ADMIN_ASSIGNABLE_ROLES } from "@/lib/users/roster-types";
import type { UserRole } from "@/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isUserRole(v: string): v is UserRole {
  return SUPER_ADMIN_ASSIGNABLE_ROLES.includes(v as UserRole);
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireLabAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "User id is required." }, { status: 400 });

  const body = (await request.json().catch(() => null)) as
    | {
        role?: string;
        fullName?: string;
        professionalCredential?: string;
        suspended?: boolean;
      }
    | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("id, role, laboratory_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (auth.ctx.role !== "super_admin" && existing.laboratory_id !== auth.ctx.laboratoryId) {
    return NextResponse.json({ error: "User not in your laboratory." }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (body.role !== undefined) {
    if (!isUserRole(body.role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    if (auth.ctx.role !== "super_admin" && body.role === "super_admin") {
      return NextResponse.json(
        { error: "Only super administrators can assign super_admin role." },
        { status: 403 },
      );
    }
    if (id === auth.ctx.userId && body.role !== "super_admin") {
      return NextResponse.json(
        { error: "You cannot remove your own super administrator role." },
        { status: 400 },
      );
    }
    patch.role = body.role;
  }
  if (body.fullName !== undefined) {
    if (!body.fullName.trim()) {
      return NextResponse.json({ error: "Full name cannot be empty." }, { status: 400 });
    }
    patch.full_name = body.fullName.trim();
  }
  if (body.professionalCredential !== undefined) {
    patch.professional_credential = body.professionalCredential.trim() || null;
  }
  if (body.suspended !== undefined) {
    patch.suspended_at = body.suspended ? new Date().toISOString() : null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select(
      "id, email, full_name, role, professional_credential, suspended_at, laboratory_id, branch_id",
    )
    .single();
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const admin = createSupabaseAdminClient();
  if (admin && (patch.role || patch.full_name)) {
    await admin.auth.admin.updateUserById(id, {
      user_metadata: {
        ...(patch.role ? { role: patch.role } : {}),
        ...(patch.full_name ? { full_name: patch.full_name } : {}),
      },
    });
  }

  return NextResponse.json({
    user: {
      id: updated.id,
      email: updated.email,
      fullName: updated.full_name,
      role: updated.role,
      professionalCredential: updated.professional_credential ?? undefined,
      suspendedAt: updated.suspended_at ?? undefined,
      laboratoryId: updated.laboratory_id,
      branchId: updated.branch_id ?? undefined,
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireLabAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "User id is required." }, { status: 400 });
  if (id === auth.ctx.userId) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("id, laboratory_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !existing) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (auth.ctx.role !== "super_admin" && existing.laboratory_id !== auth.ctx.laboratoryId) {
    return NextResponse.json({ error: "User not in your laboratory." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Deleting users requires SUPABASE_SERVICE_ROLE_KEY on the server." },
      { status: 503 },
    );
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
