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
      // 3-part differential
      "t-fbc-neut-pct",
      "t-fbc-lymph-pct",
      "t-fbc-mono-pct",
    ],
  },
  {
    id: "fbc-5part",
    label: "Full Blood Count — 5-part diff",
    description:
      "Same as 3-part, plus eosinophil and basophil percentages for a five-part differential.",
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
      "t-fbc-neut-pct",
      "t-fbc-lymph-pct",
      "t-fbc-mono-pct",
      "t-fbc-eos-pct",
      "t-fbc-baso-pct",
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
