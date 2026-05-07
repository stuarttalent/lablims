import type { LabOrder, OrderPriority } from "@/types";
import { getTestById } from "@/data/catalogue";

/** Parse catalogue strings like "4 hours", "48–72 hours", "5–7 days" → hours (max of range). */
export function parseTurnaroundMaxHours(tat: string): number | null {
  const s = tat.trim().toLowerCase().replace(/–/g, "-");
  if (!s || s === "unknown") return null;

  const range = s.match(
    /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(hour|hours|hr|h\b|day|days|week|weeks)/,
  );
  if (range) {
    const a = parseFloat(range[1]);
    const b = parseFloat(range[2]);
    const hi = Math.max(a, b);
    return toHours(hi, range[3]);
  }

  const single = s.match(
    /(\d+(?:\.\d+)?)\s*(hour|hours|hr|h\b|day|days|week|weeks)/,
  );
  if (single) {
    return toHours(parseFloat(single[1]), single[2]);
  }

  const bare = s.match(/^(\d+(?:\.\d+)?)\s*$/);
  if (bare) return parseFloat(bare[1]);

  return null;
}

function toHours(n: number, unit: string): number {
  if (unit.startsWith("day")) return n * 24;
  if (unit.startsWith("week")) return n * 24 * 7;
  return n;
}

function priorityTatFactor(priority: OrderPriority): number {
  if (priority === "STAT") return 0.55;
  if (priority === "Urgent") return 0.8;
  return 1;
}

export type OrderTatBaseline = {
  orderId: string;
  readyIso: string;
  controllingTest: string;
  catalogueHoursRaw: number;
  hoursAfterPriority: number;
};

const DONE: LabOrder["status"][] = ["Released", "Verified"];

export function isOrderTatComplete(status: LabOrder["status"]): boolean {
  return DONE.includes(status);
}

/** Longest catalogue TAT among tests (parallel workflow); then priority factor; ETA from collection. */
export function computeOrderTatBaseline(order: LabOrder): OrderTatBaseline | null {
  if (isOrderTatComplete(order.status)) return null;

  let catalogueHoursRaw = 0;
  let controllingTest = "";
  for (const line of order.tests) {
    const meta = getTestById(line.testId);
    if (!meta) continue;
    const h = parseTurnaroundMaxHours(meta.turnaroundTime);
    if (h != null && h > catalogueHoursRaw) {
      catalogueHoursRaw = h;
      controllingTest = meta.name;
    }
  }

  if (catalogueHoursRaw <= 0) return null;

  const factor = priorityTatFactor(order.priority);
  const hoursAfterPriority = Math.max(0.5, Math.round(catalogueHoursRaw * factor * 10) / 10);

  const startMs = Date.parse(order.collectionDate);
  if (Number.isNaN(startMs)) return null;

  const readyMs = startMs + hoursAfterPriority * 3600 * 1000;
  return {
    orderId: order.id,
    readyIso: new Date(readyMs).toISOString(),
    controllingTest: controllingTest || "Panel",
    catalogueHoursRaw,
    hoursAfterPriority,
  };
}

export type WorklistTatOrderInput = {
  orderId: string;
  priority: OrderPriority;
  status: LabOrder["status"];
  collectionDate: string;
  tests: {
    testId: string;
    name: string;
    turnaroundTime: string;
    department: string;
  }[];
};

export function orderToWorklistTatInput(order: LabOrder): WorklistTatOrderInput {
  return {
    orderId: order.id,
    priority: order.priority,
    status: order.status,
    collectionDate: order.collectionDate,
    tests: order.tests.map((line) => {
      const m = getTestById(line.testId);
      return {
        testId: line.testId,
        name: m?.name ?? line.testId,
        turnaroundTime: m?.turnaroundTime ?? "unknown",
        department: m?.department ?? "—",
      };
    }),
  };
}

export function heuristicEtaNote(
  input: WorklistTatOrderInput,
  baseline: OrderTatBaseline,
): string {
  const p =
    input.priority === "STAT"
      ? "STAT priority (accelerated ETA vs catalogue)."
      : input.priority === "Urgent"
        ? "Urgent priority — earlier target than routine."
        : "Routine priority — full catalogue timing.";
  return `ETA from longest test TAT (${baseline.controllingTest}, ${baseline.catalogueHoursRaw}h nominal), adjusted to ${baseline.hoursAfterPriority}h. ${p}`;
}
