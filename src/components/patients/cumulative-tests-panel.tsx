"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildCumulativeTestMatrix,
  listCumulativeTestRuns,
} from "@/lib/cumulative-tests";
import { matrixToCumulativeAiInput } from "@/lib/cumulative-ai-comment";
import {
  CumulativeTestsSlip,
  CUMULATIVE_SLIP_ELEMENT_ID,
} from "@/components/patients/cumulative-tests-slip";
import { SlipExportActions } from "@/components/results/slip-export-actions";
import type { DemoStore, LabOrder, Patient } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";

export function CumulativeTestsPanel({
  patient,
  orders,
  store,
}: {
  patient: Patient;
  orders: LabOrder[];
  store: DemoStore;
}) {
  const runs = useMemo(() => listCumulativeTestRuns(orders), [orders]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [aiComment, setAiComment] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (runs.length === 0) {
      setSelectedRunId("");
      return;
    }
    setSelectedRunId((prev) =>
      runs.some((r) => r.id === prev) ? prev : runs[0]!.id,
    );
  }, [runs]);

  const selectedRun = runs.find((r) => r.id === selectedRunId);

  const matrix = useMemo(() => {
    if (!selectedRun) return null;
    return buildCumulativeTestMatrix(orders, selectedRun);
  }, [orders, selectedRun]);

  const generatedOn = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  useEffect(() => {
    if (!matrix || matrix.columns.length < 2) {
      setAiComment(null);
      return;
    }

    let cancelled = false;
    setAiLoading(true);

    const payload = matrixToCumulativeAiInput(matrix, patient);

    fetch("/api/ai/cumulative-comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data: { comment?: string }) => {
        if (!cancelled) setAiComment(data.comment ?? null);
      })
      .catch(() => {
        if (!cancelled) setAiComment(null);
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [matrix, patient]);

  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
        <p className="text-sm font-medium text-foreground">
          No repeatable test runs yet
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Cumulative slips compare the same test (or panel) run on two or more
          visits. Enter results on matching orders for this patient first.
        </p>
        {orders.length > 0 ? (
          <Button size="sm" variant="outline" className="mt-4" asChild>
            <Link href={`/orders/${orders[0]!.id}`}>Open latest order</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 no-print sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 min-w-[min(100%,16rem)]">
          <Label htmlFor="cumulative-run">Test run</Label>
          <Select
            value={selectedRunId}
            onValueChange={(v) => v && setSelectedRunId(v)}
          >
            <SelectTrigger id="cumulative-run" className="w-full sm:w-[320px]">
              <SelectValue placeholder="Select test run" />
            </SelectTrigger>
            <SelectContent>
              {runs.map((run) => (
                <SelectItem key={run.id} value={run.id}>
                  {run.label} ({run.visitCount} visits)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRun ? (
            <p className="text-xs text-muted-foreground">
              {selectedRun.visitCount} visits with results for this panel
            </p>
          ) : null}
        </div>

        {matrix ? (
          <SlipExportActions
            orderId={`${patient.id}-${matrix.runId}`}
            elementId={CUMULATIVE_SLIP_ELEMENT_ID}
            fileNamePrefix="CumulativeReport"
            emailSubject={`Cumulative ${matrix.runLabel} — ${patient.fullName} (${patient.id})`}
          />
        ) : null}
      </div>

      {matrix ? (
        <>
          {aiLoading ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground no-print">
              <Loader2 className="size-3.5 animate-spin" />
              Generating cumulative trend comment…
            </p>
          ) : aiComment ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground no-print">
              <Sparkles className="size-3.5" />
              AI trend summary included on slip below
            </p>
          ) : null}

          <CumulativeTestsSlip
            patient={patient}
            store={store}
            matrix={matrix}
            generatedOn={generatedOn}
            aiComment={aiComment}
          />
        </>
      ) : null}
    </div>
  );
}
