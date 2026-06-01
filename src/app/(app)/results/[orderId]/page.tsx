"use client";

import { getTestById } from "@/data/catalogue";
import { groupOrderTests } from "@/lib/group-order-tests";
import { useData } from "@/contexts/data-context";
import { useAuth } from "@/contexts/auth-context";
import {
  canAmendAuthorizedResults,
  canEnterResults,
  canVerifyResults,
} from "@/lib/permissions";
import {
  authorizedEditPolicyMessage,
  isAuthorizedResultLine,
} from "@/lib/authorized-results";
import { AuthorizedResultAmendDialog } from "@/components/results/authorized-result-amend-dialog";
import { ResultAmendmentHistory } from "@/components/results/result-amendment-history";
import {
  defaultCommentsForLine,
  resolveReferenceRangeForPatient,
} from "@/lib/catalogue-rules";
import { orderToAiCommentPayload } from "@/lib/ai-result-comment";
import type { ClinicalGuidance } from "@/lib/ai/clinical-guidance-types";
import { ClinicalGuidancePanel } from "@/components/results/clinical-guidance-panel";
import {
  fbcDisplayTestName,
  filterFbcLinesForDisplay,
} from "@/lib/fbc-differential";
import {
  isMicrobiologyMcsTest,
  microbiologyLinePatch,
  microbiologyResultSummary,
  parseMicrobiologyResult,
} from "@/lib/microbiology";
import { MicrobiologyResultEditor } from "@/components/results/microbiology-result-editor";
import { getCatalogueOverride } from "@/lib/catalogue-access";
import {
  isQualitativeTest,
  QUALITATIVE_RESULTS,
} from "@/lib/test-kind";
import { findPriorResultForTest, heuristicDeltaSentence } from "@/lib/prior-results";
import { computePreAuthIssues, heuristicPreAuthSummary } from "@/lib/pre-auth-checklist";
import type {
  LineResultStatus,
  MicrobiologyResult,
  OrderStatus,
  OrderTestLine,
  ResultFlag,
} from "@/types";
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

type LineDraftFields = Pick<
  OrderTestLine,
  "resultValue" | "units" | "referenceRange" | "flag" | "comment"
>;

function lineToDraft(
  line: OrderTestLine,
  meta?: { units?: string; referenceRange?: string },
): LineDraftFields {
  return {
    resultValue: line.resultValue ?? "",
    units: line.units ?? meta?.units ?? "",
    referenceRange: line.referenceRange ?? meta?.referenceRange ?? "",
    flag: line.flag ?? "Normal",
    comment: line.comment ?? "",
  };
}

function buildLinePatch(
  line: OrderTestLine,
  draft: LineDraftFields,
): Partial<OrderTestLine> | null {
  const patch: Partial<OrderTestLine> = {};
  const norm = (v: string | undefined) => v ?? "";
  if (norm(line.resultValue) !== norm(draft.resultValue)) {
    patch.resultValue = draft.resultValue;
  }
  if (norm(line.units) !== norm(draft.units)) patch.units = draft.units;
  if (norm(line.referenceRange) !== norm(draft.referenceRange)) {
    patch.referenceRange = draft.referenceRange;
  }
  if ((line.flag ?? "Normal") !== draft.flag) patch.flag = draft.flag;
  if (norm(line.comment) !== norm(draft.comment)) patch.comment = draft.comment;
  return Object.keys(patch).length > 0 ? patch : null;
}

function inferFlagFromResultRange(
  resultValue?: string,
  referenceRange?: string,
): ResultFlag | undefined {
  const raw = (resultValue ?? "").trim();
  const rr = (referenceRange ?? "").trim();
  if (!raw || !rr) return undefined;
  const value = Number.parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(value)) return undefined;

  const compact = rr.replace(/\s+/g, "");
  const between = compact.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
  if (between) {
    const lo = Number.parseFloat(between[1]);
    const hi = Number.parseFloat(between[2]);
    if (value < lo) return "Low";
    if (value > hi) return "High";
    return "Normal";
  }
  const lt = compact.match(/^<?=?(-?\d+(?:\.\d+)?)/i) ?? compact.match(/<\s*(-?\d+(?:\.\d+)?)/i);
  if (lt) {
    const limit = Number.parseFloat(lt[1]);
    return value <= limit ? "Normal" : "High";
  }
  const gt = compact.match(/^> ?=?(-?\d+(?:\.\d+)?)/i) ?? compact.match(/>\s*(-?\d+(?:\.\d+)?)/i);
  if (gt) {
    const limit = Number.parseFloat(gt[1]);
    return value >= limit ? "Normal" : "Low";
  }
  return undefined;
}

function toNum(v?: string): number | null {
  if (!v) return null;
  const n = Number.parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

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
  const [deltaAiByTestId, setDeltaAiByTestId] = useState<Record<string, string>>({});
  const [deltaAiBusyId, setDeltaAiBusyId] = useState<string | null>(null);
  const [preAuthAiByTestId, setPreAuthAiByTestId] = useState<Record<string, string>>({});
  const [preAuthBusyId, setPreAuthBusyId] = useState<string | null>(null);
  const [editingAuthorizedTestId, setEditingAuthorizedTestId] = useState<
    string | null
  >(null);
  const [lineDrafts, setLineDrafts] = useState<Record<string, LineDraftFields>>(
    {},
  );
  const [microDrafts, setMicroDrafts] = useState<
    Record<string, MicrobiologyResult>
  >({});
  const [amendDialog, setAmendDialog] = useState<{
    testId: string;
    testName: string;
    patch: Partial<OrderTestLine>;
  } | null>(null);
  const order = store.orders.find((o) => o.id === params.orderId);

  if (!order) notFound();

  const patient = store.patients.find((p) => p.id === order.patientId);
  const readOnly = user?.role === "doctor";

  function confirmAmendment(reason: string) {
    if (!amendDialog || !user || !order) return;
    updateOrderLine(order.id, amendDialog.testId, amendDialog.patch, {
      amendment: { reason, amendedBy: user },
    });
    setAmendDialog(null);
    setEditingAuthorizedTestId(null);
    setLineDrafts((prev) => {
      const next = { ...prev };
      delete next[amendDialog.testId];
      return next;
    });
    setMicroDrafts((prev) => {
      const next = { ...prev };
      delete next[amendDialog.testId];
      return next;
    });
    toast.success("Amendment recorded.");
  }

  function lineFieldsDisabled(line: OrderTestLine): boolean {
    if (readOnly || !user || !canEnterResults(user.role)) return true;
    if (isAuthorizedResultLine(line)) {
      if (!canAmendAuthorizedResults(user.role)) return true;
      return editingAuthorizedTestId !== line.testId;
    }
    return false;
  }

  function getDisplayLine(
    line: OrderTestLine,
    meta?: { units?: string; referenceRange?: string },
  ): OrderTestLine {
    const draft = lineDrafts[line.testId];
    if (editingAuthorizedTestId === line.testId && draft) {
      return { ...line, ...draft };
    }
    return line;
  }

  function getDisplayMicro(line: OrderTestLine): MicrobiologyResult {
    if (editingAuthorizedTestId === line.testId && microDrafts[line.testId]) {
      return microDrafts[line.testId];
    }
    return parseMicrobiologyResult(line);
  }

  function handleMicroChange(line: OrderTestLine, next: MicrobiologyResult) {
    if (!order) return;
    const patch = microbiologyLinePatch(next);
    if (isAuthorizedResultLine(line)) {
      if (editingAuthorizedTestId !== line.testId) return;
      setMicroDrafts((prev) => ({ ...prev, [line.testId]: next }));
      return;
    }
    updateOrderLine(order.id, line.testId, patch);
  }

  function handleLineFieldChange(
    line: OrderTestLine,
    meta: { units?: string; referenceRange?: string } | undefined,
    patch: Partial<LineDraftFields>,
  ) {
    if (!order) return;
    const candidateResult = patch.resultValue ?? line.resultValue;
    const candidateRange = patch.referenceRange ?? line.referenceRange ?? meta?.referenceRange;
    const autoFlag = inferFlagFromResultRange(candidateResult, candidateRange);
    const nextPatch: Partial<LineDraftFields> = autoFlag
      ? { ...patch, flag: autoFlag }
      : patch;
    if (isAuthorizedResultLine(line)) {
      if (editingAuthorizedTestId !== line.testId) return;
      setLineDrafts((prev) => ({
        ...prev,
        [line.testId]: {
          ...(prev[line.testId] ?? lineToDraft(line, meta)),
          ...nextPatch,
        },
      }));
      return;
    }
    updateOrderLine(order.id, line.testId, nextPatch);

    // Auto-calculate common derived parameters for real-world use.
    if (
      nextPatch.resultValue !== undefined ||
      line.testId === "t-lipid-total" ||
      line.testId === "t-lipid-hdl" ||
      line.testId === "t-lipid-tg" ||
      line.testId === "t-lft-total-protein" ||
      line.testId === "t-lft-albumin"
    ) {
      const valueByTest = new Map(
        order.tests.map((t) => [t.testId, t.resultValue ?? ""]),
      );
      valueByTest.set(line.testId, nextPatch.resultValue ?? line.resultValue ?? "");

      const totalChol = toNum(valueByTest.get("t-lipid-total"));
      const hdl = toNum(valueByTest.get("t-lipid-hdl"));
      const tg = toNum(valueByTest.get("t-lipid-tg"));
      if (totalChol != null && hdl != null && tg != null) {
        const ldl = totalChol - hdl - tg / 2.2;
        if (Number.isFinite(ldl)) {
          updateOrderLine(order.id, "t-lipid-ldl", {
            resultValue: ldl.toFixed(2),
            comment: "Auto-calculated (Friedewald, mmol/L).",
            flag: inferFlagFromResultRange(
              ldl.toFixed(2),
              getTestById("t-lipid-ldl")?.referenceRange,
            ),
          });
        }
      }

      const tp = toNum(valueByTest.get("t-lft-total-protein"));
      const alb = toNum(valueByTest.get("t-lft-albumin"));
      if (tp != null && alb != null) {
        const glob = tp - alb;
        if (Number.isFinite(glob)) {
          const globValue = glob.toFixed(2);
          updateOrderLine(order.id, "t-lft-globulin-calc", {
            resultValue: globValue,
            comment: "Auto-calculated (Total protein - Albumin).",
            flag: inferFlagFromResultRange(
              globValue,
              getTestById("t-lft-globulin-calc")?.referenceRange,
            ),
          });
          if (glob !== 0) {
            const agr = alb / glob;
            const agrValue = agr.toFixed(2);
            updateOrderLine(order.id, "t-lft-ag-ratio-calc", {
              resultValue: agrValue,
              comment: "Auto-calculated (Albumin / Globulin).",
              flag: inferFlagFromResultRange(
                agrValue,
                getTestById("t-lft-ag-ratio-calc")?.referenceRange,
              ),
            });
          }
        }
      }

    }
  }

  function startAuthorizedEdit(
    line: OrderTestLine,
    meta?: { units?: string; referenceRange?: string },
  ) {
    setEditingAuthorizedTestId(line.testId);
    if (isMicrobiologyMcsTest(line.testId)) {
      setMicroDrafts((prev) => ({
        ...prev,
        [line.testId]: parseMicrobiologyResult(line),
      }));
      return;
    }
    setLineDrafts((prev) => ({
      ...prev,
      [line.testId]: lineToDraft(line, meta),
    }));
  }

  function cancelAuthorizedEdit(testId: string) {
    setEditingAuthorizedTestId((id) => (id === testId ? null : id));
    setLineDrafts((prev) => {
      const next = { ...prev };
      delete next[testId];
      return next;
    });
    setMicroDrafts((prev) => {
      const next = { ...prev };
      delete next[testId];
      return next;
    });
  }

  function saveAuthorizedEdit(line: OrderTestLine, testName: string) {
    if (!user || !order) return;
    if (isMicrobiologyMcsTest(line.testId)) {
      const draft = microDrafts[line.testId];
      if (!draft) return;
      const current = parseMicrobiologyResult(line);
      if (JSON.stringify(current) === JSON.stringify(draft)) {
        toast.info("No changes to save.");
        cancelAuthorizedEdit(line.testId);
        return;
      }
      setAmendDialog({
        testId: line.testId,
        testName,
        patch: microbiologyLinePatch(draft),
      });
      return;
    }
    const draft = lineDrafts[line.testId];
    if (!draft) return;
    const patch = buildLinePatch(line, draft);
    if (!patch) {
      toast.info("No changes to save.");
      cancelAuthorizedEdit(line.testId);
      return;
    }
    setAmendDialog({ testId: line.testId, testName, patch });
  }

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
      const data = (await res.json()) as {
        comment?: string;
        guidance?: ClinicalGuidance;
        source?: string;
        error?: string;
      };
      if (!res.ok || !data.comment) {
        toast.error(data.error ?? "Could not generate comment.");
        return;
      }
      updateOrder(order.id, {
        aiGeneratedComment: data.comment,
        aiClinicalGuidance: data.guidance,
      });
      toast.success(
        data.source === "openai"
          ? "EDLIZ-informed AI guidance generated."
          : "Guidance generated (EDLIZ rules offline — set OPENAI_API_KEY for full AI).",
      );
    } catch {
      toast.error("Generation failed.");
    } finally {
      setAiBusy(false);
    }
  }

  async function fetchDeltaAi(
    testName: string,
    line: {
      testId: string;
      resultValue?: string;
      flag?: ResultFlag;
    },
    prior: NonNullable<ReturnType<typeof findPriorResultForTest>>,
  ) {
    setDeltaAiBusyId(line.testId);
    try {
      const res = await fetch("/api/ai/result-delta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testName,
          current: { value: line.resultValue ?? "", flag: line.flag },
          prior,
        }),
      });
      const data = (await res.json()) as { sentence?: string; source?: string; error?: string };
      if (!res.ok || !data.sentence) {
        toast.error(data.error ?? "Could not refine delta wording.");
        return;
      }
      setDeltaAiByTestId((m) => ({ ...m, [line.testId]: data.sentence! }));
      toast.success(
        data.source === "openai"
          ? "Delta wording refined (AI)."
          : "Delta wording updated (heuristic — set OPENAI_API_KEY for full AI).",
      );
    } catch {
      toast.error("Request failed.");
    } finally {
      setDeltaAiBusyId(null);
    }
  }

  async function fetchPreAuthBrief(
    orderId: string,
    testId: string,
    testName: string,
    issues: string[],
  ) {
    setPreAuthBusyId(testId);
    try {
      const res = await fetch("/api/ai/pre-auth-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issues, orderId, testId, testName }),
      });
      const data = (await res.json()) as { summary?: string; source?: string; error?: string };
      if (!res.ok || !data.summary) {
        toast.error(data.error ?? "Could not summarize checklist.");
        return;
      }
      setPreAuthAiByTestId((m) => ({ ...m, [testId]: data.summary! }));
      toast.success(
        data.source === "openai"
          ? "Pre-authorization brief ready (AI)."
          : "Brief ready (rules summary — set OPENAI_API_KEY for full AI).",
      );
    } catch {
      toast.error("Request failed.");
    } finally {
      setPreAuthBusyId(null);
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

      {patient ? (
        <p className="text-sm text-muted-foreground rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
          Clinical symptoms and history are recorded on the{" "}
          <Link
            href={`/patients/${patient.id}`}
            className="font-medium text-foreground underline underline-offset-2"
          >
            patient demographics
          </Link>{" "}
          page
          {patient.clinicalSymptoms || patient.clinicalHistory
            ? " (chart has clinical information on file)."
            : " — add clinical information there for AI interpretive comments."}
        </p>
      ) : null}

      <Card className="border-border/70 shadow-sm border-teal-500/20 bg-teal-50/15 dark:bg-teal-950/15">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4 text-teal-600" />
            AI overall comment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Uses patient data, results, and Zimbabwe EDLIZ (2015) guidelines to suggest further
            tests and clinical considerations — not a formal diagnosis. Choose whether the
            narrative appears on the printed / PDF slip.
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
            <>
              <Textarea
                className="text-sm font-normal min-h-[100px]"
                readOnly={readOnly}
                value={order.aiGeneratedComment}
                onChange={(e) =>
                  updateOrder(order.id, { aiGeneratedComment: e.target.value || undefined })
                }
              />
              {order.aiClinicalGuidance ? (
                <ClinicalGuidancePanel guidance={order.aiClinicalGuidance} />
              ) : null}
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No generated narrative yet. Enter results and ensure clinical information is on the
              patient chart, then generate.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2">
          <CardTitle className="text-base">Analytes</CardTitle>
          {user ? (
            <p className="text-xs text-muted-foreground sm:col-span-2 w-full">
              {authorizedEditPolicyMessage(user.role)}
            </p>
          ) : null}
          {!readOnly && user && canEnterResults(user.role) && (
            <Button type="button" size="sm" variant="secondary" onClick={applyCatalogueCommentsToAll}>
              Apply catalogue comment rules
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-8">
          {groupOrderTests(order.tests, store.settings).map((group) => (
            <div key={group.id} className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/30 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-blue-200 pb-2">
                <h3 className="text-sm font-bold text-blue-800">{group.title}</h3>
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Specimen: {group.specimenType}
                </span>
              </div>
              <div className="space-y-6">
          {filterFbcLinesForDisplay(group.lines).map((line, idx) => {
            const meta = getTestById(line.testId, store.settings);
            const testOverride = getCatalogueOverride(line.testId, store.settings);
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
            const prior = findPriorResultForTest(
              store,
              order.patientId,
              line.testId,
              order.id,
            );
            const issues =
              line.resultStatus === "Pending Verification"
                ? computePreAuthIssues(order, line)
                : [];
            const rulesBrief = heuristicPreAuthSummary(issues);
            const displayLine = getDisplayLine(line, meta);
            const isEditingAuthorized = editingAuthorizedTestId === line.testId;
            const isMicro = isMicrobiologyMcsTest(line.testId, store.settings);
            const isQualitative = isQualitativeTest(meta, testOverride);
            const testLabel = fbcDisplayTestName(
              line.testId,
              meta?.name ?? line.testId,
            );
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
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary">
                      {lineStatusLabel(line.resultStatus)}
                    </Badge>
                    {isAuthorizedResultLine(line) ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[10px] text-violet-700 dark:text-violet-300 max-w-[12rem] text-right">
                          {canAmendAuthorizedResults(user?.role ?? "tech")
                            ? isEditingAuthorized
                              ? "Editing — save to record amendment"
                              : "Amendment requires reason on save"
                            : "Locked — scientist+ only"}
                        </span>
                        {canAmendAuthorizedResults(user?.role ?? "tech") &&
                        !readOnly ? (
                          isEditingAuthorized ? (
                            <div className="flex gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => cancelAuthorizedEdit(line.testId)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => saveAuthorizedEdit(line, testLabel)}
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => startAuthorizedEdit(line, meta)}
                            >
                              Edit
                            </Button>
                          )
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {isMicro ? (
                  <div className="rounded-xl border border-teal-200/80 bg-teal-50/20 p-4 dark:border-teal-900/50 dark:bg-teal-950/15">
                    <MicrobiologyResultEditor
                      value={getDisplayMicro(line)}
                      onChange={(next) => handleMicroChange(line, next)}
                      disabled={lineFieldsDisabled(line)}
                    />
                    <p className="mt-3 text-xs text-muted-foreground">
                      Report summary:{" "}
                      <span className="font-medium text-foreground">
                        {microbiologyResultSummary(getDisplayMicro(line))}
                      </span>
                    </p>
                  </div>
                ) : isQualitative ? (
                  <div className="rounded-xl border border-violet-200/80 bg-violet-50/20 p-4 dark:border-violet-900/50 dark:bg-violet-950/15">
                    <div className="space-y-2">
                      <Label>Qualitative result</Label>
                      <Select
                        disabled={lineFieldsDisabled(line)}
                        value={displayLine.resultValue || ""}
                        onValueChange={(v) =>
                          v &&
                          handleLineFieldChange(line, meta, { resultValue: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select result" />
                        </SelectTrigger>
                        <SelectContent>
                          {QUALITATIVE_RESULTS.map((q) => (
                            <SelectItem key={q} value={q}>
                              {q}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mt-3 space-y-2">
                      <Label>Comment</Label>
                      <Textarea
                        disabled={lineFieldsDisabled(line)}
                        rows={2}
                        value={displayLine.comment ?? ""}
                        onChange={(e) =>
                          handleLineFieldChange(line, meta, {
                            comment: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                ) : (
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
                      disabled={lineFieldsDisabled(line)}
                      value={displayLine.resultValue ?? ""}
                      onChange={(e) =>
                        handleLineFieldChange(line, meta, {
                          resultValue: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Units</Label>
                    <Input
                      disabled={lineFieldsDisabled(line)}
                      value={displayLine.units ?? meta?.units ?? ""}
                      onChange={(e) =>
                        handleLineFieldChange(line, meta, {
                          units: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reference range</Label>
                    <Input
                      disabled={lineFieldsDisabled(line)}
                      value={
                        displayLine.referenceRange ?? meta?.referenceRange ?? ""
                      }
                      onChange={(e) =>
                        handleLineFieldChange(line, meta, {
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
                        {!lineFieldsDisabled(line) ? (
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-xs"
                            onClick={() =>
                              handleLineFieldChange(line, meta, {
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
                      disabled
                      value={displayLine.flag ?? "Normal"}
                      onValueChange={(v) =>
                        handleLineFieldChange(line, meta, {
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
                    <p className="text-[11px] text-muted-foreground">
                      AI-assisted auto-flag from result vs reference range.
                    </p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Comment</Label>
                    <Textarea
                      disabled={lineFieldsDisabled(line)}
                      rows={2}
                      value={displayLine.comment ?? ""}
                      onChange={(e) =>
                        handleLineFieldChange(line, meta, {
                          comment: e.target.value,
                        })
                      }
                    />
                    {!lineFieldsDisabled(line) ? (
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
                          const cur = displayLine.comment?.trim() ?? "";
                          const merged =
                            !cur
                              ? block
                              : block.split("\n").every((p) => cur.includes(p))
                                ? cur
                                : `${cur}\n${block}`;
                          handleLineFieldChange(line, meta, { comment: merged });
                          toast.message("Catalogue comments merged.");
                        }}
                      >
                        Insert matching catalogue comments
                      </Button>
                    ) : null}
                  </div>
                </div>
                )}

                <div className="mt-3 space-y-3">
                  <ResultAmendmentHistory amendments={line.amendments} />
                  {prior && !isMicro && !isQualitative ? (
                    <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3 space-y-2">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Prior result (same patient &amp; test)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Accession{" "}
                        <Link
                          href={`/results/${prior.orderId}`}
                          className="font-mono text-foreground underline-offset-2 hover:underline"
                        >
                          {prior.orderId}
                        </Link>
                        {" · collected "}
                        <span className="text-foreground">{prior.collectionDate}</span>
                        {" · value "}
                        <span className="font-medium text-foreground">
                          {prior.line.resultValue}
                        </span>
                        {prior.line.flag && prior.line.flag !== "Normal" ? (
                          <span> ({prior.line.flag})</span>
                        ) : null}
                      </p>
                      <p className="text-sm leading-snug">
                        {deltaAiByTestId[line.testId] ??
                          heuristicDeltaSentence(meta?.name ?? line.testId, {
                            value: line.resultValue ?? "",
                            flag: line.flag,
                          }, prior)}
                      </p>
                      {!readOnly && user ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5"
                          disabled={deltaAiBusyId === line.testId}
                          onClick={() =>
                            void fetchDeltaAi(meta?.name ?? line.testId, line, prior)
                          }
                        >
                          <Sparkles className="size-3.5" />
                          {deltaAiBusyId === line.testId
                            ? "Refining…"
                            : "Refine wording (AI)"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="text-xs text-muted-foreground space-y-1">
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
                  <>
                    {canVerifyResults(user.role) &&
                    line.resultStatus === "Pending Verification" ? (
                      <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-50/30 dark:bg-amber-950/20 p-3 space-y-2">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          Pre-authorization rule check
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Deterministic checks only. AI below restates the same items — it does not
                          replace your review or add diagnoses.
                        </p>
                        {issues.length === 0 ? (
                          <p className="text-sm text-emerald-700 dark:text-emerald-400">
                            {rulesBrief}
                          </p>
                        ) : (
                          <ul className="text-sm list-disc pl-5 space-y-1">
                            {issues.map((issue) => (
                              <li key={issue}>{issue}</li>
                            ))}
                          </ul>
                        )}
                        {preAuthAiByTestId[line.testId] ? (
                          <p className="text-xs text-muted-foreground border-t border-border/60 pt-2 leading-relaxed">
                            {preAuthAiByTestId[line.testId]}
                          </p>
                        ) : issues.length > 0 ? (
                          <p className="text-xs text-muted-foreground border-t border-border/60 pt-2 italic">
                            {rulesBrief}
                          </p>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5"
                          disabled={preAuthBusyId === line.testId}
                          onClick={() =>
                            void fetchPreAuthBrief(
                              order.id,
                              line.testId,
                              meta?.name ?? line.testId,
                              issues,
                            )
                          }
                        >
                          <Sparkles className="size-3.5" />
                          {preAuthBusyId === line.testId
                            ? "Summarizing…"
                            : "Summarize for sign-off (AI)"}
                        </Button>
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {canEnterResults(user.role) &&
                        !isAuthorizedResultLine(line) && (
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
                  </>
                )}
              </div>
            );
          })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {amendDialog ? (
        <AuthorizedResultAmendDialog
          key={amendDialog.testId}
          open
          testName={amendDialog.testName}
          onOpenChange={(open) => {
            if (!open) setAmendDialog(null);
          }}
          onConfirm={confirmAmendment}
        />
      ) : null}
    </div>
  );
}
