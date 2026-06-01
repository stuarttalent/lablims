import type { OrderTestLine } from "@/types";

/** Absolute differential count (legacy % line ids kept for old orders). */
export const FBC_ABS_TO_PCT: Record<string, string> = {
  "t-fbc-neut-abs": "t-fbc-neut-pct",
  "t-fbc-lymph-abs": "t-fbc-lymph-pct",
  "t-fbc-mono-abs": "t-fbc-mono-pct",
  "t-fbc-eos-abs": "t-fbc-eos-pct",
  "t-fbc-baso-abs": "t-fbc-baso-pct",
};

export const FBC_PCT_FROM_ABS = new Set(Object.values(FBC_ABS_TO_PCT));

export const FBC_ABS_TEST_IDS = new Set(Object.keys(FBC_ABS_TO_PCT));

export function isFbcAbsoluteDifferential(testId: string): boolean {
  return FBC_ABS_TEST_IDS.has(testId);
}

function toNum(v?: string): number | null {
  if (!v) return null;
  const n = Number.parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Hide separate % rows when absolute (#) lines are on the order. */
export function filterFbcLinesForDisplay(lines: OrderTestLine[]): OrderTestLine[] {
  const hasAbs = lines.some((l) => FBC_ABS_TEST_IDS.has(l.testId));
  if (!hasAbs) return lines;
  return lines.filter((l) => !FBC_PCT_FROM_ABS.has(l.testId));
}

export function fbcDisplayTestName(testId: string, catalogueName: string): string {
  if (FBC_ABS_TEST_IDS.has(testId)) {
    return catalogueName.replace(/\s*#$/i, "").trim();
  }
  return catalogueName;
}

/** Result cell: absolute (percentage) e.g. 2.50 (62.5%) */
export function formatFbcDifferentialResult(
  line: OrderTestLine,
  lines: OrderTestLine[],
): string {
  if (!FBC_ABS_TEST_IDS.has(line.testId)) {
    return line.resultValue?.trim() || "—";
  }

  const absRaw = line.resultValue?.trim();
  if (!absRaw) return "—";

  const wbc = toNum(lines.find((l) => l.testId === "t-fbc-wbc")?.resultValue);
  const abs = toNum(absRaw);
  if (wbc != null && wbc > 0 && abs != null) {
    const pct = ((abs / wbc) * 100).toFixed(1);
    return `${absRaw} (${pct}%)`;
  }

  return absRaw;
}

export function isFbcAutoComment(comment?: string): boolean {
  return Boolean(comment?.trim().startsWith("Auto-calculated"));
}
