import { getTestById } from "@/data/catalogue";
import { ORDER_TEMPLATES } from "@/data/order-templates";
import type { LabOrder, ResultFlag } from "@/types";

export interface CumulativeColumn {
  orderId: string;
  /** e.g. "Units 1" */
  columnTitle: string;
  /** e.g. "14 Nov 2025" */
  dateLabel: string;
  collectionDate: string;
}

export interface CumulativeCell {
  value: string;
  units: string;
  flag?: ResultFlag;
}

export interface CumulativeRow {
  testId: string;
  parameterName: string;
  referenceRange: string;
  byOrder: Record<string, CumulativeCell | null>;
}

export interface CumulativeTestMatrix {
  runId: string;
  runLabel: string;
  testIds: string[];
  columns: CumulativeColumn[];
  rows: CumulativeRow[];
}

export interface CumulativeTestRunOption {
  id: string;
  label: string;
  testIds: string[];
  orderIds: string[];
  visitCount: number;
}

function lineHasResult(testId: string, order: LabOrder): boolean {
  const line = order.tests.find((t) => t.testId === testId);
  return (
    line?.resultValue != null && String(line.resultValue).trim() !== ""
  );
}

function orderHasResults(order: LabOrder): boolean {
  return order.tests.some(
    (t) => t.resultValue != null && String(t.resultValue).trim() !== "",
  );
}

function formatDateLabel(collectionDate: string): string {
  const raw = collectionDate.slice(0, 10);
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return raw;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function resultTestIds(order: LabOrder): string[] {
  return order.tests
    .filter(
      (t) => t.resultValue != null && String(t.resultValue).trim() !== "",
    )
    .map((t) => t.testId)
    .sort();
}

function fingerprint(ids: string[]): string {
  return ids.join("\u001f");
}

function labelForFingerprint(ids: string[]): string {
  const names = ids
    .map((id) => getTestById(id)?.name ?? id)
    .slice(0, 3);
  const suffix = ids.length > 3 ? ` +${ids.length - 3} more` : "";
  return `${names.join(", ")}${suffix}`;
}

/** Panels / test sets this patient has run more than once with results. */
export function listCumulativeTestRuns(
  orders: LabOrder[],
): CumulativeTestRunOption[] {
  const withResults = orders.filter(orderHasResults);
  const options: CumulativeTestRunOption[] = [];
  const seen = new Set<string>();

  for (const tmpl of ORDER_TEMPLATES) {
    const testIds = [...tmpl.testIds];
    const matching = withResults.filter((o) =>
      testIds.every((tid) => lineHasResult(tid, o)),
    );
    if (matching.length < 2) continue;

    const id = `template:${tmpl.id}`;
    seen.add(fingerprint(testIds));
    options.push({
      id,
      label: tmpl.label,
      testIds,
      orderIds: matching
        .sort((a, b) => a.collectionDate.localeCompare(b.collectionDate))
        .map((o) => o.id),
      visitCount: matching.length,
    });
  }

  const byFp = new Map<string, LabOrder[]>();
  for (const order of withResults) {
    const ids = resultTestIds(order);
    if (ids.length === 0) continue;
    const fp = fingerprint(ids);
    const list = byFp.get(fp) ?? [];
    list.push(order);
    byFp.set(fp, list);
  }

  for (const [fp, matching] of byFp) {
    if (matching.length < 2 || seen.has(fp)) continue;
    const ids = resultTestIds(matching[0]!);
    options.push({
      id: `custom:${fp}`,
      label: labelForFingerprint(ids),
      testIds: ids,
      orderIds: matching
        .sort((a, b) => a.collectionDate.localeCompare(b.collectionDate))
        .map((o) => o.id),
      visitCount: matching.length,
    });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

/** Matrix for one repeated test run (same parameters, multiple visit columns). */
export function buildCumulativeTestMatrix(
  orders: LabOrder[],
  run: Pick<CumulativeTestRunOption, "id" | "label" | "testIds" | "orderIds">,
): CumulativeTestMatrix | null {
  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const sorted = run.orderIds
    .map((id) => orderMap.get(id))
    .filter((o): o is LabOrder => !!o && orderHasResults(o))
    .sort((a, b) => a.collectionDate.localeCompare(b.collectionDate));

  if (sorted.length === 0) return null;

  const columns: CumulativeColumn[] = sorted.map((o, index) => ({
    orderId: o.id,
    columnTitle: `Units ${index + 1}`,
    dateLabel: formatDateLabel(o.collectionDate),
    collectionDate: o.collectionDate,
  }));

  const rows: CumulativeRow[] = run.testIds.map((testId) => {
    const meta = getTestById(testId);
    const byOrder: Record<string, CumulativeCell | null> = {};
    let referenceRange = meta?.referenceRange ?? "—";

    for (const order of sorted) {
      const line = order.tests.find((t) => t.testId === testId);
      if (
        line?.resultValue != null &&
        String(line.resultValue).trim() !== ""
      ) {
        const units = line.units ?? meta?.units ?? "";
        byOrder[order.id] = {
          value: line.resultValue,
          units,
          flag: line.flag,
        };
        if (line.referenceRange) referenceRange = line.referenceRange;
      } else {
        byOrder[order.id] = null;
      }
    }

    return {
      testId,
      parameterName: meta?.name ?? testId,
      referenceRange,
      byOrder,
    };
  });

  return {
    runId: run.id,
    runLabel: run.label,
    testIds: run.testIds,
    columns,
    rows,
  };
}
