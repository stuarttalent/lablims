import type { CatalogueTest, CatalogueTestOverride, TestKind } from "@/types";

export const QUALITATIVE_RESULTS = [
  "Positive",
  "Negative",
  "Equivocal",
  "Inconclusive",
  "Invalid",
] as const;

export type QualitativeResultValue = (typeof QUALITATIVE_RESULTS)[number];

export function resolveTestKind(
  test: CatalogueTest,
  override?: CatalogueTestOverride,
): TestKind {
  if (override?.testKind) return override.testKind;
  if (test.testKind) return test.testKind;
  if (test.constituentTestIds && test.constituentTestIds.length > 0) {
    return "profile";
  }
  if (test.resultStyle === "microbiology_mcs") return "microbiology";
  if (test.resultStyle === "qualitative") return "qualitative";
  return "quantitative";
}

export function isQualitativeTest(
  test: CatalogueTest | undefined,
  override?: CatalogueTestOverride,
): boolean {
  if (!test) return false;
  return resolveTestKind(test, override) === "qualitative";
}

export function isMicrobiologyTest(
  test: CatalogueTest | undefined,
  override?: CatalogueTestOverride,
): boolean {
  if (!test) return false;
  return resolveTestKind(test, override) === "microbiology";
}

export function applyTestKindToCatalogueTest(
  test: CatalogueTest,
  kind: TestKind,
): CatalogueTest {
  const next: CatalogueTest = { ...test, testKind: kind };
  if (kind === "microbiology") {
    next.resultStyle = "microbiology_mcs";
    delete next.constituentTestIds;
  } else if (kind === "qualitative") {
    next.resultStyle = "qualitative";
    delete next.constituentTestIds;
  } else if (kind === "profile") {
    next.resultStyle = undefined;
    if (!next.constituentTestIds?.length) {
      next.constituentTestIds = [];
    }
  } else {
    next.resultStyle = undefined;
    delete next.constituentTestIds;
  }
  return next;
}
