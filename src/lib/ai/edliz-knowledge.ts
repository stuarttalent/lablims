/**
 * Curated laboratory decision-support rules derived from:
 * Zimbabwe EDLIZ 7th Edition (2015) — NMTPAC, Ministry of Health & Child Care.
 * @see https://platform.who.int/docs/default-source/mca-documents/policy-documents/essential-medicines-and-equipment/zwe-ch-43-01-emd-2015-eng-edliz-2015.pdf
 */

import type {
  ClinicalImpression,
  GuidelineReference,
  SuggestedFurtherTest,
} from "@/lib/ai/clinical-guidance-types";
import type { AiCommentInput } from "@/lib/ai-result-comment";

export const EDLIZ_PDF_URL =
  "https://platform.who.int/docs/default-source/mca-documents/policy-documents/essential-medicines-and-equipment/zwe-ch-43-01-emd-2015-eng-edliz-2015.pdf";

type ResultRow = AiCommentInput["results"][number];

function parseNum(value?: string): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function isAbnormal(r: ResultRow | undefined): boolean {
  if (!r) return false;
  return Boolean(r.flag && r.flag !== "Normal");
}

function hasTest(input: AiCommentInput, ids: string[]): boolean {
  return input.results.some((r) => ids.includes(r.testId));
}

function getResult(input: AiCommentInput, testId: string): ResultRow | undefined {
  return input.results.find((r) => r.testId === testId);
}

function pushUniqueImpression(
  list: ClinicalImpression[],
  item: ClinicalImpression,
) {
  if (!list.some((x) => x.label === item.label)) list.push(item);
}

function pushUniqueTest(list: SuggestedFurtherTest[], item: SuggestedFurtherTest) {
  if (!list.some((x) => x.testName.toLowerCase() === item.testName.toLowerCase())) {
    list.push(item);
  }
}

/** Compact EDLIZ excerpts injected into LLM prompts and shown as references. */
export const EDLIZ_LAB_CONTEXT = `
Zimbabwe EDLIZ (2015) — laboratory-relevant excerpts for interpretive support:

• Undifferentiated fever (Antimicrobial guidelines): consider malaria blood films (≥2 if negative), urinalysis, urine microscopy, FBC, and blood culture when feasible; LFTs if hepatitis suspected. Withhold empiric antibiotics when stable while basic investigations proceed.

• Malaria (Ch. 167): severe disease includes Hb ≤6 g/dL (≤7.5 non-immune), jaundice, shock, hypoglycaemia — urgent clinical assessment if suspected.

• HIV (Ch. 101): unexplained fever, recurrent infection, or TB risk — HIV testing and CD4 where indicated; cotrimoxazole prophylaxis per HIV chapter when appropriate.

• Diabetes mellitus (Ch. 240–241): Type 2 common >30y; target glycaemia ideally 5–7 mmol/L where glucose available; HbA1c/glycaemic control guides therapy; review minimum every 3 months when stable; metformin first-line in obese T2DM if renal function adequate; do not use oral agents in pregnancy.

• Cardiovascular / lipids (Ch. 197): dyslipidaemia management aligns with cardiovascular risk reduction — lifestyle and guideline-directed therapy.

• Renal (Ch. 225): elevated urea/creatinine — assess volume status, repeat renal panel, urinalysis; caution metformin if renal impairment.

• TB (Ch. 139): chronic cough, weight loss, night sweats — sputum AFB/GeneXpert per national TB program.

Use only provided results and clinical notes; state certainty as consider/likely/consistent_with — never assert definitive diagnosis.
`.trim();

export function buildEdlizGuidelineReferences(
  sections: string[],
): GuidelineReference[] {
  const uniq = [...new Set(sections)];
  return uniq.map((section) => ({
    source: "EDLIZ 2015 (Zimbabwe)",
    section,
    excerpt: sectionToExcerpt(section),
  }));
}

function sectionToExcerpt(section: string): string {
  const map: Record<string, string> = {
    "Antimicrobial — undifferentiated fever":
      "Basic investigations: urinalysis, urine microscopy, haemoglobin, WBC, malaria parasites; blood culture when possible.",
    "Malaria":
      "Severe malaria includes marked anaemia, jaundice, shock, hypoglycaemia — urgent assessment required.",
    "HIV related disease":
      "Consider HIV testing in prolonged fever, recurrent infections, and before TB therapy decisions.",
    "Diabetes mellitus":
      "Glycaemic targets ~5–7 mmol/L; structured follow-up every ≥3 months; metformin first-line in obese type 2 if renal function safe.",
    "Cardiovascular disease":
      "Address cardiovascular risk including lipids per national cardiovascular chapter.",
    "Renal tract conditions":
      "Repeat renal function and urinalysis when urea/creatinine elevated.",
    "Tuberculosis":
      "Investigate compatible syndromes with sputum microscopy/molecular tests per TB guidelines.",
  };
  return map[section] ?? "See EDLIZ 2015 standard treatment guidelines for this condition.";
}

/** Rule-based EDLIZ alignment from result patterns (offline / fallback). */
export function applyEdlizLabRules(input: AiCommentInput): {
  impressions: ClinicalImpression[];
  suggestedFurtherTests: SuggestedFurtherTest[];
  sections: string[];
} {
  const impressions: ClinicalImpression[] = [];
  const suggestedFurtherTests: SuggestedFurtherTest[] = [];
  const sections: string[] = [];

  const abnormal = input.results.filter(isAbnormal);
  const symptoms = (input.clinicalSymptoms ?? "").toLowerCase();
  const notes = (input.orderNotes ?? "").toLowerCase();
  const ctx = `${symptoms} ${notes}`;

  const feverish =
    /fever|pyrex|night sweat|chills|malaria/i.test(ctx) || abnormal.length > 0;

  if (feverish && !hasTest(input, ["t-malaria"])) {
    sections.push("Antimicrobial — undifferentiated fever");
    pushUniqueTest(suggestedFurtherTests, {
      testName: "Malaria blood film (thick & thin)",
      reason:
        "EDLIZ recommends malaria parasites in febrile illness; repeat if initial film negative and suspicion remains.",
      priority: "urgent",
      edlizSection: "Antimicrobial — undifferentiated fever",
    });
    pushUniqueImpression(impressions, {
      label: "Febrile illness — focus not yet excluded",
      certainty: "consider",
      rationale:
        "Persistent or unexplained fever warrants malaria exclusion and basic infection screen per EDLIZ.",
      edlizSection: "Antimicrobial — undifferentiated fever",
    });
  }

  if (
    feverish &&
    !hasTest(input, ["t-fbc", "t-fbc-hb", "t-fbc-wbc"]) &&
    !input.results.some((r) => r.testId.startsWith("t-fbc"))
  ) {
    pushUniqueTest(suggestedFurtherTests, {
      testName: "Full blood count",
      reason: "EDLIZ lists haemoglobin and white cell count among district-level fever workup.",
      priority: "routine",
      edlizSection: "Antimicrobial — undifferentiated fever",
    });
  }

  if (!hasTest(input, ["t-urine-dip", "t-urine-mcs"]) && feverish) {
    pushUniqueTest(suggestedFurtherTests, {
      testName: "Urinalysis / urine microscopy",
      reason: "Urinary tract infection is a common febrile source in EDLIZ fever algorithm.",
      priority: "routine",
      edlizSection: "Antimicrobial — undifferentiated fever",
    });
  }

  const glucose = getResult(input, "t-glucose");
  const hba1c = getResult(input, "t-hba1c");
  if (
    isAbnormal(glucose) ||
    isAbnormal(hba1c) ||
    /diabet|polyuria|polydips|glycos|weight loss/i.test(ctx)
  ) {
    sections.push("Diabetes mellitus");
    if (!hba1c && glucose) {
      pushUniqueTest(suggestedFurtherTests, {
        testName: "HbA1c",
        reason: "Assess longer-term glycaemic control per diabetes monitoring (EDLIZ Ch. 240–241).",
        priority: "routine",
        edlizSection: "Diabetes mellitus",
      });
    }
    if (!glucose && hba1c) {
      pushUniqueTest(suggestedFurtherTests, {
        testName: "Random or fasting plasma glucose",
        reason: "Correlate HbA1c with contemporaneous glucose for acute management decisions.",
        priority: "routine",
        edlizSection: "Diabetes mellitus",
      });
    }
    const gVal = parseNum(glucose?.resultValue);
    if (gVal != null && gVal >= 11) {
      pushUniqueImpression(impressions, {
        label: "Hyperglycaemia — diabetes mellitus",
        certainty: "likely",
        rationale: `Glucose ${glucose?.resultValue} ${glucose?.units ?? "mmol/L"} — EDLIZ targets glycaemia ~5–7 mmol/L when available; therapy and follow-up per diabetes chapter.`,
        edlizSection: "Diabetes mellitus",
      });
    } else if (isAbnormal(hba1c) || isAbnormal(glucose)) {
      pushUniqueImpression(impressions, {
        label: "Dysglycaemia — diabetes monitoring indicated",
        certainty: "consider",
        rationale:
          "Abnormal glucose or HbA1c — correlate with symptoms; EDLIZ advises regular review (≥3-monthly when stable).",
        edlizSection: "Diabetes mellitus",
      });
    }
    pushUniqueTest(suggestedFurtherTests, {
      testName: "Renal panel (urea, creatinine, eGFR)",
      reason: "Metformin and other agents require renal assessment per EDLIZ diabetes cautions.",
      priority: "if_clinically_indicated",
      edlizSection: "Diabetes mellitus",
    });
  }

  const lipidIds = ["t-lipid-total", "t-lipid-ldl", "t-lipid-hdl", "t-lipid-tg"];
  const lipidAbnormal = input.results.filter(
    (r) => lipidIds.includes(r.testId) && isAbnormal(r),
  );
  if (lipidAbnormal.length > 0 || /lipid|cholesterol|cardiovascular|hypertens/i.test(ctx)) {
    sections.push("Cardiovascular disease");
    pushUniqueImpression(impressions, {
      label: "Dyslipidaemia — cardiovascular risk",
      certainty: lipidAbnormal.length >= 2 ? "likely" : "consider",
      rationale:
        "Abnormal lipids — address lifestyle and guideline-directed cardiovascular risk reduction (EDLIZ Ch. 197).",
      edlizSection: "Cardiovascular disease",
    });
    if (!hasTest(input, ["t-glucose", "t-hba1c"])) {
      pushUniqueTest(suggestedFurtherTests, {
        testName: "Glucose / HbA1c",
        reason: "Diabetes commonly coexists with dyslipidaemia; EDLIZ cardiovascular and metabolic chapters.",
        priority: "routine",
        edlizSection: "Cardiovascular disease",
      });
    }
  }

  const creat = getResult(input, "t-ue-creat");
  const urea = getResult(input, "t-ue-urea");
  if (isAbnormal(creat) || isAbnormal(urea)) {
    sections.push("Renal tract conditions");
    pushUniqueImpression(impressions, {
      label: "Renal function abnormality",
      certainty: "consider",
      rationale:
        "Elevated urea/creatinine — repeat panel, urinalysis, and volume assessment per EDLIZ renal guidance.",
      edlizSection: "Renal tract conditions",
    });
    if (!hasTest(input, ["t-urine-dip", "t-urine-mcs"])) {
      pushUniqueTest(suggestedFurtherTests, {
        testName: "Urinalysis",
        reason: "Exclude urinary tract pathology contributing to renal parameters.",
        priority: "routine",
        edlizSection: "Renal tract conditions",
      });
    }
  }

  const hb = getResult(input, "t-fbc-hb");
  if (isAbnormal(hb)) {
    const hbVal = parseNum(hb?.resultValue);
    if (hbVal != null && hbVal < 7) {
      sections.push("Malaria");
      pushUniqueImpression(impressions, {
        label: "Severe anaemia — urgent clinical correlation",
        certainty: "likely",
        rationale:
          "Hb below ~7 g/dL aligns with EDLIZ severe malaria threshold — exclude malaria and other causes urgently.",
        edlizSection: "Malaria",
      });
      if (!hasTest(input, ["t-malaria"])) {
        pushUniqueTest(suggestedFurtherTests, {
          testName: "Malaria blood film",
          reason: "Severe anaemia is a severe malaria criterion in EDLIZ.",
          priority: "urgent",
          edlizSection: "Malaria",
        });
      }
    } else {
      pushUniqueImpression(impressions, {
        label: "Anaemia",
        certainty: "consider",
        rationale: "Low haemoglobin — correlate with bleeding, haemolysis, nutrition, malaria, or chronic disease.",
      });
    }
    if (!hasTest(input, ["t-fbc", "t-fbc-mcv"])) {
      pushUniqueTest(suggestedFurtherTests, {
        testName: "Full blood count with indices",
        reason: "Characterise anaemia (microcytic, macrocytic, etc.) if not already complete.",
        priority: "routine",
      });
    }
  }

  const crp = getResult(input, "t-crp");
  if (isAbnormal(crp) || /infect|sepsis|pneumonia/i.test(ctx)) {
    pushUniqueImpression(impressions, {
      label: "Inflammatory / infectious process",
      certainty: "consider",
      rationale:
        "Elevated inflammatory marker — align antimicrobial use with EDLIZ focus-of-infection approach when clinically indicated.",
      edlizSection: "Antimicrobial — undifferentiated fever",
    });
  }

  if (
    /cough|tb|tuberculosis|weight loss|night sweat/i.test(ctx) &&
    !hasTest(input, ["t-sputum-afb"])
  ) {
    sections.push("Tuberculosis");
    pushUniqueTest(suggestedFurtherTests, {
      testName: "Sputum AFB / GeneXpert (if productive cough)",
      reason: "Compatible syndrome — investigate per EDLIZ tuberculosis chapter.",
      priority: "if_clinically_indicated",
      edlizSection: "Tuberculosis",
    });
  }

  if (
    /hiv|art|cd4|recurrent infection|opportunistic/i.test(ctx) &&
    !input.results.some((r) => /hiv|cd4/i.test(r.testName))
  ) {
    sections.push("HIV related disease");
    pushUniqueTest(suggestedFurtherTests, {
      testName: "HIV serology / viral load (per program)",
      reason: "Clinical context suggests HIV-related disease workup per EDLIZ Ch. 101.",
      priority: "if_clinically_indicated",
      edlizSection: "HIV related disease",
    });
  }

  if (abnormal.length > 0 && impressions.length === 0) {
    pushUniqueImpression(impressions, {
      label: "Abnormal results — clinical correlation required",
      certainty: "consider",
      rationale: `${abnormal.length} abnormal analyte(s) — interpret with symptoms and repeat testing as appropriate.`,
    });
  }

  return { impressions, suggestedFurtherTests, sections };
}
