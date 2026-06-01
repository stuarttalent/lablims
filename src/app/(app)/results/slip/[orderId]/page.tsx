"use client";

import { useData } from "@/contexts/data-context";
import { ResultSlipDocument } from "@/components/results/result-slip-document";
import { SlipExportActions } from "@/components/results/slip-export-actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildResultSlipPdfBlob } from "@/lib/result-slip-pdf";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SLIP_ELEMENT_ID = "lablims-result-slip";

export default function ResultSlipPage() {
  const params = useParams<{ orderId: string }>();
  const { store } = useData();
  const order = store.orders.find((o) => o.id === params.orderId);
  if (!order) notFound();
  const patient = store.patients.find((p) => p.id === order.patientId);

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [slipAssetsReady, setSlipAssetsReady] = useState(false);
  const [viewMode, setViewMode] = useState<"report" | "pdf">("report");
  const genAttemptRef = useRef(0);

  const regeneratePdfPreview = useCallback(async () => {
    const slip = document.getElementById(SLIP_ELEMENT_ID);
    if (!slip) {
      toast.error("Report not ready yet.");
      return null;
    }
    setIsGeneratingPdf(true);
    try {
      const blob = await buildResultSlipPdfBlob({ element: slip });
      const nextUrl = URL.createObjectURL(blob);
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
      setViewMode("pdf");
      return nextUrl;
    } catch (e) {
      console.error("PDF generation failed:", e);
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setViewMode("report");
      toast.error("Could not build PDF. Use Print → Save as PDF from the report view.");
      return null;
    } finally {
      setIsGeneratingPdf(false);
    }
  }, []);

  useEffect(() => {
    if (!slipAssetsReady) return;
    const attempt = ++genAttemptRef.current;
    const timer = window.setTimeout(() => {
      if (genAttemptRef.current !== attempt) return;
      void regeneratePdfPreview();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [
    slipAssetsReady,
    order.id,
    order.createdAt,
    order.tests,
    store.settings.letterheadA4PdfDataUrl,
    regeneratePdfPreview,
  ]);

  useEffect(() => {
    const fallback = window.setTimeout(() => setSlipAssetsReady(true), 2500);
    return () => window.clearTimeout(fallback);
  }, [order.id]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  return (
    <div className="space-y-4 max-w-5xl mx-auto print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Result slip</h1>
          <p className="text-sm text-muted-foreground font-mono">{order.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SlipExportActions
            orderId={order.id}
            elementId={SLIP_ELEMENT_ID}
            pdfBlobUrl={pdfBlobUrl}
            onBeforeExport={regeneratePdfPreview}
          />
          <Button
            type="button"
            variant={viewMode === "report" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setViewMode("report")}
          >
            Report view
          </Button>
          <Button
            type="button"
            variant={viewMode === "pdf" ? "secondary" : "outline"}
            size="sm"
            disabled={!pdfBlobUrl && !isGeneratingPdf}
            onClick={() => {
              if (pdfBlobUrl) setViewMode("pdf");
              else void regeneratePdfPreview();
            }}
          >
            PDF view
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void regeneratePdfPreview()}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? "Building PDF…" : "Rebuild PDF"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/results/${order.id}`}>Workspace</Link>
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "result-slip-print-root flex justify-center overflow-auto py-8 bg-slate-100/80 print:py-0 print:bg-white print:overflow-visible",
          viewMode === "pdf" && pdfBlobUrl ? "hidden print:block" : "block",
        )}
      >
        <ResultSlipDocument
          order={order}
          patient={patient}
          store={store}
          onReady={() => setSlipAssetsReady(true)}
        />
      </div>

      {viewMode === "pdf" ? (
        <div className="rounded-xl border bg-card p-3 no-print min-h-[70vh]">
          {pdfBlobUrl ? (
            <iframe
              title={`Result slip ${order.id}`}
              src={pdfBlobUrl}
              className="w-full min-h-[70vh] rounded-lg border-0"
            />
          ) : (
            <div className="min-h-[40vh] grid place-items-center text-sm text-muted-foreground">
              {isGeneratingPdf
                ? "Building PDF from report…"
                : "PDF not ready — switch to Report view or click Rebuild PDF."}
            </div>
          )}
        </div>
      ) : null}

      {isGeneratingPdf && viewMode === "report" ? (
        <p className="text-center text-xs text-muted-foreground no-print">
          Building PDF in the background…
        </p>
      ) : null}
    </div>
  );
}
