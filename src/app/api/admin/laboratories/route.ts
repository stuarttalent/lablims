import { requireLabAdmin } from "@/lib/admin/require-lab-admin";
import { requireSuperAdmin } from "@/lib/admin/require-super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireLabAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is required on the server." },
      { status: 503 },
    );
  }

  const [{ data: labs, error: labsError }, { data: branches, error: branchesError }] =
    await Promise.all([
      admin.from("laboratories").select("id, slug, name").order("name"),
      admin
        .from("lab_branches")
        .select("id, laboratory_id, name, code, address, active")
        .order("name"),
    ]);

  if (labsError || branchesError) {
    return NextResponse.json(
      { error: labsError?.message ?? branchesError?.message ?? "Could not load laboratories." },
      { status: 500 },
    );
  }

  const { data: managers, error: managerError } = await admin
    .from("profiles")
    .select("id, laboratory_id, full_name, email")
    .eq("role", "lab_manager");
  if (managerError) {
    return NextResponse.json({ error: managerError.message }, { status: 500 });
  }

  const filteredLabs =
    auth.ctx.role === "super_admin"
      ? labs ?? []
      : (labs ?? []).filter((lab) => lab.id === auth.ctx.laboratoryId);

  return NextResponse.json({
    laboratories: filteredLabs.map((lab) => ({
      id: lab.id,
      slug: lab.slug,
      name: lab.name,
      branches: (branches ?? []).filter((b) => b.laboratory_id === lab.id),
      managers: (managers ?? []).filter((m) => m.laboratory_id === lab.id),
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
      { error: "SUPABASE_SERVICE_ROLE_KEY is required on the server." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: string; slug?: string }
    | null;
  const name = body?.name?.trim();
  const slug = body?.slug?.trim().toLowerCase();
  if (!name) {
    return NextResponse.json({ error: "Laboratory name is required." }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ error: "Laboratory slug is required." }, { status: 400 });
  }

  const { data: lab, error } = await admin
    .from("laboratories")
    .insert({ name, slug })
    .select("id, slug, name")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: settingsError } = await admin.from("lab_settings").insert({
    laboratory_id: lab.id,
    lab_name: name,
    tagline: "",
    address: "",
    phone: "",
    email: "",
    registration_number: "",
    report_footer: "",
  });
  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  return NextResponse.json({ laboratory: lab });
}
