/** How strongly the AI ties a finding to a clinical picture (not a formal diagnosis). */
export type ClinicalCertainty = "consider" | "likely" | "consistent_with";

export type ClinicalImpression = {
  label: string;
  certainty: ClinicalCertainty;
  rationale: string;
  edlizSection?: string;
};

export type SuggestedFurtherTest = {
  testName: string;
  reason: string;
  priority: "routine" | "urgent" | "if_clinically_indicated";
  edlizSection?: string;
};

export type GuidelineReference = {
  source: string;
  section: string;
  excerpt: string;
};

export type ClinicalGuidance = {
  narrative: string;
  impressions: ClinicalImpression[];
  suggestedFurtherTests: SuggestedFurtherTest[];
  guidelineReferences: GuidelineReference[];
  disclaimer: string;
};

export type GuidanceSource = "openai" | "edliz_rules";

export const EDLIZ_SOURCE_LABEL =
  "Zimbabwe EDLIZ 7th Edition (2015) — Essential Medicines List & Standard Treatment Guidelines";

export const CLINICAL_GUIDANCE_DISCLAIMER =
  "Decision-support only. Interpret in full clinical context; not a substitute for physician judgment or definitive diagnosis.";
