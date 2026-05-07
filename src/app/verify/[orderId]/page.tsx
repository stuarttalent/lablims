"use client";

import { useData } from "@/contexts/data-context";
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
import { Suspense } from "react";
import { CheckCircle2, FlaskConical, HelpCircle, Shield } from "lucide-react";
import { LabLoader } from "@/components/ui/lab-loader";
import { verifyResultToken } from "@/lib/verification-token";

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
  const { store, hydrated } = useData();

  const order = store.orders.find((o) => o.id === orderId);
  const patient = order
    ? store.patients.find((p) => p.id === order.patientId)
    : undefined;

  const instanceId = store.settings.limsInstanceId ?? "";
  const tokenOk =
    Boolean(order) &&
    Boolean(v) &&
    verifyResultToken(
      order!.id,
      order!.createdAt,
      instanceId,
      v,
    );

  const released =
    order &&
    tokenOk &&
    (order.status === "Released" ||
      order.tests.some((l) => l.resultStatus === "Released"));

  const verifiedBy =
    order?.tests.map((l) => l.verifiedBy).filter(Boolean)[0] ?? null;
  const verifiedOn =
    order?.tests.map((l) => l.verificationDate).filter(Boolean)[0] ?? null;

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <LabLoader message="Loading verification…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-950/5 via-background to-background px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <FlaskConical className="size-7" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {store.settings.labName}
          </h1>
          <p className="text-sm text-muted-foreground">Report verification</p>
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
              confirm accession details and workflow status when viewing from an
              authorised workstation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!order ? (
              <div className="space-y-3 text-muted-foreground">
                <p>
                  No matching accession was found on this device. That often
                  happens when you open the link on a phone or computer that is
                  not part of the laboratory network.
                </p>
                <p>
                  Compare the accession number above with the one printed on your
                  report. For confirmation or questions, contact{" "}
                  <span className="font-medium text-foreground">
                    {store.settings.labName}
                  </span>{" "}
                  using the telephone number on your document.
                </p>
              </div>
            ) : order && !v ? (
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
            ) : order && v && !tokenOk ? (
              <div className="space-y-3 text-muted-foreground">
                <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-50">
                  <HelpCircle className="size-5 shrink-0" />
                  <div>
                    <p className="font-medium">Could not confirm on this device</p>
                    <p className="mt-1 text-xs leading-relaxed opacity-90">
                      The security code on the link does not match this
                      workstation. Retain your printed report and contact the
                      laboratory using the number shown on the document.
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
                        This accession and security code match our issuance
                        records on this system. Compare patient name and
                        collection date with your printed copy.
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
                        <strong>{order!.status}</strong>. If your paper shows a
                        different stage, contact the laboratory.
                      </p>
                    </div>
                  </div>
                )}

                <dl className="grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Patient</dt>
                    <dd className="font-medium">{patient?.fullName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Collection</dt>
                    <dd className="font-medium">
                      {order!.collectionDate.replace("T", " ").slice(0, 16)}
                    </dd>
                  </div>
                  {verifiedBy ? (
                    <div>
                      <dt className="text-muted-foreground">Verified by</dt>
                      <dd className="font-medium">{verifiedBy}</dd>
                    </div>
                  ) : null}
                  {verifiedOn ? (
                    <div>
                      <dt className="text-muted-foreground">Verification date</dt>
                      <dd className="font-medium">{verifiedOn}</dd>
                    </div>
                  ) : null}
                </dl>
              </>
            )}

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">About this check</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>
                  The QR code contains your accession and a code bound to the
                  laboratory system that issued the report.
                </li>
                <li>
                  Full validation always includes comparing details on your
                  printed report with information provided directly by the lab.
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
