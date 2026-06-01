"use client";

import { getTestById, testsForOrderPicker } from "@/data/catalogue";
import { useData } from "@/contexts/data-context";
import { resolveTestPrice } from "@/lib/pricing";
import type { TestDepartment } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MedicalAidDetailsForm } from "@/components/billing/medical-aid-details-form";
import { emptyMedicalAidDetails, hasMedicalAidDetails } from "@/lib/medical-aid";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import type { InvoiceCurrency, MedicalAidDetails, PaymentMethod } from "@/types";

const DEPT_ORDER: TestDepartment[] = [
  "Haematology",
  "Chemistry",
  "Microbiology",
  "Serology/Immunology",
  "Molecular",
];

export default function NewInvoicePage() {
  const { store, addInvoice } = useData();
  const router = useRouter();
  const sp = useSearchParams();
  const [patientId, setPatientId] = useState(sp.get("patient") ?? "");
  const [orderId, setOrderId] = useState("none");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [currency, setCurrency] = useState<InvoiceCurrency>("USD");
  const [medicalAid, setMedicalAid] = useState<MedicalAidDetails>(() =>
    emptyMedicalAidDetails(),
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const patient = useMemo(
    () => store.patients.find((p) => p.id === patientId),
    [store.patients, patientId],
  );

  useEffect(() => {
    if (!patient) return;
    setMedicalAid((ma) => ({
      ...ma,
      principalMember: ma.principalSameAsPatient ? patient.fullName : ma.principalMember,
      society:
        ma.society ||
        (patient.medicalAid && patient.medicalAid !== "Self-pay" ? patient.medicalAid : ""),
    }));
  }, [patient?.id, patient?.fullName, patient?.medicalAid]);

  const selectedIds = useMemo(() => {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    return [...new Set(ids)];
  }, [selected]);

  const pickableCatalogue = useMemo(
    () => testsForOrderPicker(store.settings),
    [store.settings],
  );

  const preview = useMemo(() => {
    const expandedIds = [
      ...new Set(
        selectedIds.flatMap(
          (id) => getTestById(id, store.settings)?.constituentTestIds ?? [id],
        ),
      ),
    ];
    const sub = expandedIds.reduce(
      (s, id) => s + resolveTestPrice(id, store.settings),
      0,
    );
    const disc = parseFloat(discount || "0") || 0;
    const tx = parseFloat(tax || "0") || 0;
    return { subtotal: sub, total: Math.max(0, sub - disc + tx) };
  }, [selectedIds, store.settings, discount, tax]);

  function toggle(id: string, checked: boolean) {
    setSelected((s) => ({ ...s, [id]: checked }));
  }

  function submit() {
    if (!patientId) {
      toast.error("Select a patient.");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Select at least one line item.");
      return;
    }
    if (paymentMethod === "Medical Aid") {
      if (!medicalAid.society.trim() || !medicalAid.memberNumber.trim()) {
        toast.error("Enter medical aid society and member number.");
        return;
      }
    }
    const aidPayload =
      paymentMethod === "Medical Aid" || hasMedicalAidDetails(medicalAid)
        ? {
            ...medicalAid,
            principalMember: medicalAid.principalSameAsPatient
              ? (patient?.fullName ?? medicalAid.principalMember)
              : medicalAid.principalMember,
          }
        : undefined;
    const inv = addInvoice({
      patientId,
      orderId: orderId !== "none" ? orderId : undefined,
      testIds: selectedIds,
      discount: parseFloat(discount || "0") || 0,
      tax: parseFloat(tax || "0") || 0,
      paymentMethod: paymentMethod || undefined,
      currency,
      medicalAidDetails: aidPayload,
    });
    toast.success("Invoice generated.");
    router.push(`/billing/${inv.id}`);
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
        <p className="text-sm text-muted-foreground">
          Price list honours optional overrides from Settings.
        </p>
      </div>
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Header</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Patient</Label>
            <Select
              value={patientId}
              onValueChange={(v) => setPatientId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose patient…" />
              </SelectTrigger>
              <SelectContent>
                {store.patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName} · {p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Link order (optional)</Label>
            <Select
              value={orderId}
              onValueChange={(v) => setOrderId(v ?? "none")}
            >
              <SelectTrigger>
                <SelectValue placeholder="No linked order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked order</SelectItem>
                {store.orders
                  .filter((o) => !patientId || o.patientId === patientId)
                  .map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.id} · {o.status}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Discount ({currency})</Label>
            <Input value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tax / levy ({currency})</Label>
            <Input value={tax} onChange={(e) => setTax(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Invoice currency</Label>
            <Select value={currency} onValueChange={(v) => v && setCurrency(v as InvoiceCurrency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="ZWL">ZWL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Default payment method (optional)</Label>
            <Select
              value={paymentMethod || "none"}
              onValueChange={(v) =>
                setPaymentMethod(
                  !v || v === "none" ? "" : (v as PaymentMethod),
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Unset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unset</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="EcoCash">EcoCash</SelectItem>
                <SelectItem value="Swipe">Swipe</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Medical Aid">Medical Aid</SelectItem>
                <SelectItem value="Corporate accounts">Corporate accounts</SelectItem>
                <SelectItem value="Staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 rounded-xl border border-dashed p-3 text-sm">
            <p>
              Subtotal: <strong>{currency} {preview.subtotal.toFixed(2)}</strong> · Total:{" "}
              <strong>{currency} {preview.total.toFixed(2)}</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {paymentMethod === "Medical Aid" ? (
        <MedicalAidDetailsForm
          value={medicalAid}
          onChange={setMedicalAid}
          patientFullName={patient?.fullName ?? ""}
        />
      ) : null}

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {DEPT_ORDER.map((dep, idx) => {
            const items = pickableCatalogue.filter((t) => t.department === dep);
            if (items.length === 0) return null;
            return (
              <div key={dep}>
                {idx > 0 ? <Separator className="mb-6" /> : null}
                <p className="text-sm font-medium mb-3">{dep}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-start gap-3 rounded-xl border border-border/70 p-3 hover:bg-muted/40 cursor-pointer"
                    >
                      <Checkbox
                        checked={!!selected[t.id]}
                        onCheckedChange={(c) => toggle(t.id, c === true)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium block">{t.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ${resolveTestPrice(t.id, store.settings).toFixed(0)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={submit}>Generate invoice</Button>
        <Button variant="outline" asChild>
          <Link href="/billing">Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
