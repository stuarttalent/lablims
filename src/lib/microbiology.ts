import { getCatalogueOverride, getTestById } from "@/lib/catalogue-access";
import { resolveTestKind } from "@/lib/test-kind";
import type {
  LabSettings,
  MicrobiologyResult,
  MicroOrganismResult,
  MicroSusceptibility,
  OrderTestLine,
} from "@/types";

export const MICRO_MCS_TEST_IDS = new Set([
  "t-urine-mcs",
  "t-stool-mcs",
  "t-blood-culture",
  "t-hvs",
  "t-wound",
]);

export const DEFAULT_ANTIBIOTICS = [
  "Amoxicillin-clavulanate",
  "Ampicillin",
  "Amikacin",
  "Cefalexin",
  "Cefotaxime",
  "Ceftazidime",
  "Ceftriaxone",
  "Ciprofloxacin",
  "Colistin",
  "Ertapenem",
  "Gentamicin",
  "Imipenem",
  "Meropenem",
  "Nitrofurantoin",
  "Piperacillin-tazobactam",
  "Trimethoprim-sulfamethoxazole",
] as const;

export const CULTURE_OUTCOMES: NonNullable<MicrobiologyResult["cultureOutcome"]>[] = [
  "No growth",
  "Normal flora",
  "Growth",
  "Mixed growth",
  "Contaminated",
];

export const MICRO_JSON_PREFIX = "__micro_v1__:";

export function isMicroStructuredComment(comment?: string): boolean {
  return Boolean(comment?.startsWith(MICRO_JSON_PREFIX));
}

export function isMicrobiologyMcsTest(
  testId: string,
  settings?: Pick<LabSettings, "customTests" | "catalogueOverrides">,
): boolean {
  if (MICRO_MCS_TEST_IDS.has(testId)) return true;
  const test = getTestById(testId, settings);
  if (!test) return false;
  return (
    resolveTestKind(test, getCatalogueOverride(testId, settings)) ===
    "microbiology"
  );
}

export function emptyMicrobiologyResult(): MicrobiologyResult {
  return {
    cultureOutcome: "No growth",
    organisms: [],
    colonyCount: "",
    gramStain: "",
    additionalNotes: "",
  };
}

export function emptyOrganism(): MicroOrganismResult {
  return {
    name: "",
    quantity: "",
    antibiotics: DEFAULT_ANTIBIOTICS.map((drug) => ({
      drug,
      result: "NA" as MicroSusceptibility,
    })),
  };
}

export function parseMicrobiologyResult(line: OrderTestLine): MicrobiologyResult {
  if (line.microbiologyResult) return line.microbiologyResult;
  if (line.comment?.startsWith(MICRO_JSON_PREFIX)) {
    try {
      return JSON.parse(
        line.comment.slice(MICRO_JSON_PREFIX.length),
      ) as MicrobiologyResult;
    } catch {
      /* fall through */
    }
  }
  return emptyMicrobiologyResult();
}

export function serializeMicrobiologyToComment(
  micro: MicrobiologyResult,
): string {
  return `${MICRO_JSON_PREFIX}${JSON.stringify(micro)}`;
}

/** One-line summary for lists and result_value column. */
export function microbiologyResultSummary(micro: MicrobiologyResult): string {
  if (micro.cultureOutcome === "No growth") return "No growth";
  if (micro.cultureOutcome === "Normal flora") return "Normal flora";
  const names = micro.organisms
    .map((o) => o.name.trim())
    .filter(Boolean);
  if (names.length === 0) {
    const colony = micro.colonyCount?.trim();
    return colony || micro.cultureOutcome || "See report";
  }
  const primary = names[0];
  const extra = names.length > 1 ? ` (+${names.length - 1} more)` : "";
  return `${primary}${extra}`;
}

/** Build patch fields when microbiology result is saved. */
export function microbiologyLinePatch(
  micro: MicrobiologyResult,
): Pick<OrderTestLine, "microbiologyResult" | "resultValue" | "comment"> {
  return {
    microbiologyResult: micro,
    resultValue: microbiologyResultSummary(micro),
    comment: serializeMicrobiologyToComment(micro),
  };
}
