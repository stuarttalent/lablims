import type { UserRole } from "@/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super administrator",
  lab_manager: "Lab manager",
  admin: "Administrator",
  scientist: "Lab scientist",
  tech: "Lab technician",
  biller: "Biller",
  doctor: "Doctor",
};

/** Full organization configuration: catalogue, users, pricing, integrations. */
export function hasAdminPrivileges(role: UserRole): boolean {
  return role === "admin" || role === "super_admin" || role === "lab_manager";
}

/** Create staff accounts and assign roles. */
export function canManageUsers(role: UserRole): boolean {
  return role === "super_admin" || role === "lab_manager";
}

export function canAccessRoute(role: UserRole, path: string): boolean {
  const p = path.split("?")[0] ?? path;

  if (p.startsWith("/catalogue") || p.startsWith("/users")) {
    return hasAdminPrivileges(role);
  }

  if (p.startsWith("/settings") || p.startsWith("/setup") || p.startsWith("/ticket-desk")) {
    return true;
  }

  if (p.startsWith("/security")) {
    return true;
  }

  if (p.startsWith("/send-receive") || p.startsWith("/interoperability")) {
    return hasAdminPrivileges(role) || role === "scientist";
  }

  if (p.startsWith("/documents")) {
    return (
      hasAdminPrivileges(role) ||
      role === "scientist" ||
      role === "doctor" ||
      role === "biller" ||
      role === "tech"
    );
  }

  if (p.startsWith("/maintenance") || p.startsWith("/quality")) {
    return hasAdminPrivileges(role) || role === "scientist" || role === "tech";
  }

  if (p.startsWith("/administration")) {
    return hasAdminPrivileges(role);
  }

  if (p.startsWith("/inventory")) {
    return hasAdminPrivileges(role) || role === "scientist" || role === "tech";
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

/** @see canAmendAuthorizedResults in @/lib/authorized-results */
export { canAmendAuthorizedResults, isAuthorizedResultLine } from "@/lib/authorized-results";
