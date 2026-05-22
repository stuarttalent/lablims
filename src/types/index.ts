import type { ClinicalGuidance } from "@/lib/ai/clinical-guidance-types";

export type UserRole =
  | "super_admin"
  | "admin"
  | "scientist"
  | "tech"
  | "biller"
  | "doctor";

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Shown on result slips (e.g. qualifications, registration id). */
  professionalCredential?: string;
}

export type TestDepartment =
  | "Haematology"
  | "Chemistry"
  | "Microbiology"
  | "Serology/Immunology"
  | "Molecular";

export interface CatalogueTest {
  id: string;
  name: string;
  /** LOINC code when applicable (laboratory orders/results coding). */
  loincCode?: string;
  department: TestDepartment;
  sampleType: string;
  turnaroundTime: string;
  price: number;
  referenceRange?: string;
  units?: string;
  /**
   * When true, hidden from the default new-order and invoice pickers —
   * add these lines via a panel template instead.
   */
  panelAnalyte?: boolean;
}

/** Gender scope for reference-interval bands (patient gender is normalized to these). */
export type CatalogueGenderScope = "all" | "male" | "female" | "other";

/** One age/gender band for a reference interval (first matching band wins). */
export interface ReferenceRangeBand {
  minAgeYears?: number;
  maxAgeYears?: number;
  genders: CatalogueGenderScope[];
  rangeText: string;
}

/** Auto-suggest line comments when result matches flag and/or value substring. */
export interface ResultCommentRule {
  id: string;
  flag?: ResultFlag;
  valueContains?: string;
  comment: string;
}

/** Stored per test id in settings — extends catalogue without editing code. */
export interface CatalogueTestOverride {
  referenceBands?: ReferenceRangeBand[];
  defaultCommentRules?: ResultCommentRule[];
}

export interface Patient {
  id: string;
  fullName: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  referringDoctor: string;
  medicalAid: string;
  /** Symptoms, indication for testing, presenting complaints. */
  clinicalSymptoms?: string;
  /** Past medical history, allergies, chronic conditions (free text). */
  clinicalHistory?: string;
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
}

export type OrderPriority = "Routine" | "Urgent" | "STAT";
export type OrderStatus =
  | "Requested"
  | "Sample Collected"
  | "In Progress"
  | "Pending Verification"
  | "Verified"
  | "Released";

export type ResultFlag = "Normal" | "Low" | "High" | "Critical";
export type LineResultStatus =
  | "Draft"
  | "Pending Verification"
  | "Verified"
  | "Released";

export interface OrderTestLine {
  testId: string;
  resultValue?: string;
  units?: string;
  referenceRange?: string;
  flag?: ResultFlag;
  comment?: string;
  enteredBy?: string;
  /** Qualifications / registration shown on the result slip. */
  enteredByCredential?: string;
  /** Authorized signatory (laboratory authorizer). */
  verifiedBy?: string;
  /** Qualifications / registration for authorizer, shown on slip. */
  verifiedByCredential?: string;
  verificationDate?: string;
  resultStatus?: LineResultStatus;
}

export interface LabOrder {
  id: string;
  patientId: string;
  sampleType: string;
  priority: OrderPriority;
  requestingDoctor: string;
  collectionDate: string;
  status: OrderStatus;
  notes?: string;
  /** Clinical narrative for this encounter — used in AI summary and audit context. */
  clinicalSymptoms?: string;
  /** Last model-generated narrative (user chooses whether it appears on slip). */
  aiGeneratedComment?: string;
  /** Structured EDLIZ-informed guidance (tests, considerations, references). */
  aiClinicalGuidance?: ClinicalGuidance;
  /** When true, slip and PDF include `aiGeneratedComment` in the report. */
  includeAiCommentInReport?: boolean;
  assignedTechId?: string;
  assignedScientistId?: string;
  createdAt: string;
  tests: OrderTestLine[];
}

export type PaymentMethod =
  | "Cash"
  | "EcoCash"
  | "Swipe"
  | "Bank Transfer"
  | "Medical Aid";

export type PaymentStatus = "Paid" | "Partially Paid" | "Unpaid";

/** Captured on invoice when billing to a medical aid scheme. */
export interface MedicalAidDetails {
  society: string;
  plan: string;
  memberNumber: string;
  principalMember: string;
  principalSameAsPatient: boolean;
  /** Dependent suffix on the membership (e.g. 00 principal, 01 spouse). */
  suffix: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  orderId?: string;
  testIds: string[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  receiptNumber?: string;
  medicalAidDetails?: MedicalAidDetails;
  createdAt: string;
}

export interface LabSettings {
  labName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  registrationNumber: string;
  reportFooter: string;
  /** testId -> price override */
  priceOverrides: Record<string, number>;
  departments: string[];
  /** Base URL for FHIR NamingSystem and idempotency in exports. */
  fhirBaseUrl?: string;
  /** Logical id for Organization resource in FHIR exports. */
  fhirOrganizationId?: string;
  /** Unique per browser / deployment; used for report QR verification. */
  limsInstanceId?: string;
  /** Optional logo for reports (data URL, e.g. PNG). */
  logoDataUrl?: string;
  /** Per-test rules: age/gender reference bands & default comment templates. */
  catalogueOverrides: Record<string, CatalogueTestOverride>;
}

export interface DemoStore {
  patients: Patient[];
  doctors: Doctor[];
  orders: LabOrder[];
  invoices: Invoice[];
  settings: LabSettings;
  version: number;
}
