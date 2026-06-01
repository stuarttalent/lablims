import { DEMO_DOCTORS } from "@/data/seed";
import { createInitialStore } from "@/data/seed";
import type {
  DemoStore,
  Doctor,
  Invoice,
  LabOrder,
  LabSettings,
  MicrobiologyResult,
  MockUser,
  OrderTestLine,
  Patient,
  UserRole,
} from "@/types";

/** App-facing id: prefer legacy_id for compatibility with existing UI. */
export function appId(legacyId: string | null | undefined, uuid: string): string {
  return legacyId?.trim() || uuid;
}

export type ProfileMaps = {
  legacyByUuid: Map<string, string>;
  uuidByLegacy: Map<string, string>;
};

export function buildProfileMaps(
  rows: { id: string; legacy_id: string | null }[],
): ProfileMaps {
  const legacyByUuid = new Map<string, string>();
  const uuidByLegacy = new Map<string, string>();
  for (const row of rows) {
    if (row.legacy_id) {
      legacyByUuid.set(row.id, row.legacy_id);
      uuidByLegacy.set(row.legacy_id, row.id);
    }
  }
  return { legacyByUuid, uuidByLegacy };
}

export function profileToMockUser(row: {
  id: string;
  legacy_id: string | null;
  email: string;
  full_name: string;
  role: UserRole;
  professional_credential: string | null;
}): MockUser {
  return {
    id: appId(row.legacy_id, row.id),
    email: row.email,
    name: row.full_name,
    role: row.role,
    professionalCredential: row.professional_credential ?? undefined,
  };
}

export function mapPatient(row: {
  id: string;
  legacy_id: string | null;
  full_name: string;
  date_of_birth: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  referring_doctor: string;
  medical_aid: string;
  clinical_symptoms: string | null;
  clinical_history: string | null;
  branch_id: string | null;
  created_at: string;
}): Patient {
  return {
    id: appId(row.legacy_id, row.id),
    branchId: row.branch_id ?? undefined,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    age: row.age,
    gender: row.gender,
    phone: row.phone,
    email: row.email,
    address: row.address,
    referringDoctor: row.referring_doctor,
    medicalAid: row.medical_aid,
    clinicalSymptoms: row.clinical_symptoms ?? undefined,
    clinicalHistory: row.clinical_history ?? undefined,
    createdAt: row.created_at.slice(0, 10),
  };
}

export function mapDoctor(row: {
  id: string;
  legacy_id: string | null;
  name: string;
  specialty: string;
  branch_id: string | null;
}): Doctor {
  return {
    id: appId(row.legacy_id, row.id),
    branchId: row.branch_id ?? undefined,
    name: row.name,
    specialty: row.specialty,
  };
}

function mapProfileRef(
  uuid: string | null | undefined,
  maps: ProfileMaps,
): string | undefined {
  if (!uuid) return undefined;
  return maps.legacyByUuid.get(uuid) ?? uuid;
}

export function mapOrderLine(row: {
  test_id: string;
  result_value: string | null;
  units: string | null;
  reference_range: string | null;
  flag: OrderTestLine["flag"] | null;
  comment: string | null;
  microbiology_result?: unknown | null;
  entered_by_name: string | null;
  entered_by_credential: string | null;
  verified_by_name: string | null;
  verified_by_credential: string | null;
  verification_date: string | null;
  result_status: OrderTestLine["resultStatus"] | null;
  amendments: unknown;
}): OrderTestLine {
  const microbiologyResult =
    row.microbiology_result &&
    typeof row.microbiology_result === "object" &&
    !Array.isArray(row.microbiology_result)
      ? (row.microbiology_result as MicrobiologyResult)
      : undefined;

  return {
    testId: row.test_id,
    resultValue: row.result_value ?? undefined,
    units: row.units ?? undefined,
    referenceRange: row.reference_range ?? undefined,
    flag: row.flag ?? undefined,
    comment: row.comment ?? undefined,
    microbiologyResult,
    enteredBy: row.entered_by_name ?? undefined,
    enteredByCredential: row.entered_by_credential ?? undefined,
    verifiedBy: row.verified_by_name ?? undefined,
    verifiedByCredential: row.verified_by_credential ?? undefined,
    verificationDate: row.verification_date ?? undefined,
    resultStatus: row.result_status ?? undefined,
    amendments: Array.isArray(row.amendments)
      ? (row.amendments as OrderTestLine["amendments"])
      : undefined,
  };
}

export function mapOrder(
  row: {
    id: string;
    legacy_id: string | null;
    patient_id: string;
    sample_type: string;
    priority: LabOrder["priority"];
    requesting_doctor: string;
    collection_date: string;
    status: LabOrder["status"];
    notes: string | null;
    clinical_symptoms: string | null;
    ai_generated_comment: string | null;
    ai_clinical_guidance: unknown | null;
    include_ai_comment_in_report: boolean;
    assigned_tech_id: string | null;
    assigned_scientist_id: string | null;
    branch_id: string | null;
    created_at: string;
  },
  patientUuidToAppId: Map<string, string>,
  profileMaps: ProfileMaps,
  lines: OrderTestLine[],
): LabOrder {
  const patientAppId = patientUuidToAppId.get(row.patient_id) ?? row.patient_id;

  return {
    id: appId(row.legacy_id, row.id),
    branchId: row.branch_id ?? undefined,
    patientId: patientAppId,
    sampleType: row.sample_type,
    priority: row.priority,
    requestingDoctor: row.requesting_doctor,
    collectionDate: row.collection_date.slice(0, 16),
    status: row.status,
    notes: row.notes ?? undefined,
    clinicalSymptoms: row.clinical_symptoms ?? undefined,
    aiGeneratedComment: row.ai_generated_comment ?? undefined,
    aiClinicalGuidance:
      (row.ai_clinical_guidance as LabOrder["aiClinicalGuidance"]) ?? undefined,
    includeAiCommentInReport: row.include_ai_comment_in_report,
    assignedTechId: mapProfileRef(row.assigned_tech_id, profileMaps),
    assignedScientistId: mapProfileRef(row.assigned_scientist_id, profileMaps),
    createdAt: row.created_at.slice(0, 16),
    tests: lines,
  };
}

export function mapInvoice(
  row: {
    id: string;
    legacy_id: string | null;
    invoice_number: string;
    patient_id: string;
    order_id: string | null;
    test_ids: string[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    currency_code: "USD" | "ZWL" | null;
    branch_id: string | null;
    payment_method: Invoice["paymentMethod"] | null;
    payment_status: Invoice["paymentStatus"];
    receipt_number: string | null;
    medical_aid_details: unknown | null;
    created_at: string;
  },
  patientUuidToAppId: Map<string, string>,
  orderUuidToAppId: Map<string, string>,
): Invoice {
  const patientAppId = patientUuidToAppId.get(row.patient_id) ?? row.patient_id;
  const orderAppId = row.order_id
    ? (orderUuidToAppId.get(row.order_id) ?? row.order_id)
    : undefined;

  return {
    id: appId(row.legacy_id, row.id),
    branchId: row.branch_id ?? undefined,
    invoiceNumber: row.invoice_number,
    patientId: patientAppId,
    orderId: orderAppId,
    testIds: row.test_ids ?? [],
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    tax: Number(row.tax),
    total: Number(row.total),
    currency: row.currency_code ?? "USD",
    paymentMethod: row.payment_method ?? undefined,
    paymentStatus: row.payment_status,
    receiptNumber: row.receipt_number ?? undefined,
    medicalAidDetails:
      (row.medical_aid_details as Invoice["medicalAidDetails"]) ?? undefined,
    createdAt: row.created_at.slice(0, 10),
  };
}

export function mapSettings(
  row: {
    lab_name: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    registration_number: string;
    report_footer: string;
    departments: string[];
    fhir_base_url: string | null;
    fhir_organization_id: string | null;
    lims_instance_id: string;
    logo_data_url: string | null;
    letterhead_a4_pdf_data_url: string | null;
    price_overrides: Record<string, number>;
    catalogue_overrides: LabSettings["catalogueOverrides"];
    custom_tests?: LabSettings["customTests"] | null;
    store_version: number;
  } | null,
): LabSettings {
  const defaults = createInitialStore().settings;
  if (!row) return defaults;
  return {
    labName: row.lab_name,
    tagline: row.tagline,
    address: row.address,
    phone: row.phone,
    email: row.email,
    registrationNumber: row.registration_number,
    reportFooter: row.report_footer,
    departments: row.departments?.length ? row.departments : defaults.departments,
    fhirBaseUrl: row.fhir_base_url ?? undefined,
    fhirOrganizationId: row.fhir_organization_id ?? undefined,
    limsInstanceId: row.lims_instance_id,
    logoDataUrl: row.logo_data_url ?? undefined,
    letterheadA4PdfDataUrl: row.letterhead_a4_pdf_data_url ?? undefined,
    priceOverrides: row.price_overrides ?? {},
    catalogueOverrides: row.catalogue_overrides ?? {},
    customTests: Array.isArray(row.custom_tests) ? row.custom_tests : [],
  };
}

export function emptyStoreWithSettings(settings: LabSettings): DemoStore {
  return {
    patients: [],
    doctors: DEMO_DOCTORS,
    orders: [],
    invoices: [],
    settings,
    version: 1,
  };
}
