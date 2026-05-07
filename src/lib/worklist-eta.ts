import type { OrderTatBaseline, WorklistTatOrderInput } from "./tat-predict";
import {
  computeOrderTatBaseline,
  heuristicEtaNote,
  orderToWorklistTatInput,
} from "./tat-predict";
import type { LabOrder } from "@/types";

export type WorklistEtaPrediction = {
  orderId: string;
  readyIso: string;
  note: string;
};

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
