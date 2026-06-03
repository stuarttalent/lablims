import { getCatalogueTests } from "@/lib/catalogue-access";
import { groupOrderTests } from "@/lib/group-order-tests";
import type { DemoStore, Invoice, LabOrder, Patient } from "@/types";

export function formatSlipDateTime(iso: string): string {
  const d = iso.includes("T") ? iso : `${iso}T00:00:00`;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return iso.replace("T", " ");
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function findOrderInvoice(
  store: DemoStore,
  orderId: string,
): Invoice | undefined {
  return store.invoices.find((i) => i.orderId === orderId);
}

export function paymentMethodLabel(
  store: DemoStore,
  order: LabOrder,
  patient?: Patient,
): string {
  const inv = findOrderInvoice(store, order.id);
  if (inv?.paymentMethod) return inv.paymentMethod;
  if (inv?.medicalAidDetails?.society?.trim()) {
    return inv.medicalAidDetails.society;
  }
  const aid = patient?.medicalAid?.trim();
  if (aid && aid !== "Self-pay") return aid;
  return "—";
}

export function requestedTestsLabel(
  order: LabOrder,
  settings: DemoStore["settings"],
): string {
  const groups = groupOrderTests(order.tests, settings);
  if (groups.length > 0) {
    return groups.map((g) => g.title).join(", ");
  }
  const catalogue = getCatalogueTests(settings);
  return order.tests
    .map((t) => catalogue.find((c) => c.id === t.testId)?.name ?? t.testId)
    .join(", ");
}

export function clinicalDataText(order: LabOrder, patient?: Patient): string {
  const parts = [
    order.clinicalSymptoms?.trim(),
    patient?.clinicalSymptoms?.trim(),
    order.notes?.trim(),
    patient?.clinicalHistory?.trim(),
  ].filter(Boolean);
  return parts.length > 0 ? [...new Set(parts)].join(" · ") : "—";
}
