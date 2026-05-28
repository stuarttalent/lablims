import type { UserRole } from "@/types";

export type LabStaffMember = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  laboratoryId?: string;
  laboratoryName?: string;
  branchId?: string;
  branchName?: string;
  suspendedAt?: string;
  professionalCredential?: string;
  createdAt?: string;
};

export type CreateStaffInput = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  professionalCredential?: string;
};

export type UpdateStaffInput = {
  role?: UserRole;
  fullName?: string;
  professionalCredential?: string;
};

export const ASSIGNABLE_ROLES: UserRole[] = [
  "lab_manager",
  "admin",
  "scientist",
  "tech",
  "biller",
  "doctor",
];

/** Roles a super admin may assign (includes super_admin). */
export const SUPER_ADMIN_ASSIGNABLE_ROLES: UserRole[] = [
  "super_admin",
  ...ASSIGNABLE_ROLES,
];
