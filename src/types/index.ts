export type UserRole = "admin" | "scientist" | "tech" | "biller" | "doctor";

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
  department: TestDepartment;
  sampleType: string;
  turnaroundTime: string;
  price: number;
  referenceRange?: string;
  units?: string;
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
  verifiedBy?: string;
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
}

export interface DemoStore {
  patients: Patient[];
  doctors: Doctor[];
  orders: LabOrder[];
  invoices: Invoice[];
  settings: LabSettings;
  version: number;
}
