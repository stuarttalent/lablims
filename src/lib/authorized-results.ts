import type { OrderTestLine, UserRole } from "@/types";

/** Result has been authorized (verified or released to requester). */
export function isAuthorizedResultLine(line: OrderTestLine): boolean {
  return line.resultStatus === "Verified" || line.resultStatus === "Released";
}

/** Laboratory scientist and higher ranks may amend authorized results. */
export function canAmendAuthorizedResults(role: UserRole): boolean {
  return role === "scientist" || role === "admin" || role === "super_admin";
}

export function authorizedEditPolicyMessage(role: UserRole): string {
  if (canAmendAuthorizedResults(role)) {
    return "Authorized results may be amended with a documented reason (audit trail).";
  }
  return "Authorized results cannot be changed. Ask a laboratory scientist or administrator to amend with a reason.";
}
