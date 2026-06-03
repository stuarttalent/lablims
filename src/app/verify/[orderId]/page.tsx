"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, FlaskConical, HelpCircle, Shield } from "lucide-react";
import { LabLoader } from "@/components/ui/lab-loader";

type VerifyLab = {
  labName: string;
  tagline?: string;
  phone?: string;
  email?: string;
  registrationNumber?: string;
};

type VerifyOrder = {
  id: string;
  status: string;
  collectionDate: string;
  patientName: string | null;
  tokenValid: boolean;
  released: boolean;
  verifiedBy: string | null;
  verifiedOn: string | null;
};

type VerifyPayload = {
  lab: VerifyLab;
  order: VerifyOrder | null;
  error?: string;
};

export default function PublicVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/40">
          <LabLoader message="Verifying report…" />
        </div>
      }
    >
      <PublicVerifyInner />
    </Suspense>
  );
}

function PublicVerifyInner() {
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const orderId = decodeURIComponent(params.orderId ?? "");
  const v = searchParams.get("v");
  const lims = searchParams.get("lims");

  const [payload, setPayload] = useState<VerifyPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      setPayload(null);

      const qs = new URLSearchParams();
      if (v) qs.set("v", v);
      if (lims?.trim()) qs.set("lims", lims);

      try {
        const res = await fetch(
          `/api/verify/${encodeURIComponent(orderId)}?${qs.toString()}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as VerifyPayload & { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Verification lookup failed.");
        }
        if (!cancelled) setPayload(data);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Verification lookup failed.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [orderId, v, lims]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <LabLoader message="Loading verification…" />
      </div>
    );
  }

  const labName = payload?.lab.labName ?? "Laboratory";
  const order = payload?.order ?? null;
  const tokenOk = Boolean(order?.tokenValid);
  const released = Boolean(order?.released);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-950/5 via-background to-background px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <FlaskConical className="size-7" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{labName}</h1>
          {payload?.lab.tagline ? (
            <p className="text-sm text-muted-foreground">{payload.lab.tagline}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Report verification</p>
          )}
        </div>

        <Card className="border-border shadow-md">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="size-5 text-teal-600" />
                Accession
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {orderId}
              </Badge>
            </div>
            <CardDescription>
              Linked from the QR code on official laboratory reports. Use it to
              confirm accession details and workflow status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {loadError ? (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-50">
                <HelpCircle className="size-5 shrink-0" />
                <div>
                  <p className="font-medium">Could not verify</p>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">{loadError}</p>
                </div>
              </div>
            ) : !order ? (
              <div className="space-y-3 text-muted-foreground">
                <p>
                  No matching accession was found for{" "}
                  <span className="font-medium text-foreground">{labName}</span>.
                </p>
                <p>
                  Compare the accession number above with the one printed on your
                  report. For confirmation, contact{" "}
                  <span className="font-medium text-foreground">{labName}</span>
                  {payload?.lab.phone ? (
                    <>
                      {" "}
                      at <span className="font-medium text-foreground">{payload.lab.phone}</span>
                    </>
                  ) : null}
                  .
                </p>
              </div>
            ) : !v ? (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-50">
                <HelpCircle className="size-5 shrink-0" />
                <div>
                  <p className="font-medium">Incomplete verification link</p>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">
                    Scan the full QR code printed on your report, or open the PDF
                    from the laboratory portal so the security code is included.
                  </p>
                </div>
              </div>
            ) : !tokenOk ? (
              <div className="space-y-3 text-muted-foreground">
                <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-50">
                  <HelpCircle className="size-5 shrink-0" />
                  <div>
                    <p className="font-medium">Could not confirm this report</p>
                    <p className="mt-1 text-xs leading-relaxed opacity-90">
                      The security code does not match records for {labName}. Retain
                      your printed report and contact the laboratory using the number
                      on the document.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {released ? (
                  <div className="flex gap-3 rounded-lg border border-teal-200 bg-teal-50/80 p-3 text-teal-950 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-50">
                    <CheckCircle2 className="size-5 shrink-0" />
                    <div>
                      <p className="font-medium">Authenticity confirmed</p>
                      <p className="mt-1 text-xs leading-relaxed opacity-90">
                        This accession and security code match issuance records for{" "}
                        {labName}. Compare patient name and collection date with your
                        printed copy.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-50">
                    <HelpCircle className="size-5 shrink-0" />
                    <div>
                      <p className="font-medium">Report not yet finalised</p>
                      <p className="mt-1 text-xs leading-relaxed opacity-90">
                        Current workflow status:{" "}
                        <strong>{order.status}</strong>. If your paper shows a
                        different stage, contact {labName}.
                      </p>
                    </div>
                  </div>
                )}

                <dl className="grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Patient</dt>
                    <dd className="font-medium">{order.patientName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Collection</dt>
                    <dd className="font-medium">
                      {order.collectionDate.replace("T", " ").slice(0, 16)}
                    </dd>
                  </div>
                  {order.verifiedBy ? (
                    <div>
                      <dt className="text-muted-foreground">Verified by</dt>
                      <dd className="font-medium">{order.verifiedBy}</dd>
                    </div>
                  ) : null}
                  {order.verifiedOn ? (
                    <div>
                      <dt className="text-muted-foreground">Verification date</dt>
                      <dd className="font-medium">{order.verifiedOn}</dd>
                    </div>
                  ) : null}
                </dl>
              </>
            )}

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">About this check</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>
                  The QR code contains your accession, a laboratory identifier, and a
                  code bound to the system that issued the report.
                </li>
                <li>
                  Laboratory details are loaded from {labName}&apos;s official records.
                </li>
              </ul>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/">Return to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
