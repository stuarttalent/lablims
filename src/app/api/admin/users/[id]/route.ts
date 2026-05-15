import { requireSuperAdmin } from "@/lib/admin/require-super-admin";
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
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { role, fullName, professionalCredential } = body as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  if (role !== undefined) {
    if (typeof role !== "string" || !isUserRole(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    if (id === auth.ctx.userId && role !== "super_admin") {
      return NextResponse.json(
        { error: "You cannot remove your own super administrator role." },
        { status: 400 },
      );
    }
    patch.role = role;
  }
  if (fullName !== undefined) {
    if (typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json({ error: "Full name cannot be empty." }, { status: 400 });
    }
    patch.full_name = fullName.trim();
  }
  if (professionalCredential !== undefined) {
    patch.professional_credential =
      typeof professionalCredential === "string" && professionalCredential.trim()
        ? professionalCredential.trim()
        : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("id, role, laboratory_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (existing.laboratory_id !== auth.ctx.laboratoryId) {
    return NextResponse.json({ error: "User not in your laboratory." }, { status: 403 });
  }

  if (
    existing.role === "super_admin" &&
    patch.role &&
    patch.role !== "super_admin" &&
    id !== auth.ctx.userId
  ) {
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("laboratory_id", auth.ctx.laboratoryId)
      .eq("role", "super_admin");

    if (!countError && (count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Cannot demote the only super administrator." },
        { status: 400 },
      );
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select("id, email, full_name, role, professional_credential")
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
    },
  });
}
