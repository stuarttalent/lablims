export interface OrderTemplate {
  id: string;
  label: string;
  description: string;
  /** Prefills sample type on the request when applied (user can edit). */
  sampleTypeHint: string;
  testIds: readonly string[];
}

export const ORDER_TEMPLATES: OrderTemplate[] = [
  {
    id: "fbc-3part",
    label: "Full Blood Count — 3-part diff",
    description:
      "RBC indices, platelets, and three-part white-cell differential (neutrophil, lymphocyte, monocyte %).",
    sampleTypeHint: "EDTA whole blood",
    testIds: [
      // Core indices
      "t-fbc-wbc",
      "t-fbc-rbc",
      "t-fbc-hb",
      "t-fbc-hct",
      "t-fbc-mcv",
      "t-fbc-mch",
      "t-fbc-mchc",
      "t-fbc-rdw",
      "t-fbc-plt",
      "t-fbc-mpv",
      "t-fbc-neut-abs",
      "t-fbc-lymph-abs",
      "t-fbc-mono-abs",
    ],
  },
  {
    id: "fbc-5part",
    label: "Full Blood Count — 5-part diff",
    description:
      "Same as 3-part, plus eosinophil and basophil (# with auto %).",
    sampleTypeHint: "EDTA whole blood",
    testIds: [
      "t-fbc-wbc",
      "t-fbc-rbc",
      "t-fbc-hb",
      "t-fbc-hct",
      "t-fbc-mcv",
      "t-fbc-mch",
      "t-fbc-mchc",
      "t-fbc-rdw",
      "t-fbc-plt",
      "t-fbc-mpv",
      "t-fbc-neut-abs",
      "t-fbc-lymph-abs",
      "t-fbc-mono-abs",
      "t-fbc-eos-abs",
      "t-fbc-baso-abs",
    ],
  },
  {
    id: "lft-panel",
    label: "Liver function tests (full panel)",
    description:
      "Total protein, albumin, ALT, AST, ALP, GGT, total/direct bilirubin plus calculated globulin and A/G ratio.",
    sampleTypeHint: "Serum",
    testIds: [
      "t-lft-total-protein",
      "t-lft-albumin",
      "t-lft-alt",
      "t-lft-ast",
      "t-lft-alp",
      "t-lft-ggt",
      "t-lft-bili-total",
      "t-lft-bili-direct",
      "t-lft-globulin-calc",
      "t-lft-ag-ratio-calc",
    ],
  },
  {
    id: "lipid-profile",
    label: "Lipid profile",
    description: "Total cholesterol, HDL-C, LDL-C, and triglycerides (fasting preferred).",
    sampleTypeHint: "Serum (fasting preferred)",
    testIds: ["t-lipid-total", "t-lipid-hdl", "t-lipid-ldl", "t-lipid-tg"],
  },
  {
    id: "micro-urine",
    label: "Microbiology — urine culture",
    description: "Urine MCS with culture and sensitivity workflow.",
    sampleTypeHint: "Mid-stream urine",
    testIds: ["t-urine-mcs"],
  },
  {
    id: "micro-sepsis",
    label: "Microbiology — sepsis screen",
    description: "Blood culture with inflammatory marker support (CRP).",
    sampleTypeHint: "Blood",
    testIds: ["t-blood-culture", "t-crp"],
  },
  {
    id: "micro-swab-suite",
    label: "Microbiology — swab suite",
    description: "High vaginal and wound swab MCS for infection workup.",
    sampleTypeHint: "Swab",
    testIds: ["t-hvs", "t-wound"],
  },
  {
    id: "u-and-e",
    label: "Urea & electrolytes",
    description: "Sodium, potassium, chloride, urea, and creatinine.",
    sampleTypeHint: "Serum",
    testIds: [
      "t-ue-sodium",
      "t-ue-potassium",
      "t-ue-chloride",
      "t-ue-urea",
      "t-ue-creat",
    ],
  },
];
