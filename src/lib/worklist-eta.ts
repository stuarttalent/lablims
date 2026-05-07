import type { OrderTatBaseline, WorklistTatOrderInput } from "./tat-predict";
import {
  computeOrderTatBaseline,
  heuristicEtaNote,
  orderToWorklistTatInput,
} from "./tat-predict";
import type { LabOrder } from "@/types";
import { parseISO } from "date-fns";

/** Punctuality relative to catalogue-derived Est. ready time. */
export type WorklistPunctuality = "on_time" | "warning" | "late";

export type WorklistEtaPrediction = {
  orderId: string;
  readyIso: string;
  note: string;
  /** Optional AI classification — merged with schedule-based logic (max severity). */
  punctualityAi?: WorklistPunctuality | null;
  /** Optional AI rationale for punctuality / queue context. */
  punctualityAiDetail?: string | null;
};

const PUNC_RANK: Record<WorklistPunctuality, number> = {
  on_time: 1,
  warning: 2,
  late: 3,
};

/** Clock + progress vs collection → ready window: late after ETA; warning in final 2h or last 15% of span. */
export function computeSchedulePunctuality(
  collectionDate: string,
  readyIso: string,
  nowMs: number = Date.now(),
): WorklistPunctuality {
  const start = Date.parse(collectionDate);
  let end = NaN;
  try {
    end = parseISO(readyIso).getTime();
  } catch {
    end = NaN;
  }
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return "on_time";

  if (nowMs > end) return "late";

  const span = end - start;
  const progress = span > 0 ? (nowMs - start) / span : 0;
  const twoH = 2 * 3600 * 1000;

  if (nowMs > end - twoH || progress >= 0.85) return "warning";
  return "on_time";
}

export function mergePunctuality(
  schedule: WorklistPunctuality,
  ai: WorklistPunctuality | null | undefined,
): WorklistPunctuality {
  if (!ai) return schedule;
  return PUNC_RANK[schedule] >= PUNC_RANK[ai] ? schedule : ai;
}

export function heuristicPunctualityNote(
  level: WorklistPunctuality,
  readyIso: string,
): string {
  try {
    const ready = parseISO(readyIso);
    if (level === "late") {
      return `Past the estimated ready time (${ready.toLocaleString()}). Results may be overdue — check workflow.`;
    }
    if (level === "warning") {
      return `Approaching or inside the final window before estimated ready (${ready.toLocaleString()}).`;
    }
    return `Within expected window before ${ready.toLocaleString()} (catalogue TAT baseline).`;
  } catch {
    return level === "late"
      ? "Past the estimated ready time."
      : level === "warning"
        ? "Approaching the estimated ready time."
        : "Within the expected window before estimated ready.";
  }
}

export function buildHeuristicWorklistPredictions(
  orders: LabOrder[],
): WorklistEtaPrediction[] {
  const out: WorklistEtaPrediction[] = [];
  for (const order of orders) {
    const baseline = computeOrderTatBaseline(order);
    if (!baseline) continue;
    const input = orderToWorklistTatInput(order);
    out.push({
      orderId: order.id,
      readyIso: baseline.readyIso,
      note: heuristicEtaNote(input, baseline),
      punctualityAi: null,
      punctualityAiDetail: null,
    });
  }
  return out;
}

export type WorklistEtaApiBody = {
  orders: WorklistTatOrderInput[];
  baselines: OrderTatBaseline[];
};

export function enrichOrdersForEtaApi(
  orders: LabOrder[],
): WorklistEtaApiBody | null {
  const inputs: WorklistTatOrderInput[] = [];
  const baselines: OrderTatBaseline[] = [];
  for (const order of orders) {
    const b = computeOrderTatBaseline(order);
    if (!b) continue;
    inputs.push(orderToWorklistTatInput(order));
    baselines.push(b);
  }
  if (inputs.length === 0) return null;
  return { orders: inputs, baselines };
}

export function parsePunctualityToken(
  raw: string | undefined,
): WorklistPunctuality | null {
  if (!raw) return null;
  const x = raw.trim().toLowerCase().replace(/-/g, "_");
  if (x === "on_time" || x === "ontime") return "on_time";
  if (x === "warning" || x === "warn") return "warning";
  if (x === "late" || x === "overdue") return "late";
  return null;
}
