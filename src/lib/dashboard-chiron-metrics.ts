import { getTestById } from "@/data/catalogue";
import type { DemoStore, LabOrder, OrderTestLine } from "@/types";
import { format, subDays, addDays } from "date-fns";
import { computeOrderTatBaseline, isOrderTatComplete } from "@/lib/tat-predict";

export function isoDateUTC(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function lineEffectivelyUnentered(line: OrderTestLine): boolean {
  if (line.resultStatus === "Released" || line.resultStatus === "Verified") return false;
  const v = (line.resultValue ?? "").trim();
  return v === "" || v === "—";
}

function orderCollectedOnDay(order: LabOrder, yyyyMmDd: string): boolean {
  return order.collectionDate.startsWith(yyyyMmDd);
}

function orderLeadTimeHoursReleased(order: LabOrder): number | null {
  if (order.status !== "Released" && order.status !== "Verified") return null;
  const startMs = Date.parse(order.collectionDate);
  if (Number.isNaN(startMs)) return null;
  const endDates = order.tests
    .map((t) => t.verificationDate)
    .filter(Boolean)
    .map((d) => Date.parse(d!))
    .filter((n) => !Number.isNaN(n));
  if (endDates.length === 0) return null;
  const endMs = Math.max(...endDates);
  return Math.max(0, (endMs - startMs) / 3600000);
}

export type YesterdayStats = {
  dateLabel: string;
  isoYesterday: string;
  requisitionsCaptured: number;
  testsRequested: number;
  unenteredResults: number;
  testsRunningLate: number;
  interfacedImportHint: number;
};

export type DayPerformanceRow = {
  dateShort: string;
  isoDate: string;
  tatExceededPct: number;
  tatExceededCount: number;
  unenteredPct: number;
  unenteredCount: number;
  totalTests: number;
  forms: number;
  trophy: boolean;
};

export function computeYesterdayStats(store: DemoStore, now = new Date()): YesterdayStats {
  const y = subDays(now, 1);
  const isoYesterday = isoDateUTC(y);
  const dateLabel = format(y, "EEE, d MMM");
  const dayOrders = store.orders.filter((o) => orderCollectedOnDay(o, isoYesterday));
  let testsRequested = 0;
  let unenteredResults = 0;
  for (const o of dayOrders) {
    testsRequested += o.tests.length;
    for (const t of o.tests) {
      if (lineEffectivelyUnentered(t)) unenteredResults += 1;
    }
  }
  let testsRunningLate = 0;
  for (const o of store.orders) {
    if (!orderCollectedOnDay(o, isoYesterday)) continue;
    if (isOrderTatComplete(o.status)) continue;
    const b = computeOrderTatBaseline(o);
    if (!b) continue;
    if (now.getTime() > Date.parse(b.readyIso)) testsRunningLate += 1;
  }
  /**
   * Placeholder magnitude for interfaced ingest — deterministic from store so the UI stays lively.
   */
  const interfacedImportHint =
    (store.orders.filter((o) => o.createdAt.endsWith(":00")).length % 9) + 6;

  return {
    dateLabel,
    isoYesterday,
    requisitionsCaptured: dayOrders.length,
    testsRequested,
    unenteredResults,
    testsRunningLate,
    interfacedImportHint,
  };
}

export function buildLast7DayRows(store: DemoStore, now = new Date()): DayPerformanceRow[] {
  const rows: DayPerformanceRow[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = subDays(now, i);
    const iso = isoDateUTC(d);
    const dayOrders = store.orders.filter((o) => orderCollectedOnDay(o, iso));
    const forms = dayOrders.length;
    let totalTests = 0;
    let unenteredCount = 0;
    let tatExceededCount = 0;

    for (const o of dayOrders) {
      totalTests += o.tests.length;
      for (const t of o.tests) {
        if (lineEffectivelyUnentered(t)) unenteredCount += 1;
      }
      if (isOrderTatComplete(o.status)) continue;
      const b = computeOrderTatBaseline(o);
      if (b && now.getTime() > Date.parse(b.readyIso)) tatExceededCount += 1;
    }

    const unenteredPct = totalTests > 0 ? (unenteredCount / totalTests) * 100 : 0;
    const tatExceededPct = forms > 0 ? (tatExceededCount / forms) * 100 : 0;

    const trophy =
      totalTests > 0 && tatExceededPct < 12 && unenteredPct < 5 && tatExceededCount < 10;

    rows.push({
      dateShort: format(d, "EEE, d MMM"),
      isoDate: iso,
      tatExceededPct: Math.round(tatExceededPct * 10) / 10,
      tatExceededCount,
      unenteredPct: Math.round(unenteredPct * 10) / 10,
      unenteredCount,
      totalTests,
      forms,
      trophy,
    });
  }
  return rows;
}

/** Realised lab time (hours) for accessions that have left the lab. */
function meanLeadReleasedInCollectionWindow(
  orders: LabOrder[],
  start: Date,
  end: Date,
): number | null {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const vals: number[] = [];
  for (const o of orders) {
    const c = Date.parse(o.collectionDate);
    if (Number.isNaN(c) || c < startMs || c >= endMs) continue;
    const x = orderLeadTimeHoursReleased(o);
    if (x != null) vals.push(x);
  }
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export type TatRollingComparison = {
  prev7AvgHours: number | null;
  curr7AvgHours: number | null;
  unenteredLast30Fraction: number;
  unenteredLast30Lines: number;
  openLinesCounted: number;
};

export function computeTatRolling(store: DemoStore, now = new Date()): TatRollingComparison {
  const prev7AvgHours = meanLeadReleasedInCollectionWindow(
    store.orders,
    subDays(now, 14),
    subDays(now, 7),
  );
  const curr7AvgHours = meanLeadReleasedInCollectionWindow(
    store.orders,
    subDays(now, 7),
    addDays(now, 1),
  );

  let unenteredLines = 0;
  let openLines = 0;
  const start30 = subDays(now, 30).getTime();
  for (const o of store.orders) {
    const c = Date.parse(o.collectionDate);
    if (Number.isNaN(c) || c < start30) continue;
    for (const t of o.tests) {
      openLines += 1;
      if (lineEffectivelyUnentered(t)) unenteredLines += 1;
    }
  }

  const unenteredLast30Fraction =
    openLines > 0 ? unenteredLines / openLines : 0;

  return {
    prev7AvgHours: prev7AvgHours,
    curr7AvgHours: curr7AvgHours,
    unenteredLast30Fraction,
    unenteredLast30Lines: unenteredLines,
    openLinesCounted: openLines,
  };
}

export type TestFrequencyRow = {
  testId: string;
  name: string;
  count: number;
};

export function mostRequestedTests(
  store: DemoStore,
  days: number,
  now = new Date(),
  limit = 12,
): TestFrequencyRow[] {
  const start = subDays(now, days).getTime();
  const m = new Map<string, number>();
  for (const o of store.orders) {
    const c = Date.parse(o.collectionDate);
    if (Number.isNaN(c) || c < start) continue;
    for (const t of o.tests) {
      m.set(t.testId, (m.get(t.testId) ?? 0) + 1);
    }
  }
  return [...m.entries()]
    .map(([testId, count]) => ({
      testId,
      name: getTestById(testId)?.name ?? testId,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export type DepartmentVolume = { department: string; tests: number };

export function departmentVolumesLastDays(
  store: DemoStore,
  days: number,
  now = new Date(),
): DepartmentVolume[] {
  const start = subDays(now, days).getTime();
  const counts = new Map<string, number>();
  for (const dep of store.settings.departments) {
    counts.set(dep, 0);
  }
  for (const o of store.orders) {
    const c = Date.parse(o.collectionDate);
    if (Number.isNaN(c) || c < start) continue;
    for (const line of o.tests) {
      const meta = getTestById(line.testId);
      const d = meta?.department ?? "Other";
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
  }
  const list = [...counts.entries()].map(([department, tests]) => ({
    department,
    tests,
  }));
  list.sort((a, b) => b.tests - a.tests);
  return list;
}
