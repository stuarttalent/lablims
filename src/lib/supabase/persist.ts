import { getSupabaseClient } from "@/lib/supabase/client";

async function db() {
  const client = await getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured");
  return client;
}
import type { ProfileMaps } from "@/lib/supabase/mappers";
import type {
  Invoice,
  LabOrder,
  LabSettings,
  OrderTestLine,
  Patient,
} from "@/types";

export type SupabaseContext = {
  laboratoryId: string;
  profileMaps: ProfileMaps;
  /** patient app id -> uuid */
  patientUuid: Map<string, string>;
  /** order app id -> uuid */
  orderUuid: Map<string, string>;
};

function hasMissingColumn(error: unknown, column: string): boolean {
  const msg =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";
  const c = column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(c, "i").test(msg) && /(column|does not exist|schema cache)/i.test(msg);
}

async function resolvePatientUuid(
  ctx: SupabaseContext,
  appPatientId: string,
): Promise<string | null> {
  if (ctx.patientUuid.has(appPatientId)) return ctx.patientUuid.get(appPatientId)!;
  const supabase = await db();
  const { data } = await supabase
    .from("patients")
    .select("id")
    .eq("laboratory_id", ctx.laboratoryId)
    .or(`legacy_id.eq.${appPatientId},id.eq.${appPatientId}`)
    .maybeSingle();
  if (data?.id) {
    ctx.patientUuid.set(appPatientId, data.id);
    return data.id;
  }
  return null;
}

async function resolveOrderUuid(
  ctx: SupabaseContext,
  appOrderId: string,
): Promise<string | null> {
  if (ctx.orderUuid.has(appOrderId)) return ctx.orderUuid.get(appOrderId)!;
  const supabase = await db();
  const { data } = await supabase
    .from("lab_orders")
    .select("id")
    .eq("laboratory_id", ctx.laboratoryId)
    .or(`legacy_id.eq.${appOrderId},id.eq.${appOrderId}`)
    .maybeSingle();
  if (data?.id) {
    ctx.orderUuid.set(appOrderId, data.id);
    return data.id;
  }
  return null;
}

async function resolveDefaultBranchId(laboratoryId: string): Promise<string | null> {
  const supabase = await db();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profile_branch_memberships")
    .select("branch_id, lab_branches!inner(laboratory_id)")
    .eq("profile_id", user.id)
    .eq("lab_branches.laboratory_id", laboratoryId)
    .limit(1)
    .maybeSingle();
  return data?.branch_id ?? null;
}

function resolveProfileUuid(
  ctx: SupabaseContext,
  appProfileId: string | undefined,
): string | null {
  if (!appProfileId) return null;
  return ctx.profileMaps.uuidByLegacy.get(appProfileId) ?? appProfileId;
}

export async function persistPatientInsert(
  ctx: SupabaseContext,
  patient: Patient,
): Promise<void> {
  const supabase = await db();
  const defaultBranchId = await resolveDefaultBranchId(ctx.laboratoryId);
  const { data, error } = await supabase
    .from("patients")
    .insert({
      laboratory_id: ctx.laboratoryId,
      legacy_id: patient.id,
      full_name: patient.fullName,
      date_of_birth: patient.dateOfBirth,
      age: patient.age,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      referring_doctor: patient.referringDoctor,
      medical_aid: patient.medicalAid,
      branch_id: patient.branchId ?? defaultBranchId,
      clinical_symptoms: patient.clinicalSymptoms ?? null,
      clinical_history: patient.clinicalHistory ?? null,
    })
    .select("id")
    .single();
  if (error) {
    if (!hasMissingColumn(error, "branch_id")) throw error;
    const fallback = await supabase
      .from("patients")
      .insert({
        laboratory_id: ctx.laboratoryId,
        legacy_id: patient.id,
        full_name: patient.fullName,
        date_of_birth: patient.dateOfBirth,
        age: patient.age,
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        referring_doctor: patient.referringDoctor,
        medical_aid: patient.medicalAid,
        clinical_symptoms: patient.clinicalSymptoms ?? null,
        clinical_history: patient.clinicalHistory ?? null,
      })
      .select("id")
      .single();
    if (fallback.error) throw fallback.error;
    ctx.patientUuid.set(patient.id, fallback.data.id);
    return;
  }
  ctx.patientUuid.set(patient.id, data.id);
}

export async function persistPatientUpdate(
  ctx: SupabaseContext,
  id: string,
  patch: Partial<Patient>,
): Promise<void> {
  const uuid = await resolvePatientUuid(ctx, id);
  if (!uuid) return;
  const supabase = await db();
  const row: Record<string, unknown> = {};
  if (patch.fullName != null) row.full_name = patch.fullName;
  if (patch.dateOfBirth != null) row.date_of_birth = patch.dateOfBirth;
  if (patch.age != null) row.age = patch.age;
  if (patch.gender != null) row.gender = patch.gender;
  if (patch.phone != null) row.phone = patch.phone;
  if (patch.email != null) row.email = patch.email;
  if (patch.address != null) row.address = patch.address;
  if (patch.referringDoctor != null) row.referring_doctor = patch.referringDoctor;
  if (patch.medicalAid != null) row.medical_aid = patch.medicalAid;
  if (patch.branchId !== undefined) row.branch_id = patch.branchId ?? null;
  if (patch.clinicalSymptoms !== undefined)
    row.clinical_symptoms = patch.clinicalSymptoms ?? null;
  if (patch.clinicalHistory !== undefined)
    row.clinical_history = patch.clinicalHistory ?? null;
  const { error } = await supabase.from("patients").update(row).eq("id", uuid);
  if (error) {
    if (!hasMissingColumn(error, "branch_id")) throw error;
    delete row.branch_id;
    const { error: fallbackError } = await supabase
      .from("patients")
      .update(row)
      .eq("id", uuid);
    if (fallbackError) throw fallbackError;
  }
}

export async function persistOrderInsert(
  ctx: SupabaseContext,
  order: LabOrder,
): Promise<void> {
  const patientUuid = await resolvePatientUuid(ctx, order.patientId);
  if (!patientUuid) throw new Error("Patient not found for order.");

  const supabase = await db();
  const defaultBranchId = await resolveDefaultBranchId(ctx.laboratoryId);
  const { data, error } = await supabase
    .from("lab_orders")
    .insert({
      laboratory_id: ctx.laboratoryId,
      legacy_id: order.id,
      patient_id: patientUuid,
      sample_type: order.sampleType,
      priority: order.priority,
      requesting_doctor: order.requestingDoctor,
      collection_date: order.collectionDate,
      status: order.status,
      notes: order.notes ?? null,
      clinical_symptoms: order.clinicalSymptoms ?? null,
      ai_generated_comment: order.aiGeneratedComment ?? null,
      ai_clinical_guidance: order.aiClinicalGuidance ?? null,
      include_ai_comment_in_report: order.includeAiCommentInReport ?? false,
      assigned_tech_id: resolveProfileUuid(ctx, order.assignedTechId),
      assigned_scientist_id: resolveProfileUuid(ctx, order.assignedScientistId),
      branch_id: order.branchId ?? defaultBranchId,
    })
    .select("id")
    .single();
  if (error) {
    if (!hasMissingColumn(error, "branch_id")) throw error;
    const fallback = await supabase
      .from("lab_orders")
      .insert({
        laboratory_id: ctx.laboratoryId,
        legacy_id: order.id,
        patient_id: patientUuid,
        sample_type: order.sampleType,
        priority: order.priority,
        requesting_doctor: order.requestingDoctor,
        collection_date: order.collectionDate,
        status: order.status,
        notes: order.notes ?? null,
        clinical_symptoms: order.clinicalSymptoms ?? null,
        ai_generated_comment: order.aiGeneratedComment ?? null,
        ai_clinical_guidance: order.aiClinicalGuidance ?? null,
        include_ai_comment_in_report: order.includeAiCommentInReport ?? false,
        assigned_tech_id: resolveProfileUuid(ctx, order.assignedTechId),
        assigned_scientist_id: resolveProfileUuid(ctx, order.assignedScientistId),
      })
      .select("id")
      .single();
    if (fallback.error) throw fallback.error;
    ctx.orderUuid.set(order.id, fallback.data.id);
    if (order.tests.length > 0) {
      const { error: lineErr } = await supabase.from("order_test_lines").insert(
        order.tests.map((t, i) => lineRow(ctx, fallback.data.id, t, i)),
      );
      if (lineErr) throw lineErr;
    }
    return;
  }
  ctx.orderUuid.set(order.id, data.id);

  if (order.tests.length > 0) {
    const { error: lineErr } = await supabase.from("order_test_lines").insert(
      order.tests.map((t, i) => lineRow(ctx, data.id, t, i)),
    );
    if (lineErr) throw lineErr;
  }
}

function lineRow(
  ctx: SupabaseContext,
  orderUuid: string,
  line: OrderTestLine,
  sortOrder: number,
) {
  return {
    order_id: orderUuid,
    laboratory_id: ctx.laboratoryId,
    test_id: line.testId,
    result_value: line.resultValue ?? null,
    units: line.units ?? null,
    reference_range: line.referenceRange ?? null,
    flag: line.flag ?? null,
    comment: line.comment ?? null,
    entered_by_name: line.enteredBy ?? null,
    entered_by_credential: line.enteredByCredential ?? null,
    verified_by_name: line.verifiedBy ?? null,
    verified_by_credential: line.verifiedByCredential ?? null,
    verification_date: line.verificationDate ?? null,
    result_status: line.resultStatus ?? null,
    amendments: line.amendments ?? [],
    sort_order: sortOrder,
  };
}

export async function persistOrderUpdate(
  ctx: SupabaseContext,
  id: string,
  patch: Partial<LabOrder>,
): Promise<void> {
  const uuid = await resolveOrderUuid(ctx, id);
  if (!uuid) return;
  const supabase = await db();
  const row: Record<string, unknown> = {};
  if (patch.sampleType != null) row.sample_type = patch.sampleType;
  if (patch.priority != null) row.priority = patch.priority;
  if (patch.requestingDoctor != null) row.requesting_doctor = patch.requestingDoctor;
  if (patch.collectionDate != null) row.collection_date = patch.collectionDate;
  if (patch.status != null) row.status = patch.status;
  if (patch.notes !== undefined) row.notes = patch.notes ?? null;
  if (patch.clinicalSymptoms !== undefined)
    row.clinical_symptoms = patch.clinicalSymptoms ?? null;
  if (patch.aiGeneratedComment !== undefined)
    row.ai_generated_comment = patch.aiGeneratedComment ?? null;
  if (patch.aiClinicalGuidance !== undefined)
    row.ai_clinical_guidance = patch.aiClinicalGuidance ?? null;
  if (patch.includeAiCommentInReport != null)
    row.include_ai_comment_in_report = patch.includeAiCommentInReport;
  if (patch.assignedTechId !== undefined)
    row.assigned_tech_id = resolveProfileUuid(ctx, patch.assignedTechId);
  if (patch.assignedScientistId !== undefined)
    row.assigned_scientist_id = resolveProfileUuid(ctx, patch.assignedScientistId);
  if (patch.branchId !== undefined) row.branch_id = patch.branchId ?? null;
  if (Object.keys(row).length > 0) {
    const { error } = await supabase.from("lab_orders").update(row).eq("id", uuid);
    if (error) {
      if (!hasMissingColumn(error, "branch_id")) throw error;
      delete row.branch_id;
      const { error: fallbackError } = await supabase
        .from("lab_orders")
        .update(row)
        .eq("id", uuid);
      if (fallbackError) throw fallbackError;
    }
  }
  if (patch.tests) {
    await supabase.from("order_test_lines").delete().eq("order_id", uuid);
    if (patch.tests.length > 0) {
      const { error: lineErr } = await supabase.from("order_test_lines").insert(
        patch.tests.map((t, i) => lineRow(ctx, uuid, t, i)),
      );
      if (lineErr) throw lineErr;
    }
  }
}

export async function persistOrderLineUpdate(
  ctx: SupabaseContext,
  orderId: string,
  testId: string,
  patch: Partial<OrderTestLine>,
): Promise<void> {
  const orderUuid = await resolveOrderUuid(ctx, orderId);
  if (!orderUuid) return;
  const supabase = await db();
  const row: Record<string, unknown> = {};
  if (patch.resultValue !== undefined) row.result_value = patch.resultValue ?? null;
  if (patch.units !== undefined) row.units = patch.units ?? null;
  if (patch.referenceRange !== undefined)
    row.reference_range = patch.referenceRange ?? null;
  if (patch.flag !== undefined) row.flag = patch.flag ?? null;
  if (patch.comment !== undefined) row.comment = patch.comment ?? null;
  if (patch.enteredBy !== undefined) row.entered_by_name = patch.enteredBy ?? null;
  if (patch.enteredByCredential !== undefined)
    row.entered_by_credential = patch.enteredByCredential ?? null;
  if (patch.verifiedBy !== undefined) row.verified_by_name = patch.verifiedBy ?? null;
  if (patch.verifiedByCredential !== undefined)
    row.verified_by_credential = patch.verifiedByCredential ?? null;
  if (patch.verificationDate !== undefined)
    row.verification_date = patch.verificationDate ?? null;
  if (patch.resultStatus !== undefined) row.result_status = patch.resultStatus ?? null;
  if (patch.amendments !== undefined) row.amendments = patch.amendments;

  const { data: existing } = await supabase
    .from("order_test_lines")
    .select("id")
    .eq("order_id", orderUuid)
    .eq("test_id", testId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("order_test_lines")
      .update(row)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const merged: OrderTestLine = { testId, ...patch };
    const { error } = await supabase
      .from("order_test_lines")
      .insert(lineRow(ctx, orderUuid, merged, 0));
    if (error) throw error;
  }
}

export async function persistInvoiceInsert(
  ctx: SupabaseContext,
  invoice: Invoice,
): Promise<void> {
  const patientUuid = await resolvePatientUuid(ctx, invoice.patientId);
  if (!patientUuid) throw new Error("Patient not found for invoice.");
  const orderUuid = invoice.orderId
    ? await resolveOrderUuid(ctx, invoice.orderId)
    : null;

  const supabase = await db();
  const defaultBranchId = await resolveDefaultBranchId(ctx.laboratoryId);
  const { error } = await supabase.from("invoices").insert({
    laboratory_id: ctx.laboratoryId,
    legacy_id: invoice.id,
    invoice_number: invoice.invoiceNumber,
    patient_id: patientUuid,
    order_id: orderUuid,
    test_ids: invoice.testIds,
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    tax: invoice.tax,
    total: invoice.total,
    branch_id: invoice.branchId ?? defaultBranchId,
    currency_code: invoice.currency,
    payment_method: invoice.paymentMethod ?? null,
    payment_status: invoice.paymentStatus,
    receipt_number: invoice.receiptNumber ?? null,
    medical_aid_details: invoice.medicalAidDetails ?? null,
  });
  if (error) {
    const missingBranch = hasMissingColumn(error, "branch_id");
    const missingCurrency = hasMissingColumn(error, "currency_code");
    if (!missingBranch && !missingCurrency) throw error;
    const fallbackRow: Record<string, unknown> = {
      laboratory_id: ctx.laboratoryId,
      legacy_id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      patient_id: patientUuid,
      order_id: orderUuid,
      test_ids: invoice.testIds,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      tax: invoice.tax,
      total: invoice.total,
      payment_method: invoice.paymentMethod ?? null,
      payment_status: invoice.paymentStatus,
      receipt_number: invoice.receiptNumber ?? null,
      medical_aid_details: invoice.medicalAidDetails ?? null,
    };
    if (!missingBranch) fallbackRow.branch_id = invoice.branchId ?? defaultBranchId;
    if (!missingCurrency) fallbackRow.currency_code = invoice.currency;
    const { error: fallbackError } = await supabase.from("invoices").insert(fallbackRow);
    if (fallbackError) throw fallbackError;
  }
}

export async function persistInvoiceUpdate(
  ctx: SupabaseContext,
  id: string,
  patch: Partial<Invoice>,
): Promise<void> {
  const supabase = await db();
  const { data } = await supabase
    .from("invoices")
    .select("id")
    .eq("laboratory_id", ctx.laboratoryId)
    .or(`legacy_id.eq.${id},id.eq.${id}`)
    .maybeSingle();
  if (!data?.id) return;

  const row: Record<string, unknown> = {};
  if (patch.paymentStatus != null) row.payment_status = patch.paymentStatus;
  if (patch.paymentMethod !== undefined) row.payment_method = patch.paymentMethod ?? null;
  if (patch.receiptNumber !== undefined) row.receipt_number = patch.receiptNumber ?? null;
  if (patch.discount != null) row.discount = patch.discount;
  if (patch.tax != null) row.tax = patch.tax;
  if (patch.subtotal != null) row.subtotal = patch.subtotal;
  if (patch.total != null) row.total = patch.total;
  if (patch.branchId !== undefined) row.branch_id = patch.branchId ?? null;
  if (patch.currency != null) row.currency_code = patch.currency;
  if (patch.medicalAidDetails !== undefined)
    row.medical_aid_details = patch.medicalAidDetails ?? null;
  const { error } = await supabase.from("invoices").update(row).eq("id", data.id);
  if (error) {
    const missingBranch = hasMissingColumn(error, "branch_id");
    const missingCurrency = hasMissingColumn(error, "currency_code");
    if (!missingBranch && !missingCurrency) throw error;
    if (missingBranch) delete row.branch_id;
    if (missingCurrency) delete row.currency_code;
    const { error: fallbackError } = await supabase
      .from("invoices")
      .update(row)
      .eq("id", data.id);
    if (fallbackError) throw fallbackError;
  }
}

export async function persistSettingsUpdate(
  laboratoryId: string,
  patch: Partial<LabSettings>,
): Promise<void> {
  const supabase = await db();
  const row: Record<string, unknown> = {};
  if (patch.labName != null) row.lab_name = patch.labName;
  if (patch.tagline != null) row.tagline = patch.tagline;
  if (patch.address != null) row.address = patch.address;
  if (patch.phone != null) row.phone = patch.phone;
  if (patch.email != null) row.email = patch.email;
  if (patch.registrationNumber != null) row.registration_number = patch.registrationNumber;
  if (patch.reportFooter != null) row.report_footer = patch.reportFooter;
  if (patch.departments != null) row.departments = patch.departments;
  if (patch.fhirBaseUrl !== undefined) row.fhir_base_url = patch.fhirBaseUrl ?? null;
  if (patch.fhirOrganizationId !== undefined)
    row.fhir_organization_id = patch.fhirOrganizationId ?? null;
  if (patch.limsInstanceId != null) row.lims_instance_id = patch.limsInstanceId;
  if (patch.logoDataUrl !== undefined) row.logo_data_url = patch.logoDataUrl ?? null;
  if (patch.letterheadA4PdfDataUrl !== undefined)
    row.letterhead_a4_pdf_data_url = patch.letterheadA4PdfDataUrl ?? null;
  if (patch.resultSlipTemplateMode !== undefined)
    row.result_slip_template_mode = patch.resultSlipTemplateMode ?? "profile";
  if (patch.priceOverrides != null) row.price_overrides = patch.priceOverrides;
  if (patch.catalogueOverrides != null)
    row.catalogue_overrides = patch.catalogueOverrides;
  const { error } = await supabase
    .from("lab_settings")
    .update(row)
    .eq("laboratory_id", laboratoryId);
  if (error) throw error;
}

export function buildSupabaseContext(
  laboratoryId: string,
  profileMaps: ProfileMaps,
  _store?: { patients: Patient[]; orders: LabOrder[] },
): SupabaseContext {
  const patientUuid = new Map<string, string>();
  const orderUuid = new Map<string, string>();
  return { laboratoryId, profileMaps, patientUuid, orderUuid };
}

/** After load, register uuid mappings from fetched rows (optional enhancement). */
export function registerStoreUuids(
  ctx: SupabaseContext,
  raw: {
    patients: { id: string; legacy_id: string | null }[];
    orders: { id: string; legacy_id: string | null }[];
  },
) {
  for (const p of raw.patients) {
    const appPatientId = p.legacy_id?.trim() || p.id;
    ctx.patientUuid.set(appPatientId, p.id);
  }
  for (const o of raw.orders) {
    const appOrderId = o.legacy_id?.trim() || o.id;
    ctx.orderUuid.set(appOrderId, o.id);
  }
}
