import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyResultToken } from "@/lib/verification-token";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { orderId: rawOrderId } = await context.params;
  const orderId = decodeURIComponent(rawOrderId ?? "").trim();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("v")?.trim() ?? "";
  const limsInstanceId = searchParams.get("lims")?.trim() ?? "";

  if (!orderId) {
    return NextResponse.json({ error: "Missing accession id." }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Verification service is not configured." },
      { status: 503 },
    );
  }

  type SettingsRow = {
    laboratory_id: string;
    lims_instance_id: string;
    lab_name: string;
    tagline: string;
    phone: string;
    email: string;
    registration_number: string;
  };

  let settings: SettingsRow | null = null;
  let orderRow: {
    id: string;
    legacy_id: string | null;
    status: string;
    collection_date: string;
    created_at: string;
    patient_id: string;
  } | null = null;

  if (limsInstanceId) {
    const { data, error: settingsError } = await admin
      .from("lab_settings")
      .select(
        "laboratory_id, lims_instance_id, lab_name, tagline, phone, email, registration_number",
      )
      .eq("lims_instance_id", limsInstanceId)
      .maybeSingle();

    if (settingsError) {
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }
    settings = data;

    if (settings) {
      const { data: order, error: orderError } = await admin
        .from("lab_orders")
        .select("id, legacy_id, status, collection_date, created_at, patient_id")
        .eq("laboratory_id", settings.laboratory_id)
        .or(`legacy_id.eq.${orderId},id.eq.${orderId}`)
        .maybeSingle();
      if (orderError) {
        return NextResponse.json({ error: orderError.message }, { status: 500 });
      }
      orderRow = order;
    }
  } else {
    const { data: order, error: orderError } = await admin
      .from("lab_orders")
      .select("id, legacy_id, status, collection_date, created_at, patient_id, laboratory_id")
      .or(`legacy_id.eq.${orderId},id.eq.${orderId}`)
      .maybeSingle();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }
    orderRow = order;

    if (order) {
      const { data, error: settingsError } = await admin
        .from("lab_settings")
        .select(
          "laboratory_id, lims_instance_id, lab_name, tagline, phone, email, registration_number",
        )
        .eq("laboratory_id", order.laboratory_id)
        .maybeSingle();
      if (settingsError) {
        return NextResponse.json({ error: settingsError.message }, { status: 500 });
      }
      settings = data;
    }
  }

  if (!settings) {
    return NextResponse.json(
      { error: "Laboratory not found for this verification link." },
      { status: 404 },
    );
  }

  const resolvedLimsId = settings.lims_instance_id;

  const lab = {
    labName: settings.lab_name,
    tagline: settings.tagline,
    phone: settings.phone,
    email: settings.email,
    registrationNumber: settings.registration_number,
  };

  if (!orderRow) {
    return NextResponse.json({
      lab,
      order: null,
    });
  }

  const createdAt = orderRow.created_at.slice(0, 16);
  const tokenValid = Boolean(
    token && verifyResultToken(orderId, createdAt, resolvedLimsId, token),
  );

  const [{ data: patient }, { data: lines }] = await Promise.all([
    admin
      .from("patients")
      .select("full_name")
      .eq("id", orderRow.patient_id)
      .maybeSingle(),
    admin
      .from("order_test_lines")
      .select("verified_by_name, verification_date, result_status")
      .eq("order_id", orderRow.id),
  ]);

  const verifiedBy =
    lines?.map((l) => l.verified_by_name).find((n) => n && n.trim()) ?? null;
  const verifiedOn =
    lines?.map((l) => l.verification_date).find((d) => d && String(d).trim()) ??
    null;
  const released =
    tokenValid &&
    (orderRow.status === "Released" ||
      (lines ?? []).some((l) => l.result_status === "Released"));

  return NextResponse.json({
    lab,
    order: {
      id: orderRow.legacy_id?.trim() || orderRow.id,
      status: orderRow.status,
      collectionDate: String(orderRow.collection_date).slice(0, 16),
      patientName: patient?.full_name ?? null,
      tokenValid,
      released,
      verifiedBy,
      verifiedOn,
    },
  });
}
