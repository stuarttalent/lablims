import { TEST_CATALOGUE } from "@/data/catalogue";
import type { CatalogueTest, CatalogueTestOverride, LabSettings } from "@/types";

type SettingsSlice = Pick<LabSettings, "customTests" | "catalogueOverrides">;

export function getCatalogueTests(settings?: SettingsSlice): CatalogueTest[] {
  const builtins = TEST_CATALOGUE.map((t) => {
    const o = settings?.catalogueOverrides?.[t.id];
    if (!o?.testKind) return t;
    const kind = o.testKind;
    const patched = { ...t, testKind: kind };
    if (kind === "microbiology") patched.resultStyle = "microbiology_mcs";
    else if (kind === "qualitative") patched.resultStyle = "qualitative";
    return patched;
  });
  const custom = settings?.customTests ?? [];
  const seen = new Set(builtins.map((t) => t.id));
  const merged = [...builtins];
  for (const t of custom) {
    if (!seen.has(t.id)) merged.push(t);
  }
  return merged;
}

export function getTestById(
  id: string,
  settings?: SettingsSlice,
): CatalogueTest | undefined {
  const custom = settings?.customTests?.find((t) => t.id === id);
  if (custom) return custom;
  const base = TEST_CATALOGUE.find((t) => t.id === id);
  if (!base) return undefined;
  const o = settings?.catalogueOverrides?.[id];
  if (!o?.testKind) return base;
  const kind = o.testKind;
  const patched = { ...base, testKind: kind };
  if (kind === "microbiology") patched.resultStyle = "microbiology_mcs";
  else if (kind === "qualitative") patched.resultStyle = "qualitative";
  return patched;
}

export function getCatalogueOverride(
  testId: string,
  settings?: SettingsSlice,
): CatalogueTestOverride | undefined {
  return settings?.catalogueOverrides?.[testId];
}

/** Tests on order / invoice pickers (excludes panel-only analytes). */
export function testsForOrderPicker(settings?: SettingsSlice): CatalogueTest[] {
  return getCatalogueTests(settings).filter((t) => !t.panelAnalyte);
}

export function nextCustomTestId(existing: CatalogueTest[]): string {
  const nums = existing
    .map((t) => t.id.match(/^custom-(\d+)$/))
    .filter(Boolean)
    .map((m) => parseInt(m![1], 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `custom-${max + 1}`;
}
