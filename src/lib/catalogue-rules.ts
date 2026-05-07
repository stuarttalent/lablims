import { getTestById } from "@/data/catalogue";
import type {
  CatalogueGenderScope,
  CatalogueTestOverride,
  LabSettings,
  OrderTestLine,
  Patient,
  ReferenceRangeBand,
  ResultCommentRule,
} from "@/types";

export function normalizePatientGender(raw: string): "male" | "female" | "other" {
  const x = raw.trim().toLowerCase();
  if (x.startsWith("m") && !x.startsWith("mf")) return "male";
  if (x.startsWith("f")) return "female";
  return "other";
}

function genderScopeMatches(
  scopes: CatalogueGenderScope[],
  patient: "male" | "female" | "other",
): boolean {
  if (scopes.includes("all")) return true;
  for (const s of scopes) {
    if (s === "male" && patient === "male") return true;
    if (s === "female" && patient === "female") return true;
    if (s === "other" && patient === "other") return true;
  }
  return false;
}

function bandMatches(
  band: ReferenceRangeBand,
  ageYears: number,
  patientGender: "male" | "female" | "other",
): boolean {
  const min = band.minAgeYears ?? Number.NEGATIVE_INFINITY;
  const max = band.maxAgeYears ?? Number.POSITIVE_INFINITY;
  if (ageYears < min || ageYears > max) return false;
  return genderScopeMatches(band.genders, patientGender);
}

export function getCatalogueOverride(
  testId: string,
  settings: LabSettings,
): CatalogueTestOverride | undefined {
  return settings.catalogueOverrides[testId];
}

/** First matching band for patient demographics; else catalogue default string. */
export function resolveReferenceRangeForPatient(
  testId: string,
  patient: Patient | undefined,
  settings: LabSettings,
): string {
  const base = getTestById(testId);
  const fallback = base?.referenceRange ?? "";
  const override = getCatalogueOverride(testId, settings);
  const bands = override?.referenceBands;
  if (!patient || !bands?.length) return fallback;

  const g = normalizePatientGender(patient.gender);
  const age = patient.age;

  for (const band of bands) {
    if (bandMatches(band, age, g)) return band.rangeText;
  }
  return fallback;
}

function ruleMatchesComment(rule: ResultCommentRule, line: OrderTestLine): boolean {
  const hasFlag = rule.flag !== undefined;
  const hasVal = Boolean(rule.valueContains?.trim());
  if (!hasFlag && !hasVal) return false;

  if (hasFlag && line.flag !== rule.flag) return false;

  if (hasVal) {
    const needle = rule.valueContains!.trim().toLowerCase();
    const hay = (line.resultValue ?? "").toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

/** Comments from all matching rules (deduped). */
export function defaultCommentsForLine(
  testId: string,
  line: OrderTestLine,
  settings: LabSettings,
): string[] {
  const rules = getCatalogueOverride(testId, settings)?.defaultCommentRules;
  if (!rules?.length) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of rules) {
    if (!ruleMatchesComment(r, line)) continue;
    const t = r.comment.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
