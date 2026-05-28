"use client";

import { useData } from "@/contexts/data-context";
import { ResultSlipDocument } from "@/components/results/result-slip-document";
import { SlipExportActions } from "@/components/results/slip-export-actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildResultSlipPdfBlob } from "@/lib/result-slip-pdf";
import { toast } from "sonner";

export default function ResultSlipPage() {
  const params = useParams<{ orderId: string }>();
  const { store } = useData();
  const order = store.orders.find((o) => o.id === params.orderId);
  if (!order) notFound();
  const patient = store.patients.find((p) => p.id === order.patientId);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [slipRenderTick, setSlipRenderTick] = useState(0);
  const pdfSourceId = useMemo(() => `lablims-result-slip-source-${order.id}`, [order.id]);

  const handleSlipReady = useCallback(() => {
    setSlipRenderTick((n) => n + 1);
  }, []);

  async function regeneratePdfPreview() {
    const source = document.getElementById(pdfSourceId);
    if (!source) return null;
    setIsGeneratingPdf(true);
    try {
      const blob = await buildResultSlipPdfBlob({ element: source });
      const nextUrl = URL.createObjectURL(blob);
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
      return nextUrl;
    } catch {
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      toast.error("Could not generate PDF preview.");
      return null;
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  useEffect(() => {
    if (slipRenderTick === 0) return;
    const timer = window.setTimeout(() => {
      void regeneratePdfPreview();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    slipRenderTick,
    pdfSourceId,
    order.createdAt,
    order.tests,
    store.settings.letterheadA4PdfDataUrl,
  ]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Result slip</h1>
          <p className="text-sm text-muted-foreground font-mono">{order.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SlipExportActions
            orderId={order.id}
            elementId={pdfSourceId}
            pdfBlobUrl={pdfBlobUrl}
            onBeforeExport={regeneratePdfPreview}
          />
          <Button
            variant="outline"
            onClick={() => {
              void regeneratePdfPreview();
            }}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? "Refreshing PDF…" : "Refresh PDF preview"}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/results/${order.id}`}>Workspace</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-3">
        {pdfBlobUrl ? (
          <iframe
            title={`Result slip ${order.id}`}
            src={pdfBlobUrl}
            className="w-full min-h-[80vh] rounded-lg"
          />
        ) : (
          <div className="min-h-[40vh] grid place-items-center text-sm text-muted-foreground">
            {isGeneratingPdf ? "Generating A4 PDF preview…" : "PDF preview not ready."}
          </div>
        )}
      </div>

      <div
        className="absolute left-[-12000px] top-0 w-[210mm] overflow-visible"
        aria-hidden
      >
        <div id={pdfSourceId}>
          <ResultSlipDocument
            order={order}
            patient={patient}
            store={store}
            onReady={handleSlipReady}
          />
        </div>
      </div>
    </div>
  );
}
