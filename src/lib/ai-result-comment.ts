import type { LabOrder, Patient } from "@/types";
import { getTestById } from "@/data/catalogue";

export type AiCommentInput = {
  patient?: Pick<Patient, "fullName" | "age" | "gender" | "dateOfBirth">;
  clinicalSymptoms?: string;
  orderNotes?: string;
  results: {
    testId: string;
    testName: string;
    resultValue?: string;
    units?: string;
    referenceRange?: string;
    flag?: string;
    comment?: string;
  }[];
};

/** Deterministic narrative when no LLM key is configured (demo / offline). */
export function buildHeuristicResultComment(input: AiCommentInput): string {
  const { patient, clinicalSymptoms, orderNotes } = input;
  const lines: string[] = [];

  lines.push("Laboratory narrative (decision-support only — not a formal diagnosis).");

  if (patient) {
    lines.push(
      `Patient: ${patient.fullName} (${patient.gender}, age ${patient.age}, DOB ${patient.dateOfBirth}).`,
    );
  }

  const ctx = [clinicalSymptoms?.trim(), orderNotes?.trim()].filter(Boolean).join(" ");
  if (ctx) {
    lines.push(`Clinical notes on file: ${ctx}`);
  }

  const abnormal = input.results.filter((r) => r.flag && r.flag !== "Normal");
  const normal = input.results.length - abnormal.length;

  if (abnormal.length > 0) {
    lines.push(
      `Key abnormals (${abnormal.length}): ${abnormal
        .map(
          (r) =>
            `${r.testName} ${r.resultValue ?? "—"} ${r.units ?? ""} [${r.flag}]`.trim(),
        )
        .join("; ")}.`,
    );
    lines.push(
      "Correlation with symptoms and repeat or follow-up testing may be appropriate depending on clinical context.",
    );
  }

  if (normal > 0 && abnormal.length === 0) {
    lines.push(
      `All reported analytes are within the documented reference expectations for this interface (${normal} results reviewed).`,
    );
  }

  if (input.results.length === 0) {
    lines.push("No numeric results were submitted for synthesis.");
  }

  lines.push(
    "This text does not replace professional judgment. Please interpret results in the full clinical picture.",
  );

  return lines.join(" ");
}

export function orderToAiCommentPayload(
  order: LabOrder,
  patient: Patient | undefined,
): AiCommentInput {
  return {
    patient: patient
      ? {
          fullName: patient.fullName,
          age: patient.age,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth,
        }
      : undefined,
    clinicalSymptoms: order.clinicalSymptoms,
    orderNotes: order.notes,
    results: order.tests.map((t) => {
      const meta = getTestById(t.testId);
      return {
        testId: t.testId,
        testName: meta?.name ?? t.testId,
        resultValue: t.resultValue,
        units: t.units ?? meta?.units,
        referenceRange: t.referenceRange ?? meta?.referenceRange,
        flag: t.flag,
        comment: t.comment,
      };
    }),
  };
}
