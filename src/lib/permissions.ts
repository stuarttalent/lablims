import type { UserRole } from "@/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  scientist: "Lab Scientist",
  tech: "Lab Technician",
  biller: "Biller",
  doctor: "Doctor",
};

export function canAccessRoute(role: UserRole, path: string): boolean {
  const p = path.split("?")[0] ?? path;

  if (p.startsWith("/settings") || p.startsWith("/users")) {
    return role === "admin";
  }
  if (p.startsWith("/billing")) {
    return role === "admin" || role === "biller";
  }
  if (p.startsWith("/reports")) {
    return role === "admin" || role === "scientist" || role === "biller";
  }
  return true;
}

export function canCreatePatient(role: UserRole): boolean {
  return role === "admin" || role === "doctor" || role === "biller";
}

export function canEditPatient(role: UserRole): boolean {
  return role === "admin" || role === "doctor";
}

export function canCreateOrder(role: UserRole): boolean {
  return role === "admin" || role === "doctor";
}

export function canAssignOrder(role: UserRole): boolean {
  return role === "admin" || role === "scientist";
}

export function canChangeOrderStatus(role: UserRole): boolean {
  return role === "admin" || role === "scientist" || role === "tech";
}

export function canEnterResults(role: UserRole): boolean {
  return role === "admin" || role === "tech" || role === "scientist";
}

export function canVerifyResults(role: UserRole): boolean {
  return role === "admin" || role === "scientist";
}

export function canReleaseResults(role: UserRole): boolean {
  return role === "admin" || role === "scientist";
}

export function canManageBilling(role: UserRole): boolean {
  return role === "admin" || role === "biller";
}

export function canViewPatients(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "scientist" ||
    role === "tech" ||
    role === "doctor" ||
    role === "biller"
  );
}

export function canEditCataloguePricing(role: UserRole): boolean {
  return role === "admin";
}
