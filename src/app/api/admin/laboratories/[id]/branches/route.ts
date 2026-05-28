import { requireSuperAdmin } from "@/lib/admin/require-super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
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

  const { id: laboratoryId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { name?: string; code?: string; address?: string }
    | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Branch name is required." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("lab_branches")
    .insert({
      laboratory_id: laboratoryId,
      name,
      code: body?.code?.trim() || null,
      address: body?.address?.trim() || null,
    })
    .select("id, laboratory_id, name, code, address, active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ branch: data });
}
