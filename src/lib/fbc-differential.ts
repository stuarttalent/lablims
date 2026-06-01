import { getTestById } from "@/data/catalogue";
import type { ResultFlag } from "@/types";

/** Absolute differential count → percentage line (of WBC). */
export const FBC_ABS_TO_PCT: Record<string, string> = {
  "t-fbc-neut-abs": "t-fbc-neut-pct",
  "t-fbc-lymph-abs": "t-fbc-lymph-pct",
  "t-fbc-mono-abs": "t-fbc-mono-pct",
  "t-fbc-eos-abs": "t-fbc-eos-pct",
  "t-fbc-baso-abs": "t-fbc-baso-pct",
};

export const FBC_PCT_FROM_ABS = new Set(Object.values(FBC_ABS_TO_PCT));

export const FBC_ABS_TEST_IDS = new Set(Object.keys(FBC_ABS_TO_PCT));

export function isFbcAutoCalculatedPct(testId: string): boolean {
  return FBC_PCT_FROM_ABS.has(testId);
}

export function isFbcAbsoluteDifferential(testId: string): boolean {
  return FBC_ABS_TEST_IDS.has(testId);
}

function toNum(v?: string): number | null {
  if (!v) return null;
  const n = Number.parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export type FbcPctUpdate = {
  testId: string;
  resultValue: string;
  comment: string;
  flag?: ResultFlag;
};

/** Given WBC and absolute counts, compute percentage lines. */
export function computeFbcPercentagesFromAbsolutes(
  valueByTest: Map<string, string>,
  inferFlag?: (value: string, range?: string) => ResultFlag | undefined,
): FbcPctUpdate[] {
  const wbc = toNum(valueByTest.get("t-fbc-wbc"));
  if (wbc == null || wbc <= 0) return [];

  const updates: FbcPctUpdate[] = [];

  for (const [absId, pctId] of Object.entries(FBC_ABS_TO_PCT)) {
    const abs = toNum(valueByTest.get(absId));
    if (abs == null) continue;

    const pct = (abs / wbc) * 100;
    if (!Number.isFinite(pct)) continue;

    const pctValue = pct.toFixed(1);
    const meta = getTestById(pctId);
    updates.push({
      testId: pctId,
      resultValue: pctValue,
      comment: `Auto-calculated: (${abs.toFixed(2)} ÷ WBC ${wbc.toFixed(2)}) × 100.`,
      flag: inferFlag?.(pctValue, meta?.referenceRange),
    });
  }

  return updates;
}

export function shouldRecalculateFbcPercentages(
  changedTestId: string,
): boolean {
  return (
    changedTestId === "t-fbc-wbc" ||
    FBC_ABS_TEST_IDS.has(changedTestId)
  );
}
