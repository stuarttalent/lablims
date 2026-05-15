import { requireLabAdmin } from "@/lib/admin/require-lab-admin";
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

export async function GET() {
  const auth = await requireLabAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, professional_credential, created_at")
    .eq("laboratory_id", auth.ctx.laboratoryId)
    .order("full_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    users: (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      professionalCredential: row.professional_credential ?? undefined,
      createdAt: row.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
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

  const normalizedEmail = email.trim().toLowerCase();

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
      laboratory_id: auth.ctx.laboratoryId,
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
