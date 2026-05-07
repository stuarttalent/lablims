"use client";

import { getTestById } from "@/data/catalogue";
import { useData } from "@/contexts/data-context";
import { useAuth } from "@/contexts/auth-context";
import { canEnterResults, canVerifyResults } from "@/lib/permissions";
import {
  defaultCommentsForLine,
  resolveReferenceRangeForPatient,
} from "@/lib/catalogue-rules";
import { orderToAiCommentPayload } from "@/lib/ai-result-comment";
import type { LineResultStatus, OrderStatus, ResultFlag } from "@/types";
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
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sparkles } from "lucide-react";

const FLAGS: ResultFlag[] = ["Normal", "Low", "High", "Critical"];

function lineStatusLabel(s: LineResultStatus | undefined): string {
  if (s === "Pending Verification") return "Pending authorization";
  return s ?? "Draft";
}

function syncOrderStatusFromLines(
  lines: { resultStatus?: LineResultStatus }[],
): OrderStatus {
  if (lines.length === 0) return "In Progress";
  if (lines.every((l) => l.resultStatus === "Released")) return "Released";
  if (lines.some((l) => l.resultStatus === "Pending Verification")) {
    return "Pending Verification";
  }
  if (lines.some((l) => l.resultStatus === "Verified")) return "Verified";
  if (lines.some((l) => l.resultStatus === "Released")) return "Verified";
  return "In Progress";
}

export default function ResultsWorkspacePage() {
  const params = useParams<{ orderId: string }>();
  const { store, updateOrderLine, updateOrder } = useData();
  const { user } = useAuth();
  const [aiBusy, setAiBusy] = useState(false);
  const order = store.orders.find((o) => o.id === params.orderId);

  if (!order) notFound();

  const patient = store.patients.find((p) => p.id === order.patientId);
  const readOnly = user?.role === "doctor";

  async function generateAiComment() {
    if (!order) return;
    setAiBusy(true);
    try {
      const payload = orderToAiCommentPayload(order, patient);
      const res = await fetch("/api/ai/result-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { comment?: string; source?: string; error?: string };
      if (!res.ok || !data.comment) {
        toast.error(data.error ?? "Could not generate comment.");
        return;
      }
      updateOrder(order.id, { aiGeneratedComment: data.comment });
      toast.success(
        data.source === "openai"
          ? "AI narrative generated."
          : "Narrative generated (offline template — set OPENAI_API_KEY for full AI).",
      );
    } catch {
      toast.error("Generation failed.");
    } finally {
      setAiBusy(false);
    }
  }

  function applyCatalogueCommentsToAll() {
    if (!order) return;
    let n = 0;
    for (const line of order.tests) {
      const additions = defaultCommentsForLine(line.testId, line, store.settings);
      if (additions.length === 0) continue;
      const block = additions.join("\n");
      const cur = line.comment?.trim() ?? "";
      const merged =
        !cur ? block : block.split("\n").every((p) => cur.includes(p)) ? cur : `${cur}\n${block}`;
      if (merged !== cur) {
        updateOrderLine(order.id, line.testId, { comment: merged });
        n += 1;
      }
    }
    if (n === 0) toast.message("No matching catalogue rules for current results.");
    else toast.success(`Updated comments on ${n} analyte(s).`);
  }

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

      {readOnly && (
        <p className="text-sm text-muted-foreground">
          You are viewing released/pending results in read-only mode.
        </p>
      )}

      <Card className="border-border/70 shadow-sm border-violet-500/20 bg-violet-50/20 dark:bg-violet-950/15">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Clinical context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="clinical-sx">Symptoms &amp; clinical indication</Label>
          <Textarea
            id="clinical-sx"
            rows={3}
            disabled={readOnly}
            placeholder="e.g. polyuria, weight loss, screening for diabetes…"
            value={order.clinicalSymptoms ?? ""}
            onChange={(e) =>
              updateOrder(order.id, { clinicalSymptoms: e.target.value || undefined })
            }
          />
          <p className="text-[11px] text-muted-foreground">
            Feeds the optional AI interpretive summary. Turn on “Include on result slip” in the
            AI section to print it on reports.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm border-teal-500/20 bg-teal-50/15 dark:bg-teal-950/15">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4 text-teal-600" />
            AI overall comment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Generated from patient demographics, clinical symptoms, order notes, and entered
            results. You choose whether it appears on the printed / PDF slip.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={readOnly || aiBusy}
              onClick={() => void generateAiComment()}
            >
              {aiBusy ? "Generating…" : "Generate with AI"}
            </Button>
            {order.aiGeneratedComment ? (
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <Checkbox
                  disabled={readOnly}
                  checked={!!order.includeAiCommentInReport}
                  onCheckedChange={(c) =>
                    updateOrder(order.id, { includeAiCommentInReport: c === true })
                  }
                />
                Include on result slip &amp; export
              </label>
            ) : null}
          </div>
          {order.aiGeneratedComment ? (
            <Textarea
              className="text-sm font-normal min-h-[100px]"
              readOnly={readOnly}
              value={order.aiGeneratedComment}
              onChange={(e) =>
                updateOrder(order.id, { aiGeneratedComment: e.target.value || undefined })
              }
            />
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No generated narrative yet. Enter results and clinical symptoms, then generate.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2">
          <CardTitle className="text-base">Analytes</CardTitle>
          {!readOnly && user && canEnterResults(user.role) && (
            <Button type="button" size="sm" variant="secondary" onClick={applyCatalogueCommentsToAll}>
              Apply catalogue comment rules
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {order.tests.map((line, idx) => {
            const meta = getTestById(line.testId);
            const suggestedRef = resolveReferenceRangeForPatient(
              line.testId,
              patient,
              store.settings,
            );
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
                  <Badge variant="secondary">
                    {lineStatusLabel(line.resultStatus)}
                  </Badge>
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
                    {patient && suggestedRef ? (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="line-clamp-2">
                          Suggested for {patient.fullName} ({patient.gender}, {patient.age}y):{" "}
                          <span className="text-foreground">{suggestedRef}</span>
                        </span>
                        {!readOnly && user && canEnterResults(user.role) ? (
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-xs"
                            onClick={() =>
                              updateOrderLine(order.id, line.testId, {
                                referenceRange: suggestedRef,
                              })
                            }
                          >
                            Apply
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
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
                    {!readOnly && user && canEnterResults(user.role) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const additions = defaultCommentsForLine(
                            line.testId,
                            line,
                            store.settings,
                          );
                          if (additions.length === 0) {
                            toast.message("No rules matched this result.");
                            return;
                          }
                          const block = additions.join("\n");
                          const cur = line.comment?.trim() ?? "";
                          const merged =
                            !cur
                              ? block
                              : block.split("\n").every((p) => cur.includes(p))
                                ? cur
                                : `${cur}\n${block}`;
                          updateOrderLine(order.id, line.testId, { comment: merged });
                          toast.message("Catalogue comments merged.");
                        }}
                      >
                        Insert matching catalogue comments
                      </Button>
                    ) : null}
                  </div>
                  <div className="sm:col-span-2 text-xs text-muted-foreground space-y-1">
                    <p>
                      Entered by: {line.enteredBy ?? "—"}
                      {line.enteredByCredential
                        ? ` (${line.enteredByCredential})`
                        : ""}
                    </p>
                    <p>
                      Authorized by: {line.verifiedBy ?? "—"}
                      {line.verifiedByCredential
                        ? ` (${line.verifiedByCredential})`
                        : ""}
                      {line.verificationDate
                        ? ` · ${line.verificationDate}`
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
                              enteredByCredential: user.professionalCredential,
                            });
                            toast.message("Draft saved");
                          }}
                        >
                          Save entered result
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            updateOrderLine(order.id, line.testId, {
                              resultStatus: "Pending Verification",
                              enteredBy: user.name,
                              enteredByCredential: user.professionalCredential,
                            });
                            const next = order.tests.map((l) =>
                              l.testId === line.testId
                                ? {
                                    ...l,
                                    resultStatus:
                                      "Pending Verification" as LineResultStatus,
                                    enteredBy: user.name,
                                    enteredByCredential:
                                      user.professionalCredential,
                                  }
                                : l,
                            );
                            updateOrder(order.id, {
                              status: syncOrderStatusFromLines(next),
                            });
                            toast.success("Submitted for authorization.");
                          }}
                        >
                          Submit for authorization
                        </Button>
                      </>
                    )}
                    {canVerifyResults(user.role) &&
                      line.resultStatus === "Pending Verification" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const verifiedBy = user.name;
                            const verifiedByCredential =
                              user.professionalCredential;
                            const verificationDate = new Date()
                              .toISOString()
                              .slice(0, 10);
                            updateOrderLine(order.id, line.testId, {
                              resultStatus: "Released",
                              verifiedBy,
                              verifiedByCredential,
                              verificationDate,
                            });
                            const next = order.tests.map((l) =>
                              l.testId === line.testId
                                ? {
                                    ...l,
                                    resultStatus: "Released" as LineResultStatus,
                                    verifiedBy,
                                    verifiedByCredential,
                                    verificationDate,
                                  }
                                : l,
                            );
                            updateOrder(order.id, {
                              status: syncOrderStatusFromLines(next),
                            });
                            toast.success("Result authorized and released.");
                          }}
                        >
                          Authorize
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
