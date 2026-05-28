"use client";

import { getTestById } from "@/data/catalogue";
import { useData } from "@/contexts/data-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { InvoiceCurrency, PaymentMethod, PaymentStatus } from "@/types";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { MedicalAidDetailsForm } from "@/components/billing/medical-aid-details-form";
import {
  emptyMedicalAidDetails,
  hasMedicalAidDetails,
  resolvePrincipalMember,
} from "@/lib/medical-aid";
import { resolveTestPrice } from "@/lib/pricing";
import { formatMoney } from "@/lib/currency";
import type { MedicalAidDetails } from "@/types";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { store, updateInvoice } = useData();
  const inv = store.invoices.find((i) => i.id === params.id);

  if (!inv) notFound();

  const patient = store.patients.find((p) => p.id === inv.patientId);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoice</h1>
          <p className="text-sm text-muted-foreground font-mono">
            {inv.invoiceNumber}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {inv.orderId ? (
            <Button variant="secondary" asChild>
              <Link href={`/orders/${inv.orderId}`}>Open test order</Link>
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print / PDF
          </Button>
          <Button variant="outline" asChild>
            <Link href="/billing">Back</Link>
          </Button>
        </div>
      </div>

      <Card className="no-print border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Payment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={inv.paymentStatus}
              onValueChange={(v) =>
                updateInvoice(inv.id, { paymentStatus: v as PaymentStatus })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Method</Label>
            <Select
              value={inv.paymentMethod ?? "none"}
              onValueChange={(v) => {
                const method = v === "none" ? undefined : (v as PaymentMethod);
                updateInvoice(inv.id, {
                  paymentMethod: method,
                  ...(method === "Medical Aid" && !inv.medicalAidDetails
                    ? { medicalAidDetails: emptyMedicalAidDetails() }
                    : {}),
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
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
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={inv.currency}
              onValueChange={(v) =>
                v &&
                updateInvoice(inv.id, {
                  currency: v as InvoiceCurrency,
                })
              }
            >
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
            <Label>Receipt number</Label>
            <Input
              value={inv.receiptNumber ?? ""}
              onChange={(e) =>
                updateInvoice(inv.id, {
                  receiptNumber: e.target.value || undefined,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {inv.paymentMethod === "Medical Aid" ||
      hasMedicalAidDetails(inv.medicalAidDetails) ? (
        <Card className="no-print border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Medical aid claim</CardTitle>
          </CardHeader>
          <CardContent>
            <MedicalAidDetailsForm
              value={inv.medicalAidDetails ?? emptyMedicalAidDetails()}
              onChange={(next: MedicalAidDetails) =>
                updateInvoice(inv.id, { medicalAidDetails: next })
              }
              patientFullName={patient?.fullName ?? ""}
            />
          </CardContent>
        </Card>
      ) : null}

      <div
        id="invoice-print"
        className="relative overflow-hidden rounded-xl border border-border/70 bg-card p-6 shadow-sm print:shadow-none print:border-0 print:w-[210mm] print:min-h-[297mm]"
      >
        {store.settings.letterheadA4PdfDataUrl ? (
          <div className="pointer-events-none absolute inset-0 z-0">
            <object
              data={store.settings.letterheadA4PdfDataUrl}
              type="application/pdf"
              className="h-full w-full"
              aria-label="A4 letterhead"
            />
          </div>
        ) : null}
        <div className="relative z-10 flex items-start justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <p className="text-lg font-semibold tracking-tight">
              {store.settings.labName}
            </p>
            <p className="text-xs text-muted-foreground">
              {store.settings.address}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {store.settings.phone} · {store.settings.email}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono font-medium">{inv.invoiceNumber}</p>
            <p className="text-muted-foreground">{inv.createdAt}</p>
            <Badge className="mt-2" variant="secondary">
              {inv.paymentStatus}
            </Badge>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Patient</p>
            <p className="font-medium">{patient?.fullName ?? inv.patientId}</p>
            <p className="text-xs text-muted-foreground">{inv.patientId}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Linked order</p>
            <p className="font-medium">{inv.orderId ?? "—"}</p>
          </div>
        </div>

        {hasMedicalAidDetails(inv.medicalAidDetails) && inv.medicalAidDetails ? (
          <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm grid gap-2 sm:grid-cols-2">
            <p className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Medical aid
            </p>
            <div>
              <p className="text-xs text-muted-foreground">Society</p>
              <p className="font-medium">{inv.medicalAidDetails.society || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="font-medium">{inv.medicalAidDetails.plan || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Member number</p>
              <p className="font-mono font-medium">
                {inv.medicalAidDetails.memberNumber || "—"}
                {inv.medicalAidDetails.suffix
                  ? ` / ${inv.medicalAidDetails.suffix}`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Principal member</p>
              <p className="font-medium">
                {resolvePrincipalMember(inv.medicalAidDetails, patient?.fullName ?? "") ||
                  "—"}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-2">
          <p className="text-sm font-medium">Tests billed</p>
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60 text-sm">
            {inv.testIds.map((tid) => {
              const t = getTestById(tid);
              const line = resolveTestPrice(tid, store.settings);
              return (
                <li key={tid} className="flex justify-between gap-3 px-3 py-2">
                  <span>{t?.name ?? tid}</span>
                  <span className="font-mono">{formatMoney(line, inv.currency)}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-between text-sm pt-2">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatMoney(inv.subtotal, inv.currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span>- {formatMoney(inv.discount, inv.currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatMoney(inv.tax, inv.currency)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold border-t border-border/60 pt-2">
            <span>Total</span>
            <span>{formatMoney(inv.total, inv.currency)}</span>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-muted/40 border border-border/60 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Terms</p>
          <p className="mt-1">{store.settings.reportFooter}</p>
        </div>
      </div>
    </div>
  );
}
