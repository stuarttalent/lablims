import { getTestById } from "@/data/catalogue";
import type {
  DemoStore,
  LabOrder,
  Patient,
  LabSettings,
  OrderTestLine,
} from "@/types";
import {
  FHIR_STRUCTURE_DEFINITION_DIAGNOSTIC_REPORT_V2,
  FHIR_STRUCTURE_DEFINITION_OBSERVATION,
  FHIR_STRUCTURE_DEFINITION_ORGANIZATION,
  FHIR_STRUCTURE_DEFINITION_PATIENT,
  FHIR_STRUCTURE_DEFINITION_SERVICE_REQUEST,
  LOINC_SYSTEM,
} from "./constants";

/** FHIR id: letters, numbers, dash, dot only */
export function toFhirId(internalId: string): string {
  return internalId.replace(/[^A-Za-z0-9.-]/g, "-").slice(0, 64);
}

function fhirGender(adminGender: string): "male" | "female" | "other" | "unknown" {
  const g = adminGender.toLowerCase();
  if (g === "male") return "male";
  if (g === "female") return "female";
  if (g === "other") return "other";
  return "unknown";
}

function isoInstantFromLocalDateTime(local: string): string {
  if (!local.includes("T")) return `${local}T12:00:00.000Z`;
  try {
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export function resolveFhirBase(settings: LabSettings): string {
  return (
    settings.fhirBaseUrl?.replace(/\/$/, "") ??
    "https://fhir.metropolitanclinlab.org/R4"
  );
}

export function buildOrganization(
  settings: LabSettings,
): Record<string, unknown> {
  const oid = toFhirId(settings.fhirOrganizationId ?? "lab-org");
  return {
    resourceType: "Organization",
    id: oid,
    meta: {
      profile: [FHIR_STRUCTURE_DEFINITION_ORGANIZATION],
      versionId: "1",
    },
    identifier: [
      {
        use: "official",
        system: `${resolveFhirBase(settings)}/NamingSystem/lab-registration`,
        value: settings.registrationNumber,
      },
    ],
    name: settings.labName,
    telecom: [
      { system: "phone", value: settings.phone },
      { system: "email", value: settings.email },
    ],
    address: [
      {
        text: settings.address,
        country: "ZW",
      },
    ],
  };
}

export function buildPatient(
  patient: Patient,
  settings: LabSettings,
): Record<string, unknown> {
  const pid = toFhirId(patient.id);
  const orgId = toFhirId(settings.fhirOrganizationId ?? "lab-org");
  return {
    resourceType: "Patient",
    id: pid,
    meta: {
      profile: [FHIR_STRUCTURE_DEFINITION_PATIENT],
    },
    identifier: [
      {
        use: "usual",
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0203",
              code: "MR",
              display: "Medical record number",
            },
          ],
        },
        system: `${resolveFhirBase(settings)}/NamingSystem/patient-mrn`,
        value: patient.id,
      },
    ],
    active: true,
    name: [
      {
        use: "official",
        text: patient.fullName,
        family: patient.fullName.split(/\s+/).slice(-1).join(" ") || patient.fullName,
        given: patient.fullName.split(/\s+/).slice(0, -1).length
          ? patient.fullName.split(/\s+/).slice(0, -1)
          : [patient.fullName],
      },
    ],
    telecom: [
      { system: "phone", value: patient.phone },
      { system: "email", value: patient.email },
    ],
    gender: fhirGender(patient.gender),
    birthDate: patient.dateOfBirth,
    address: [
      {
        text: patient.address,
        country: "ZW",
      },
    ],
    managingOrganization: {
      reference: `Organization/${orgId}`,
      display: settings.labName,
    },
  };
}

function mapPriorityToFHIR(p: LabOrder["priority"]): string {
  if (p === "STAT") return "stat";
  if (p === "Urgent") return "asap";
  return "routine";
}

function mapOrderStatusToServiceRequestStatus(
  s: LabOrder["status"],
): "draft" | "active" | "on-hold" | "revoked" | "completed" | "entered-in-error" | "unknown" {
  switch (s) {
    case "Requested":
      return "active";
    case "Sample Collected":
    case "In Progress":
      return "active";
    case "Pending Verification":
      return "active";
    case "Verified":
    case "Released":
      return "completed";
    default:
      return "active";
  }
}

export function buildServiceRequest(
  order: LabOrder,
  patient: Patient,
  settings: LabSettings,
): Record<string, unknown> {
  const oid = toFhirId(order.id);
  const pid = toFhirId(patient.id);
  const codes = order.tests
    .map((t) => getTestById(t.testId))
    .filter(Boolean)
    .map((c) => ({
      coding:
        c!.loincCode != null
          ? [{ system: LOINC_SYSTEM, code: c!.loincCode, display: c!.name }]
          : undefined,
      text: c!.name,
    }));

  return {
    resourceType: "ServiceRequest",
    id: oid,
    meta: {
      profile: [FHIR_STRUCTURE_DEFINITION_SERVICE_REQUEST],
    },
    identifier: [
      {
        system: `${resolveFhirBase(settings)}/NamingSystem/lab-requisition`,
        value: order.id,
      },
    ],
    status: mapOrderStatusToServiceRequestStatus(order.status),
    intent: "order",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/service-request-category",
            code: "laboratory",
            display: "Laboratory",
          },
        ],
      },
    ],
    priority: mapPriorityToFHIR(order.priority),
    code: {
      text: order.tests
        .map((t) => getTestById(t.testId)?.name ?? t.testId)
        .join("; "),
      coding: codes[0]?.coding,
    },
    subject: {
      reference: `Patient/${pid}`,
      display: patient.fullName,
    },
    authoredOn: order.createdAt.includes("T")
      ? isoInstantFromLocalDateTime(order.createdAt)
      : `${order.createdAt}T00:00:00.000Z`,
    requester: {
      display: order.requestingDoctor,
    },
    note: order.notes ? [{ text: order.notes }] : undefined,
  };
}

function interpretationCode(
  flag?: OrderTestLine["flag"],
): Array<{ coding: Array<{ system: string; code: string; display: string }> }> {
  if (!flag || flag === "Normal") return [];
  if (flag === "Low")
    return [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", code: "L", display: "Low" }] }];
  if (flag === "High")
    return [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", code: "H", display: "High" }] }];
  return [
    {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
          code: "AA",
          display: "Critical abnormal",
        },
      ],
    },
  ];
}

export function buildObservation(
  order: LabOrder,
  patient: Patient,
  line: OrderTestLine,
  settings: LabSettings,
): Record<string, unknown> {
  const meta = getTestById(line.testId);
  const pid = toFhirId(patient.id);
  const oid = toFhirId(`${order.id}-${line.testId}`);
  const codeConcept =
    meta?.loincCode != null
      ? {
          coding: [
            {
              system: LOINC_SYSTEM,
              code: meta.loincCode,
              display: meta.name,
            },
          ],
          text: meta.name,
        }
      : { text: meta?.name ?? line.testId };

  const obs: Record<string, unknown> = {
    resourceType: "Observation",
    id: oid,
    meta: {
      profile: [FHIR_STRUCTURE_DEFINITION_OBSERVATION],
    },
    identifier: [
      {
        system: `${resolveFhirBase(settings)}/NamingSystem/observation`,
        value: `${order.id}:${line.testId}`,
      },
    ],
    status:
      line.resultStatus === "Released"
        ? "final"
        : line.resultStatus === "Verified"
          ? "final"
          : line.resultStatus === "Pending Verification"
            ? "preliminary"
            : "registered",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "laboratory",
            display: "Laboratory",
          },
        ],
      },
    ],
    code: codeConcept,
    subject: {
      reference: `Patient/${pid}`,
      display: patient.fullName,
    },
    effectiveDateTime: order.collectionDate.includes("T")
      ? isoInstantFromLocalDateTime(order.collectionDate)
      : `${order.collectionDate}T12:00:00.000Z`,
    valueString:
      line.resultValue != null && (!line.units || line.units === "—")
        ? line.resultValue
        : undefined,
    interpretation: interpretationCode(line.flag),
    note: line.comment ? [{ text: line.comment }] : undefined,
    referenceRange:
      line.referenceRange != null && line.referenceRange !== "—"
        ? [{ text: line.referenceRange }]
        : undefined,
  };

  if (line.resultValue != null && line.units && line.units !== "—") {
    obs.valueQuantity = {
      value: Number.isFinite(Number(line.resultValue))
        ? Number(line.resultValue)
        : undefined,
      unit: line.units,
      system: "http://unitsofmeasure.org",
      code: line.units,
    };
    if (obs.valueQuantity && (obs.valueQuantity as { value?: number }).value === undefined) {
      delete obs.valueQuantity;
      obs.valueString = line.resultValue;
    }
  }

  return obs;
}

export function buildDiagnosticReport(
  order: LabOrder,
  patient: Patient,
  observationRefs: string[],
  settings: LabSettings,
): Record<string, unknown> {
  const rid = toFhirId(`dr-${order.id}`);
  const pid = toFhirId(patient.id);
  const status =
    order.status === "Released"
      ? "final"
      : order.status === "Verified"
        ? "final"
        : "preliminary";

  return {
    resourceType: "DiagnosticReport",
    id: rid,
    meta: {
      profile: [FHIR_STRUCTURE_DEFINITION_DIAGNOSTIC_REPORT_V2],
    },
    identifier: [
      {
        system: `${resolveFhirBase(settings)}/NamingSystem/diagnostic-report`,
        value: order.id,
      },
    ],
    basedOn: [{ reference: `ServiceRequest/${toFhirId(order.id)}` }],
    status,
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v2-0074",
            code: "LAB",
            display: "Laboratory",
          },
        ],
      },
    ],
    code: {
      text: `Laboratory report — ${order.id}`,
    },
    subject: {
      reference: `Patient/${pid}`,
      display: patient.fullName,
    },
    effectiveDateTime: order.collectionDate.includes("T")
      ? isoInstantFromLocalDateTime(order.collectionDate)
      : `${order.collectionDate}T12:00:00.000Z`,
    result: observationRefs.map((ref) => ({ reference: ref })),
    conclusion:
      order.tests.some((t) => t.comment)
        ? order.tests.map((t) => t.comment).filter(Boolean).join(" ")
        : undefined,
  };
}

export function buildDemoTransactionBundle(store: DemoStore, orderId: string) {
  const order = store.orders.find((o) => o.id === orderId);
  const patient = order
    ? store.patients.find((p) => p.id === order.patientId)
    : undefined;
  if (!order || !patient) return null;

  const org = buildOrganization(store.settings);
  const pat = buildPatient(patient, store.settings);
  const sr = buildServiceRequest(order, patient, store.settings);
  const observations = order.tests.map((line) => ({
    fullUrl: `urn:uuid:obs-${toFhirId(order.id)}-${toFhirId(line.testId)}`,
    resource: buildObservation(order, patient, line, store.settings),
  }));
  const obsRefs = observations.map(
    (o) =>
      `Observation/${(o.resource as { id: string }).id}`,
  );
  const dr = buildDiagnosticReport(order, patient, obsRefs, store.settings);

  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    meta: {
      lastUpdated: new Date().toISOString(),
    },
    entry: [
      {
        fullUrl: `urn:uuid:org-${toFhirId(store.settings.fhirOrganizationId ?? "lab-org")}`,
        resource: org,
      },
      { fullUrl: `urn:uuid:patient-${toFhirId(patient.id)}`, resource: pat },
      {
        fullUrl: `urn:uuid:sr-${toFhirId(order.id)}`,
        resource: sr,
      },
      ...observations,
      {
        fullUrl: `urn:uuid:dr-${toFhirId(order.id)}`,
        resource: dr,
      },
    ],
  };
}
