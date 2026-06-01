import { TEST_CATALOGUE } from "@/data/catalogue";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { CatalogueTest } from "@/types";

function catalogueRow(laboratoryId: string, t: CatalogueTest) {
  return {
    laboratory_id: laboratoryId,
    id: t.id,
    name: t.name,
    loinc_code: t.loincCode ?? null,
    department: t.department,
    sample_type: t.sampleType,
    turnaround_time: t.turnaroundTime,
    price: t.price,
    reference_range: t.referenceRange ?? null,
    units: t.units ?? null,
    panel_analyte: t.panelAnalyte ?? false,
    test_kind: t.testKind ?? null,
    constituent_test_ids: t.constituentTestIds?.length
      ? [...t.constituentTestIds]
      : null,
    result_style: t.resultStyle ?? null,
  };
}

/** Upsert app catalogue rows so order_test_lines FK inserts succeed for this lab. */
export async function ensureCatalogueTestsForLaboratory(
  laboratoryId: string,
  extraTests?: CatalogueTest[],
): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) return;

  let custom = extraTests;
  if (!custom) {
    const { data } = await supabase
      .from("lab_settings")
      .select("custom_tests")
      .eq("laboratory_id", laboratoryId)
      .maybeSingle();
    if (data && Array.isArray((data as { custom_tests?: unknown }).custom_tests)) {
      custom = (data as { custom_tests: CatalogueTest[] }).custom_tests;
    } else {
      custom = [];
    }
  }

  const byId = new Map<string, CatalogueTest>();
  for (const t of TEST_CATALOGUE) byId.set(t.id, t);
  for (const t of custom) byId.set(t.id, t);

  const rows = [...byId.values()].map((t) => catalogueRow(laboratoryId, t));

  let { error } = await supabase.from("catalogue_tests").upsert(rows, {
    onConflict: "laboratory_id,id",
  });
  if (error && /test_kind|constituent_test_ids|result_style/i.test(error.message ?? "")) {
    const fallback = rows.map(
      ({ test_kind: _tk, constituent_test_ids: _c, result_style: _r, ...rest }) =>
        rest,
    );
    ({ error } = await supabase.from("catalogue_tests").upsert(fallback, {
      onConflict: "laboratory_id,id",
    }));
  }
  if (error) throw error;
}
