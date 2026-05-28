import { TEST_CATALOGUE } from "@/data/catalogue";
import { getSupabaseClient } from "@/lib/supabase/client";

/** Upsert app catalogue rows so order_test_lines FK inserts succeed for this lab. */
export async function ensureCatalogueTestsForLaboratory(
  laboratoryId: string,
): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) return;

  const rows = TEST_CATALOGUE.map((t) => ({
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
  }));

  const { error } = await supabase.from("catalogue_tests").upsert(rows, {
    onConflict: "laboratory_id,id",
  });
  if (error) throw error;
}
