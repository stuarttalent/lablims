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

function canRoleCreateUsers(role: UserRole): boolean {
  return role === "super_admin" || role === "admin" || role === "lab_manager";
}

function canAssignRole(actorRole: UserRole, requestedRole: UserRole): boolean {
  if (actorRole === "super_admin") return true;
  return requestedRole !== "super_admin";
}

export async function GET() {
  const auth = await requireLabAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, professional_credential, created_at, suspended_at, laboratory_id, branch_id, laboratories(name), lab_branches(name)",
    )
    .order("full_name");
  if (auth.ctx.role !== "super_admin") {
    query = query.eq("laboratory_id", auth.ctx.laboratoryId);
  }
  const { data, error } = await query;
  const { data: memberships, error: membershipError } = await supabase
    .from("profile_branch_memberships")
    .select("profile_id, branch_id");

  if (error || membershipError) {
    return NextResponse.json(
      { error: error?.message ?? membershipError?.message ?? "Could not load users." },
      { status: 500 },
    );
  }
  const branchIdsByProfile = new Map<string, string[]>();
  for (const m of memberships ?? []) {
    branchIdsByProfile.set(m.profile_id, [
      ...(branchIdsByProfile.get(m.profile_id) ?? []),
      m.branch_id,
    ]);
  }

  return NextResponse.json({
    users: (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      laboratoryId: row.laboratory_id,
      laboratoryName:
        row.laboratories && typeof row.laboratories === "object"
          ? (row.laboratories as { name?: string }).name
          : undefined,
      branchId: row.branch_id ?? undefined,
      branchName:
        row.lab_branches && typeof row.lab_branches === "object"
          ? (row.lab_branches as { name?: string }).name
          : undefined,
      assignedBranchIds: branchIdsByProfile.get(row.id) ?? [],
      suspendedAt: row.suspended_at ?? undefined,
      professionalCredential: row.professional_credential ?? undefined,
      createdAt: row.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: actor, error: actorError } = await supabase
    .from("profiles")
    .select("id, role, laboratory_id")
    .eq("id", user.id)
    .maybeSingle();
  if (actorError || !actor?.laboratory_id) {
    return NextResponse.json({ error: "Staff profile not found." }, { status: 403 });
  }
  const actorRole = actor.role as UserRole;
  if (!canRoleCreateUsers(actorRole)) {
    return NextResponse.json({ error: "You are not allowed to create users." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "User creation requires SUPABASE_SERVICE_ROLE_KEY on the server. Add it to .env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const {
    email,
    password,
    fullName,
    role,
    professionalCredential,
    laboratoryId,
    branchId,
  } = body as Record<string, unknown>;

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 },
    );
  }
  if (typeof fullName !== "string" || !fullName.trim()) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }
  if (typeof role !== "string" || !isUserRole(role)) {
    return NextResponse.json({ error: "A valid role is required." }, { status: 400 });
  }
  if (!canAssignRole(actorRole, role)) {
    return NextResponse.json({ error: "You cannot assign this role." }, { status: 403 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const targetLaboratoryId =
    actorRole === "super_admin" &&
    typeof laboratoryId === "string" &&
    laboratoryId.trim()
      ? laboratoryId.trim()
      : actor.laboratory_id;
  if (actorRole !== "super_admin" && targetLaboratoryId !== actor.laboratory_id) {
    return NextResponse.json(
      { error: "You can only create users in your assigned laboratory." },
      { status: 403 },
    );
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName.trim(),
      role,
    },
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  if (!created.user) {
    return NextResponse.json({ error: "User was not created." }, { status: 500 });
  }

  const credential =
    typeof professionalCredential === "string"
      ? professionalCredential.trim()
      : "";

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      laboratory_id: targetLaboratoryId,
      branch_id: typeof branchId === "string" && branchId.trim() ? branchId.trim() : null,
      email: normalizedEmail,
      full_name: fullName.trim(),
      role,
      professional_credential: credential || null,
    })
    .eq("id", created.user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    user: {
      id: created.user.id,
      email: normalizedEmail,
      fullName: fullName.trim(),
      role,
      professionalCredential: credential || undefined,
    },
  });
}
