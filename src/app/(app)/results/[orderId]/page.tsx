"use client";

import { getTestById } from "@/data/catalogue";
import { useData } from "@/contexts/data-context";
import { useAuth } from "@/contexts/auth-context";
import {
  canEnterResults,
  canReleaseResults,
  canVerifyResults,
} from "@/lib/permissions";
import type { LineResultStatus, ResultFlag } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DemoDisclaimer } from "@/components/demo/demo-disclaimer";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const FLAGS: ResultFlag[] = ["Normal", "Low", "High", "Critical"];

export default function ResultsWorkspacePage() {
  const params = useParams<{ orderId: string }>();
  const { store, updateOrderLine, updateOrder } = useData();
  const { user } = useAuth();
  const order = store.orders.find((o) => o.id === params.orderId);

  if (!order) notFound();

  const patient = store.patients.find((p) => p.id === order.patientId);
  const readOnly = user?.role === "doctor";

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2 items-center">
            <h1 className="text-2xl font-semibold tracking-tight">Results workspace</h1>
            <Badge variant="outline">{order.id}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {patient?.fullName ?? order.patientId}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/results">Back</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/results/slip/${order.id}`}>Result slip</Link>
          </Button>
        </div>
      </div>

      <DemoDisclaimer variant="compact" />

      {readOnly && (
        <p className="text-sm text-muted-foreground">
          You are viewing released/pending results in read-only mode.
        </p>
      )}

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Analytes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {order.tests.map((line, idx) => {
            const meta = getTestById(line.testId);
            const abnormal =
              line.flag && line.flag !== "Normal"
                ? line.flag === "Critical"
                  ? "destructive"
                  : "warn"
                : null;
            return (
              <div key={line.testId}>
                {idx > 0 ? <Separator className="mb-6" /> : null}
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-medium">{meta?.name ?? line.testId}</p>
                    <p className="text-xs text-muted-foreground">
                      {meta?.department} · {meta?.sampleType}
                    </p>
                  </div>
                  <Badge variant="secondary">{line.resultStatus ?? "Draft"}</Badge>
                </div>

                <div
                  className={cn(
                    "grid gap-3 sm:grid-cols-2 rounded-xl border p-4",
                    abnormal === "destructive" &&
                      "border-red-300 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/25",
                    abnormal === "warn" &&
                      "border-amber-300 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20",
                  )}
                >
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Result</Label>
                    <Input
                      disabled={readOnly || !user || !canEnterResults(user.role)}
                      value={line.resultValue ?? ""}
                      onChange={(e) =>
                        updateOrderLine(order.id, line.testId, {
                          resultValue: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Units</Label>
                    <Input
                      disabled={readOnly || !user || !canEnterResults(user.role)}
                      value={line.units ?? meta?.units ?? ""}
                      onChange={(e) =>
                        updateOrderLine(order.id, line.testId, {
                          units: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reference range</Label>
                    <Input
                      disabled={readOnly || !user || !canEnterResults(user.role)}
                      value={line.referenceRange ?? meta?.referenceRange ?? ""}
                      onChange={(e) =>
                        updateOrderLine(order.id, line.testId, {
                          referenceRange: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Flag</Label>
                    <Select
                      disabled={readOnly || !user || !canEnterResults(user.role)}
                      value={line.flag ?? "Normal"}
                      onValueChange={(v) =>
                        updateOrderLine(order.id, line.testId, {
                          flag: v as ResultFlag,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FLAGS.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Comment</Label>
                    <Textarea
                      disabled={readOnly || !user || !canEnterResults(user.role)}
                      rows={2}
                      value={line.comment ?? ""}
                      onChange={(e) =>
                        updateOrderLine(order.id, line.testId, {
                          comment: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2 text-xs text-muted-foreground space-y-1">
                    <p>Entered by: {line.enteredBy ?? "—"}</p>
                    <p>
                      Verified by: {line.verifiedBy ?? "—"}{" "}
                      {line.verificationDate
                        ? `on ${line.verificationDate}`
                        : ""}
                    </p>
                  </div>
                </div>

                {!readOnly && user && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canEnterResults(user.role) && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updateOrderLine(order.id, line.testId, {
                              resultStatus: "Draft",
                              enteredBy: user.name,
                            });
                            toast.message("Draft saved");
                          }}
                        >
                          Save draft
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            updateOrderLine(order.id, line.testId, {
                              resultStatus: "Pending Verification",
                              enteredBy: user.name,
                            });
                            updateOrder(order.id, {
                              status: "Pending Verification",
                            });
                            toast.success("Submitted for verification (demo).");
                          }}
                        >
                          Submit for verification
                        </Button>
                      </>
                    )}
                    {canVerifyResults(user.role) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          updateOrderLine(order.id, line.testId, {
                            resultStatus: "Verified",
                            verifiedBy: user.name,
                            verificationDate: new Date()
                              .toISOString()
                              .slice(0, 10),
                          });
                          updateOrder(order.id, { status: "Verified" });
                          toast.success("Result verified.");
                        }}
                      >
                        Verify
                      </Button>
                    )}
                    {canReleaseResults(user.role) && (
                      <Button
                        size="sm"
                        onClick={() => {
                          updateOrderLine(order.id, line.testId, {
                            resultStatus: "Released",
                          });
                          const next = order.tests.map((l) =>
                            l.testId === line.testId
                              ? {
                                  ...l,
                                  resultStatus: "Released" as LineResultStatus,
                                }
                              : l,
                          );
                          if (next.every((l) => l.resultStatus === "Released")) {
                            updateOrder(order.id, { status: "Released" });
                          }
                          toast.success("Result released to ordering clinician.");
                        }}
                      >
                        Release
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
