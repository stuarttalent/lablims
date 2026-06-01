import { getCatalogueTests } from "@/lib/catalogue-access";
import type { LabSettings } from "@/types";

export function resolveTestPrice(testId: string, settings: LabSettings): number {
  const base = getCatalogueTests(settings).find((t) => t.id === testId)?.price ?? 0;
  const over = settings.priceOverrides[testId];
  return over !== undefined ? over : base;
}

export function catalogueWithPrices(settings: LabSettings) {
  return getCatalogueTests(settings).map((t) => ({
    ...t,
    effectivePrice: resolveTestPrice(t.id, settings),
  }));
}
