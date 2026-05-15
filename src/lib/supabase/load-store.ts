import { createClient } from "@/lib/supabase/client";
import {
  buildProfileMaps,
  mapDoctor,
  mapInvoice,
  mapOrder,
  mapOrderLine,
  mapPatient,
  mapSettings,
  emptyStoreWithSettings,
} from "@/lib/supabase/mappers";
import { createInitialStore } from "@/data/seed";
import {
  buildSupabaseContext,
  registerStoreUuids,
} from "@/lib/supabase/persist";
import type { SupabaseContext } from "@/lib/supabase/persist";
import type { DemoStore } from "@/types";

export type LoadedSupabaseStore = {
  store: DemoStore;
  ctx: SupabaseContext;
};

export async function loadStoreFromSupabase(
  laboratoryId: string,
): Promise<LoadedSupabaseStore> {
  const supabase = createClient();

  const [
    settingsRes,
    patientsRes,
    doctorsRes,
    ordersRes,
    linesRes,
    invoicesRes,
    profilesRes,
  ] = await Promise.all([
    supabase
      .from("lab_settings")
      .select("*")
      .eq("laboratory_id", laboratoryId)
      .maybeSingle(),
    supabase.from("patients").select("*").eq("laboratory_id", laboratoryId),
    supabase.from("doctors").select("*").eq("laboratory_id", laboratoryId),
    supabase.from("lab_orders").select("*").eq("laboratory_id", laboratoryId),
    supabase
      .from("order_test_lines")
      .select("*")
      .eq("laboratory_id", laboratoryId),
    supabase.from("invoices").select("*").eq("laboratory_id", laboratoryId),
    supabase.from("profiles").select("id, legacy_id").eq("laboratory_id", laboratoryId),
  ]);

  const err =
    settingsRes.error ??
    patientsRes.error ??
    doctorsRes.error ??
    ordersRes.error ??
    linesRes.error ??
    invoicesRes.error ??
    profilesRes.error;
  if (err) throw err;

  const settings = mapSettings(settingsRes.data);
  const profileMaps = buildProfileMaps(profilesRes.data ?? []);

  const patientUuidToAppId = new Map<string, string>();
  const patients = (patientsRes.data ?? []).map((row) => {
    const p = mapPatient(row);
    patientUuidToAppId.set(row.id, p.id);
    return p;
  });

  const doctors = (doctorsRes.data ?? []).map(mapDoctor);
  const orderUuidToAppId = new Map<string, string>();

  const linesByOrder = new Map<string, ReturnType<typeof mapOrderLine>[]>();
  for (const line of linesRes.data ?? []) {
    const mapped = mapOrderLine(line);
    const arr = linesByOrder.get(line.order_id) ?? [];
    arr.push(mapped);
    linesByOrder.set(line.order_id, arr);
  }

  const orders = (ordersRes.data ?? []).map((row) => {
    const lines = linesByOrder.get(row.id) ?? [];
    const order = mapOrder(row, patientUuidToAppId, profileMaps, lines);
    orderUuidToAppId.set(row.id, order.id);
    return order;
  });

  const invoices = (invoicesRes.data ?? []).map((row) =>
    mapInvoice(row, patientUuidToAppId, orderUuidToAppId),
  );

  const base = emptyStoreWithSettings(settings);
  const store: DemoStore = {
    ...base,
    patients,
    doctors: doctors.length > 0 ? doctors : base.doctors,
    orders,
    invoices,
    version: settingsRes.data?.store_version ?? 1,
  };

  const ctx = buildSupabaseContext(laboratoryId, profileMaps, store);
  registerStoreUuids(ctx, {
    patients: patientsRes.data ?? [],
    orders: ordersRes.data ?? [],
  });

  return { store, ctx };
}

export async function fetchProfileForUser(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Bootstrap empty lab row if migrations were not seeded. */
export async function ensureLaboratoryForUser(userId: string): Promise<string> {
  const profile = await fetchProfileForUser(userId);
  if (profile?.laboratory_id) return profile.laboratory_id;

  const supabase = createClient();
  const { data: lab, error: labErr } = await supabase
    .from("laboratories")
    .insert({ slug: "main", name: "ALS Health Laboratory" })
    .select("id")
    .single();
  if (labErr) throw labErr;

  const defaults = createInitialStore().settings;
  await supabase.from("lab_settings").insert({
    laboratory_id: lab.id,
    lab_name: defaults.labName,
    tagline: defaults.tagline,
    address: defaults.address,
    phone: defaults.phone,
    email: defaults.email,
    registration_number: defaults.registrationNumber,
    report_footer: defaults.reportFooter,
    departments: defaults.departments,
    fhir_base_url: defaults.fhirBaseUrl,
    fhir_organization_id: defaults.fhirOrganizationId,
    lims_instance_id: defaults.limsInstanceId ?? crypto.randomUUID(),
  });

  await supabase
    .from("profiles")
    .update({ laboratory_id: lab.id })
    .eq("id", userId);

  return lab.id;
}
