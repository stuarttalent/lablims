/** Static demo rows for operational lab modules (not persisted). */

export type DemoStatus = "ok" | "warn" | "critical" | "pending";

export const SEND_RECEIVE_MESSAGES = [
  {
    id: "MSG-88421",
    direction: "Inbound",
    type: "ORM^O01",
    source: "Parirenyatwa PAS",
    accession: "ORD-240502",
    received: "2026-05-15 08:42",
    status: "Processed" as const,
  },
  {
    id: "MSG-88420",
    direction: "Outbound",
    type: "ORU^R01",
    source: "Metropolitan LIS",
    accession: "ORD-240501",
    received: "2026-05-15 08:10",
    status: "Acknowledged" as const,
  },
  {
    id: "MSG-88419",
    direction: "Inbound",
    type: "FHIR Bundle",
    source: "Cimas portal",
    accession: "ORD-240505",
    received: "2026-05-14 16:55",
    status: "Queued" as const,
  },
  {
    id: "MSG-88418",
    direction: "Outbound",
    type: "ORU^R01",
    source: "Metropolitan LIS",
    accession: "ORD-240507",
    received: "2026-05-14 11:02",
    status: "Failed" as const,
  },
];

export const MAINTENANCE_TASKS = [
  {
    asset: "Maccura i1000 UE034",
    task: "Daily probe wash & carry-over check",
    due: "2026-05-15",
    owner: "Kudzai Makoni",
    status: "Due today" as const,
  },
  {
    asset: "Biobase biochemistry",
    task: "Weekly calibration verification",
    due: "2026-05-17",
    owner: "Dr. Chipo Ndlovu",
    status: "Scheduled" as const,
  },
  {
    asset: "EDTA analyser line",
    task: "Haematology QC lot change",
    due: "2026-05-12",
    owner: "Kudzai Makoni",
    status: "Overdue" as const,
  },
  {
    asset: "Cold room B",
    task: "Temperature mapping review",
    due: "2026-05-20",
    owner: "Tariro Moyo",
    status: "Scheduled" as const,
  },
];

export const QA_PROGRAMMES = [
  {
    scheme: "UK NEQAS — Haematology",
    analyte: "FBC 5-part",
    cycle: "2026-Q2",
    due: "2026-05-22",
    lastResult: "Satisfactory",
    status: "Open" as const,
  },
  {
    scheme: "RIQAS — Clinical chemistry",
    analyte: "Lipid panel",
    cycle: "2026-Q2",
    due: "2026-05-18",
    lastResult: "Satisfactory",
    status: "Submitted" as const,
  },
  {
    scheme: "AfriLab EQA — Serology",
    analyte: "HIV/HBsAg",
    cycle: "2026-Q1",
    due: "2026-04-30",
    lastResult: "Borderline — review",
    status: "Action required" as const,
  },
];

export const INSTRUMENT_QC = [
  {
    instrument: "Maccura i1000 UE034",
    control: "Level 2 chemistry",
    lot: "L2-2026-041",
    lastRun: "2026-05-15 06:30",
    status: "In range" as const,
  },
  {
    instrument: "Maccura 560",
    control: "Level 1 chemistry",
    lot: "L1-2025-118",
    lastRun: "2026-04-26 12:23",
    status: "Drift flagged" as const,
  },
  {
    instrument: "Sysmex XN",
    control: "Low haematology",
    lot: "HN-L-882",
    lastRun: "2026-05-15 07:05",
    status: "In range" as const,
  },
];

export const STAIN_QC = [
  {
    stain: "Giemsa",
    batch: "GS-2026-07",
    expiry: "2026-08-01",
    lastCheck: "2026-05-14",
    status: "Pass" as const,
  },
  {
    stain: "Ziehl–Neelsen",
    batch: "ZN-2026-02",
    expiry: "2026-06-15",
    lastCheck: "2026-05-10",
    status: "Pass" as const,
  },
  {
    stain: "Gram",
    batch: "GR-2025-44",
    expiry: "2026-05-12",
    lastCheck: "2026-05-13",
    status: "Repeat QC" as const,
  },
];

export const INVENTORY_STOCK = [
  {
    item: "EDTA vacutainers (4 mL)",
    sku: "VAC-EDTA-4",
    onHand: 420,
    reorder: 200,
    location: "Phlebotomy store",
    status: "ok" as DemoStatus,
  },
  {
    item: "Serum gel tubes",
    sku: "VAC-SST-5",
    onHand: 88,
    reorder: 150,
    location: "Phlebotomy store",
    status: "warn" as DemoStatus,
  },
  {
    item: "Urine culture containers",
    sku: "UC-30ML",
    onHand: 310,
    reorder: 100,
    location: "Micro prep",
    status: "ok" as DemoStatus,
  },
  {
    item: "Lancets (paediatric)",
    sku: "LANC-PED",
    onHand: 45,
    reorder: 80,
    location: "Outreach kit",
    status: "critical" as DemoStatus,
  },
];

export const REAGENT_LOTS = [
  {
    reagent: "LDL direct reagent",
    lot: "LDL-26A",
    opened: "2026-05-01",
    stabilityDays: 30,
    expiry: "2026-05-31",
    status: "Open vial OK" as const,
  },
  {
    reagent: "HbA1c chromatography",
    lot: "HBA-25C",
    opened: "2026-04-10",
    stabilityDays: 14,
    expiry: "2026-04-24",
    status: "Expired — discard" as const,
  },
  {
    reagent: "CRP latex",
    lot: "CRP-26-02",
    opened: "—",
    stabilityDays: 90,
    expiry: "2026-09-01",
    status: "Sealed stock" as const,
  },
];

export const SECURITY_POLICIES = [
  {
    policy: "Session timeout (workstation)",
    value: "30 minutes idle",
    scope: "All staff roles",
  },
  {
    policy: "Result release dual control",
    value: "Technologist entry + scientist authorization",
    scope: "Chemistry, Haematology",
  },
  {
    policy: "PHI export",
    value: "PDF watermark + verification QR",
    scope: "Result slips",
  },
  {
    policy: "Password complexity",
    value: "12+ chars, rotation 90 days",
    scope: "Production SSO (planned)",
  },
];

export const SETUP_CHECKLIST = [
  { step: "Lab profile & letterhead", href: "/settings", done: true },
  { step: "Test catalogue & pricing", href: "/catalogue", done: true },
  { step: "Reference ranges & rules", href: "/catalogue/edit", done: true },
  { step: "FHIR organization endpoint", href: "/interoperability", done: true },
  { step: "User accounts & roles", href: "/users", done: false },
  { step: "Instrument interfaces", href: "/send-receive", done: false },
];
