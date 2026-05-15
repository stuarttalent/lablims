"use client";

import { useMemo } from "react";
import { buildCumulativeTestMatrix } from "@/lib/cumulative-tests";
import {
  CumulativeTestsSlip,
  CUMULATIVE_SLIP_ELEMENT_ID,
} from "@/components/patients/cumulative-tests-slip";
import { SlipExportActions } from "@/components/results/slip-export-actions";
import type { DemoStore, LabOrder, Patient } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CumulativeTestsPanel({
  patient,
  orders,
  store,
}: {
  patient: Patient;
  orders: LabOrder[];
  store: DemoStore;
}) {
  const matrix = useMemo(
    () => buildCumulativeTestMatrix(orders),
    [orders],
  );

  const generatedOn = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  if (!matrix) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
        <p className="text-sm font-medium text-foreground">
          No cumulative history yet
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          This view needs at least one order with entered results. When the same
          parameters are reported on multiple visits, they appear side by side
          here.
        </p>
        {orders.length > 0 ? (
          <Button size="sm" variant="outline" className="mt-4" asChild>
            <Link href={`/orders/${orders[0]!.id}`}>Open latest order</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  const needsMoreVisits = matrix.columns.length < 2;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <p className="text-sm text-muted-foreground">
            {matrix.rows.length} parameter
            {matrix.rows.length === 1 ? "" : "s"} across {matrix.columns.length}{" "}
            visit{matrix.columns.length === 1 ? "" : "s"}
          </p>
          {needsMoreVisits ? (
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
              Add another visit with results to compare trends side by side.
            </p>
          ) : null}
        </div>
        <SlipExportActions
          orderId={patient.id}
          elementId={CUMULATIVE_SLIP_ELEMENT_ID}
          fileNamePrefix="CumulativeReport"
          emailSubject={`Cumulative laboratory report — ${patient.fullName} (${patient.id})`}
        />
      </div>

      <CumulativeTestsSlip
        patient={patient}
        store={store}
        matrix={matrix}
        generatedOn={generatedOn}
      />
    </div>
  );
}
