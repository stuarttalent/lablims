"use client";

import { useData } from "@/contexts/data-context";
import { ResultSlipDocument } from "@/components/results/result-slip-document";
import { SlipExportActions } from "@/components/results/slip-export-actions";
import { DemoDisclaimer } from "@/components/demo/demo-disclaimer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";

export default function ResultSlipPage() {
  const params = useParams<{ orderId: string }>();
  const { store } = useData();
  const order = store.orders.find((o) => o.id === params.orderId);
  if (!order) notFound();
  const patient = store.patients.find((p) => p.id === order.patientId);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Result slip</h1>
          <p className="text-sm text-muted-foreground font-mono">{order.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SlipExportActions orderId={order.id} />
          <Button variant="outline" asChild>
            <Link href={`/results/${order.id}`}>Workspace</Link>
          </Button>
        </div>
      </div>

      <div className="no-print">
        <DemoDisclaimer variant="inline" />
      </div>

      <ResultSlipDocument order={order} patient={patient} store={store} />
    </div>
  );
}
