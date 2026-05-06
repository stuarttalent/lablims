import { TEST_CATALOGUE } from "@/data/catalogue";
import type { LabSettings } from "@/types";

export function resolveTestPrice(testId: string, settings: LabSettings): number {
  const base = TEST_CATALOGUE.find((t) => t.id === testId)?.price ?? 0;
  const over = settings.priceOverrides[testId];
  return over !== undefined ? over : base;
}

export function catalogueWithPrices(settings: LabSettings) {
  return TEST_CATALOGUE.map((t) => ({
    ...t,
    effectivePrice: resolveTestPrice(t.id, settings),
  }));
}
