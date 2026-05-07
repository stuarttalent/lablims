import type { LabOrder, OrderTestLine } from "@/types";

/** Rule-driven checklist before authorizing a single analyte line. */
export function computePreAuthIssues(order: LabOrder, line: OrderTestLine): string[] {
  const issues: string[] = [];

  if (!line.resultValue?.trim()) issues.push("Result value is empty.");
  if (!line.referenceRange?.trim()) issues.push("Reference range is missing.");
  if (!line.units?.trim()) issues.push("Units are missing.");
  if (line.flag && line.flag !== "Normal" && !line.comment?.trim()) {
    issues.push("Abnormal or flagged result has no comment.");
  }

  const siblings = order.tests.filter((l) => l.testId !== line.testId);
  const stillDraft = siblings.filter(
    (l) => l.resultStatus === "Draft" || !l.resultStatus,
  );
  if (stillDraft.length > 0) {
    const names = stillDraft.map((l) => l.testId).join(", ");
    issues.push(
      `Other analyte(s) on this order are still draft (${names}) — confirm partial authorization is intended.`,
    );
  }

  const pendingAuth = siblings.filter(
    (l) => l.resultStatus === "Pending Verification",
  );
  if (pendingAuth.length > 0) {
    issues.push(
      `${pendingAuth.length} other analyte(s) still await authorization on this accession.`,
    );
  }

  return issues;
}

export function heuristicPreAuthSummary(issues: string[]): string {
  if (issues.length === 0) {
    return "Rule check: no blocking items flagged for this authorization step.";
  }
  return `Rule check (${issues.length} item(s)): ${issues.join(" ")}`;
}
