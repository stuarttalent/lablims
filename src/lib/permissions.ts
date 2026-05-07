import type { UserRole } from "@/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super administrator",
  admin: "Administrator",
  scientist: "Lab scientist",
  tech: "Lab technician",
  biller: "Biller",
  doctor: "Doctor",
};

/** Full organization configuration: catalogue, users, pricing, integrations. */
export function hasAdminPrivileges(role: UserRole): boolean {
  return role === "admin" || role === "super_admin";
}

export function canAccessRoute(role: UserRole, path: string): boolean {
  const p = path.split("?")[0] ?? path;

  if (p.startsWith("/catalogue") || p.startsWith("/users")) {
    return hasAdminPrivileges(role);
  }
  if (p.startsWith("/settings")) {
    return true;
  }
  if (p.startsWith("/billing")) {
    return hasAdminPrivileges(role) || role === "biller";
  }
  if (p.startsWith("/reports")) {
    return hasAdminPrivileges(role) || role === "scientist" || role === "biller";
  }
  return true;
}

export function canCreatePatient(role: UserRole): boolean {
  return hasAdminPrivileges(role) || role === "doctor" || role === "biller";
}

export function canEditPatient(role: UserRole): boolean {
  return hasAdminPrivileges(role) || role === "doctor";
}

export function canCreateOrder(role: UserRole): boolean {
  return hasAdminPrivileges(role) || role === "doctor";
}

export function canAssignOrder(role: UserRole): boolean {
  return hasAdminPrivileges(role) || role === "scientist";
}

export function canChangeOrderStatus(role: UserRole): boolean {
  return hasAdminPrivileges(role) || role === "scientist" || role === "tech";
}

export function canEnterResults(role: UserRole): boolean {
  return hasAdminPrivileges(role) || role === "tech" || role === "scientist";
}

export function canAuthorizeResults(role: UserRole): boolean {
  return hasAdminPrivileges(role) || role === "scientist";
}

/** @deprecated use canAuthorizeResults */
export const canVerifyResults = canAuthorizeResults;

export function canReleaseResults(role: UserRole): boolean {
  return hasAdminPrivileges(role) || role === "scientist";
}

export function canManageBilling(role: UserRole): boolean {
  return hasAdminPrivileges(role) || role === "biller";
}

export function canViewPatients(role: UserRole): boolean {
  return (
    hasAdminPrivileges(role) ||
    role === "scientist" ||
    role === "tech" ||
    role === "doctor" ||
    role === "biller"
  );
}

export function canEditCataloguePricing(role: UserRole): boolean {
  return hasAdminPrivileges(role);
}
