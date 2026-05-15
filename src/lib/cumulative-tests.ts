import { getTestById } from "@/data/catalogue";
import type { LabOrder, ResultFlag, TestDepartment } from "@/types";

const DEPT_ORDER: TestDepartment[] = [
  "Haematology",
  "Chemistry",
  "Microbiology",
  "Serology/Immunology",
  "Molecular",
];

export interface CumulativeColumn {
  orderId: string;
  label: string;
  collectionDate: string;
}

export interface CumulativeCell {
  value: string;
  flag?: ResultFlag;
}

export interface CumulativeRow {
  testId: string;
  parameterName: string;
  department: TestDepartment;
  units: string;
  referenceRange: string;
  /** Keyed by order id. */
  byOrder: Record<string, CumulativeCell | null>;
}

export interface CumulativeTestMatrix {
  columns: CumulativeColumn[];
  rows: CumulativeRow[];
  departments: TestDepartment[];
}

function formatColumnLabel(collectionDate: string): string {
  const raw = collectionDate.slice(0, 10);
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return raw;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function orderHasResults(order: LabOrder): boolean {
  return order.tests.some(
    (t) => t.resultValue != null && String(t.resultValue).trim() !== "",
  );
}

function departmentFor(testId: string): TestDepartment {
  return getTestById(testId)?.department ?? "Chemistry";
}

function compareRows(a: CumulativeRow, b: CumulativeRow): number {
  const da = DEPT_ORDER.indexOf(a.department);
  const db = DEPT_ORDER.indexOf(b.department);
  if (da !== db) return da - db;
  return a.parameterName.localeCompare(b.parameterName);
}

/** Build a parameter × visit matrix from a patient's orders (oldest column left). */
export function buildCumulativeTestMatrix(
  orders: LabOrder[],
): CumulativeTestMatrix | null {
  const withResults = orders.filter(orderHasResults);
  if (withResults.length === 0) return null;

  const sorted = [...withResults].sort((a, b) =>
    a.collectionDate.localeCompare(b.collectionDate),
  );

  const columns: CumulativeColumn[] = sorted.map((o) => ({
    orderId: o.id,
    label: formatColumnLabel(o.collectionDate),
    collectionDate: o.collectionDate,
  }));

  const testIds = new Set<string>();
  for (const order of sorted) {
    for (const line of order.tests) {
      if (line.resultValue != null && String(line.resultValue).trim() !== "") {
        testIds.add(line.testId);
      }
    }
  }

  const rows: CumulativeRow[] = [...testIds].map((testId) => {
    const meta = getTestById(testId);
    const byOrder: Record<string, CumulativeCell | null> = {};
    let units = meta?.units ?? "—";
    let referenceRange = meta?.referenceRange ?? "—";

    for (const order of sorted) {
      const line = order.tests.find((t) => t.testId === testId);
      if (
        line?.resultValue != null &&
        String(line.resultValue).trim() !== ""
      ) {
        byOrder[order.id] = {
          value: line.resultValue,
          flag: line.flag,
        };
        if (line.units) units = line.units;
        if (line.referenceRange) referenceRange = line.referenceRange;
      } else {
        byOrder[order.id] = null;
      }
    }

    return {
      testId,
      parameterName: meta?.name ?? testId,
      department: departmentFor(testId),
      units,
      referenceRange,
      byOrder,
    };
  });

  rows.sort(compareRows);

  const departments = DEPT_ORDER.filter((dep) =>
    rows.some((r) => r.department === dep),
  );

  return { columns, rows, departments };
}
