import { getTestById } from "@/data/catalogue";
import type { CumulativeTestMatrix } from "@/lib/cumulative-tests";
import type { Patient } from "@/types";

export type ParameterTrend =
  | "progression"
  | "regression"
  | "no_change"
  | "non_numeric"
  | "insufficient";

export type CumulativeAiInput = {
  patient?: Pick<Patient, "fullName" | "age" | "gender" | "dateOfBirth">;
  clinicalSymptoms?: string;
  clinicalHistory?: string;
  testRunLabel: string;
  visits: { orderId: string; date: string }[];
  parameters: {
    testId: string;
    testName: string;
    referenceRange: string;
    unit: string;
    values: { date: string; value: string; flag?: string }[];
    trend: ParameterTrend;
  }[];
};

function parseNumeric(value: string): number | null {
  const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Worsening vs improving based on analyte directionality. */
export function inferParameterTrend(
  testId: string,
  values: number[],
): ParameterTrend {
  if (values.length < 2) return "insufficient";
  const first = values[0]!;
  const last = values[values.length - 1]!;
  const span = Math.max(Math.abs(first), Math.abs(last), 1);
  const relativeChange = Math.abs(last - first) / span;
  if (relativeChange < 0.03) return "no_change";

  const higherIsWorse =
    /^(t-lipid-total|t-lipid-ldl|t-lipid-tg|t-glucose|t-hba1c|t-ue-urea|t-ue-creat|t-esr|t-crp)/.test(
      testId,
    ) || /hba1c|creat|urea|cholesterol(?!.*hdl)/i.test(testId);
  const higherIsBetter = /^t-lipid-hdl/.test(testId);

  const increased = last > first;

  if (higherIsWorse) return increased ? "progression" : "regression";
  if (higherIsBetter) return increased ? "regression" : "progression";
  return increased ? "progression" : "regression";
}

export function matrixToCumulativeAiInput(
  matrix: CumulativeTestMatrix,
  patient?: Patient,
): CumulativeAiInput {
  return {
    patient: patient
      ? {
          fullName: patient.fullName,
          age: patient.age,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth,
        }
      : undefined,
    clinicalSymptoms: patient?.clinicalSymptoms,
    clinicalHistory: patient?.clinicalHistory,
    testRunLabel: matrix.runLabel,
    visits: matrix.columns.map((c) => ({
      orderId: c.orderId,
      date: c.dateLabel,
    })),
    parameters: matrix.rows.map((row) => {
      const meta = getTestById(row.testId);
      const unit =
        meta?.units ??
        Object.values(row.byOrder).find((c) => c?.units)?.units ??
        "";
      const values = matrix.columns
        .map((col) => {
          const cell = row.byOrder[col.orderId];
          if (!cell) return null;
          return {
            date: col.dateLabel,
            value: cell.value,
            flag: cell.flag,
          };
        })
        .filter((v): v is NonNullable<typeof v> => v != null);

      const numeric = values
        .map((v) => parseNumeric(v.value))
        .filter((n): n is number => n != null);

      const trend =
        numeric.length >= 2
          ? inferParameterTrend(row.testId, numeric)
          : values.length >= 2
            ? "non_numeric"
            : "insufficient";

      return {
        testId: row.testId,
        testName: row.parameterName,
        referenceRange: row.referenceRange,
        unit,
        values,
        trend,
      };
    }),
  };
}

const TREND_LABEL: Record<ParameterTrend, string> = {
  progression: "progression (worsening)",
  regression: "regression (improving)",
  no_change: "no meaningful change",
  non_numeric: "qualitative / non-numeric — compare manually",
  insufficient: "insufficient visits to trend",
};

export function buildHeuristicCumulativeComment(
  input: CumulativeAiInput,
): string {
  const lines: string[] = [];
  lines.push(
    "Cumulative interpretive summary (decision-support only — not a formal diagnosis).",
  );

  if (input.patient) {
    lines.push(
      `Patient: ${input.patient.fullName} (${input.patient.gender}, age ${input.patient.age}). Test: ${input.testRunLabel}.`,
    );
  } else {
    lines.push(`Test: ${input.testRunLabel}.`);
  }

  lines.push(
    `Compared across ${input.visits.length} visits (${input.visits.map((v) => v.date).join(" → ")}).`,
  );

  const trended = input.parameters.filter(
    (p) => p.values.length >= 2 && p.trend !== "insufficient",
  );

  if (trended.length === 0) {
    lines.push(
      "Not enough numeric repeat measurements to assess progression or regression.",
    );
  } else {
    lines.push("Parameter trends:");
    for (const p of trended) {
      const seq = p.values
        .map((v) => `${v.value}${p.unit ? ` ${p.unit}` : ""}`)
        .join(" → ");
      const flags = p.values
        .filter((v) => v.flag && v.flag !== "Normal")
        .map((v) => `${v.date}: ${v.flag}`)
        .join("; ");
      lines.push(
        `• ${p.testName}: ${TREND_LABEL[p.trend]}. Values ${seq}${flags ? `. Flags — ${flags}` : ""}.`,
      );
    }

    const worsening = trended.filter((p) => p.trend === "progression");
    const improving = trended.filter((p) => p.trend === "regression");
    const stable = trended.filter((p) => p.trend === "no_change");

    if (worsening.length > improving.length && worsening.length > 0) {
      lines.push(
        "Overall pattern: more parameters show progression than regression across the interval.",
      );
    } else if (improving.length > worsening.length && improving.length > 0) {
      lines.push(
        "Overall pattern: more parameters show regression (improvement) than progression.",
      );
    } else if (stable.length === trended.length) {
      lines.push("Overall pattern: largely stable between first and latest visit.");
    } else {
      lines.push(
        "Overall pattern: mixed — some parameters improved, others worsened, or remained stable.",
      );
    }
  }

  lines.push(
    "Interpret in full clinical context; this summary does not replace professional judgment.",
  );
  return lines.join("\n\n");
}
