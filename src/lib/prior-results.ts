import type { DemoStore, OrderTestLine } from "@/types";

export type PriorResultHit = {
  orderId: string;
  collectionDate: string;
  line: OrderTestLine;
};

/** Most recent prior accession for same patient + test with a non-empty result (excludes current order). */
export function findPriorResultForTest(
  store: DemoStore,
  patientId: string,
  testId: string,
  excludeOrderId: string,
): PriorResultHit | null {
  type Row = PriorResultHit & { sortKey: number };
  const candidates: Row[] = [];
  for (const o of store.orders) {
    if (o.patientId !== patientId || o.id === excludeOrderId) continue;
    const line = o.tests.find((t) => t.testId === testId);
    if (!line?.resultValue?.trim()) continue;
    const sortKey = Date.parse(o.collectionDate);
    if (Number.isNaN(sortKey)) continue;
    candidates.push({
      orderId: o.id,
      collectionDate: o.collectionDate,
      line,
      sortKey,
    });
  }
  candidates.sort((a, b) => b.sortKey - a.sortKey);
  if (candidates.length === 0) return null;
  const top = candidates[0];
  return {
    orderId: top.orderId,
    collectionDate: top.collectionDate,
    line: top.line,
  };
}

export function heuristicDeltaSentence(
  testName: string,
  current: { value: string; flag?: string },
  prior: PriorResultHit,
): string {
  const a = current.value.trim();
  const b = prior.line.resultValue?.trim() ?? "";
  const dateShort = prior.collectionDate.replace("T", " ").slice(0, 16);
  if (a === b) {
    return `Stable vs prior (${dateShort}, ${prior.orderId}): same reported value. Trend context only — not a diagnosis.`;
  }
  const na = parseFloat(a.replace(/,/g, ""));
  const nb = parseFloat(b.replace(/,/g, ""));
  if (!Number.isNaN(na) && !Number.isNaN(nb)) {
    if (na > nb) {
      return `Higher vs prior (${dateShort}): ${b} → ${a} (${testName}). Trend context only — not a diagnosis.`;
    }
    if (na < nb) {
      return `Lower vs prior (${dateShort}): ${b} → ${a} (${testName}). Trend context only — not a diagnosis.`;
    }
  }
  return `Changed vs prior (${dateShort}, ${prior.orderId}): was "${b}", now "${a}". Trend context only — not a diagnosis.`;
}
