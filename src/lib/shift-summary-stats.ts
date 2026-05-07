import type { DemoStore } from "@/types";
import { getTestById } from "@/data/catalogue";
import {
  buildHeuristicWorklistPredictions,
  computeSchedulePunctuality,
} from "@/lib/worklist-eta";
import { isOrderTatComplete } from "@/lib/tat-predict";

export type ShiftSummaryStats = {
  incompleteOrders: number;
  statIncomplete: number;
  overdueVsEta: number;
  warningVsEta: number;
  onTrackVsEta: number;
  pendingVerificationLines: number;
  topDepartmentBacklog: { department: string; openLines: number }[];
};

export function buildShiftSummaryStats(store: DemoStore): ShiftSummaryStats {
  const incomplete = store.orders.filter((o) => !isOrderTatComplete(o.status));
  const statIncomplete = incomplete.filter((o) => o.priority === "STAT").length;

  const preds = buildHeuristicWorklistPredictions(incomplete);
  const predById = new Map(preds.map((p) => [p.orderId, p]));
  let overdueVsEta = 0;
  let warningVsEta = 0;
  let onTrackVsEta = 0;
  for (const o of incomplete) {
    const p = predById.get(o.id);
    if (!p) continue;
    const s = computeSchedulePunctuality(o.collectionDate, p.readyIso);
    if (s === "late") overdueVsEta++;
    else if (s === "warning") warningVsEta++;
    else onTrackVsEta++;
  }

  let pendingVerificationLines = 0;
  const deptLines = new Map<string, number>();
  for (const o of incomplete) {
    for (const t of o.tests) {
      if (t.resultStatus === "Released") continue;
      if (t.resultStatus === "Pending Verification") pendingVerificationLines++;
      const dep = getTestById(t.testId)?.department;
      if (dep) deptLines.set(dep, (deptLines.get(dep) ?? 0) + 1);
    }
  }

  const topDepartmentBacklog = [...deptLines.entries()]
    .map(([department, openLines]) => ({ department, openLines }))
    .sort((a, b) => b.openLines - a.openLines)
    .slice(0, 5);

  return {
    incompleteOrders: incomplete.length,
    statIncomplete,
    overdueVsEta,
    warningVsEta,
    onTrackVsEta,
    pendingVerificationLines,
    topDepartmentBacklog,
  };
}

export function heuristicShiftNarrative(stats: ShiftSummaryStats): string {
  const dept = stats.topDepartmentBacklog[0];
  const deptBit = dept
    ? `Largest departmental backlog: ${dept.department} (${dept.openLines} open test lines). `
    : "";
  return (
    `Shift snapshot: ${stats.incompleteOrders} accession(s) still active; ${stats.statIncomplete} STAT. ` +
    `vs catalogue ETA: ${stats.onTrackVsEta} on track, ${stats.warningVsEta} warning window, ${stats.overdueVsEta} late. ` +
    `${stats.pendingVerificationLines} line(s) in authorization queue. ` +
    deptBit +
    `Operational summary only — verify against live workload.`
  );
}
