import { TEST_CATALOGUE } from "@/data/catalogue";
import type { CatalogueTest, OrderTestLine } from "@/types";

export type OrderTestGroup = {
  id: string;
  title: string;
  specimenType: string;
  department?: string;
  lines: OrderTestLine[];
};

const PROFILE_REPORT_TITLES: Record<string, string> = {
  "profile-fbc-5part": "Full Blood Count",
  "profile-ue": "U&E+Creatinine",
  "profile-lft": "Liver function tests",
  "profile-lipid": "Lipid profile",
};

const PROFILE_TESTS = TEST_CATALOGUE.filter(
  (t) => (t.constituentTestIds?.length ?? 0) > 0,
);

function profileTitle(profile: CatalogueTest): string {
  return PROFILE_REPORT_TITLES[profile.id] ?? profile.name.replace(/\s*profile.*$/i, "").trim();
}

function sortByConstituentOrder(
  lines: OrderTestLine[],
  constituentIds: readonly string[],
): OrderTestLine[] {
  const order = new Map(constituentIds.map((id, i) => [id, i]));
  return [...lines].sort(
    (a, b) => (order.get(a.testId) ?? 999) - (order.get(b.testId) ?? 999),
  );
}

/** Groups order lines into profiles (FBC, U&E, etc.) with remaining tests by department. */
export function groupOrderTests(lines: OrderTestLine[]): OrderTestGroup[] {
  const groups: OrderTestGroup[] = [];
  const assigned = new Set<string>();

  for (const profile of PROFILE_TESTS) {
    const constituents = profile.constituentTestIds ?? [];
    const memberLines = lines.filter((l) => constituents.includes(l.testId));
    if (memberLines.length === 0) continue;
    for (const line of memberLines) assigned.add(line.testId);
    groups.push({
      id: profile.id,
      title: profileTitle(profile),
      specimenType: profile.sampleType,
      department: profile.department,
      lines: sortByConstituentOrder(memberLines, constituents),
    });
  }

  const remaining = lines.filter((l) => !assigned.has(l.testId));
  const byDept = new Map<string, OrderTestLine[]>();
  for (const line of remaining) {
    const dep =
      TEST_CATALOGUE.find((t) => t.id === line.testId)?.department ?? "Other";
    const arr = byDept.get(dep) ?? [];
    arr.push(line);
    byDept.set(dep, arr);
  }

  for (const [dep, deptLines] of byDept) {
    groups.push({
      id: `standalone-${dep}`,
      title: dep,
      specimenType: deptLines[0]
        ? (TEST_CATALOGUE.find((t) => t.id === deptLines[0].testId)?.sampleType ??
          "—")
        : "—",
      department: dep,
      lines: deptLines,
    });
  }

  return groups;
}
