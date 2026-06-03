"use client";

import { useData } from "@/contexts/data-context";
import { ResultSlipDocument } from "@/components/results/result-slip-document";
import { SlipExportActions } from "@/components/results/slip-export-actions";
import { Button } from "@/components/ui/button";
import { LabLoader } from "@/components/ui/lab-loader";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildResultSlipPdfBlob } from "@/lib/result-slip-pdf";
import { toast } from "sonner";

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
  const genAttemptRef = useRef(0);

  const buildPdf = useCallback(async () => {
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
      return nextUrl;
    } catch (e) {
      console.error("PDF generation failed:", e);
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      toast.error("Could not build PDF. Try Rebuild PDF.");
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
      void buildPdf();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [
    slipAssetsReady,
    order.id,
    order.createdAt,
    order.tests,
    store.settings.letterheadA4PdfDataUrl,
    buildPdf,
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
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Result report</h1>
          <p className="text-sm text-muted-foreground font-mono">{order.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SlipExportActions
            orderId={order.id}
            elementId={SLIP_ELEMENT_ID}
            pdfBlobUrl={pdfBlobUrl}
            onBeforeExport={buildPdf}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void buildPdf()}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? "Refreshing…" : "Refresh PDF"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/results/${order.id}`}>Workspace</Link>
          </Button>
        </div>
      </div>

      {/* Off-screen report used only for PDF capture (must stay laid out, not opacity-0) */}
      <div
        className="result-slip-print-root fixed top-0 -left-[220mm] w-[210mm] overflow-hidden pointer-events-none"
        aria-hidden
      >
        <ResultSlipDocument
          order={order}
          patient={patient}
          store={store}
          onReady={() => setSlipAssetsReady(true)}
        />
      </div>

      <div className="no-print min-h-[70vh]">
        {pdfBlobUrl ? (
          <div className="result-slip-pdf-frame">
            <iframe title={`Result report ${order.id}`} src={pdfBlobUrl} />
          </div>
        ) : (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 rounded-xl border bg-card">
            <LabLoader
              message={
                isGeneratingPdf || !slipAssetsReady
                  ? "Preparing PDF…"
                  : "PDF not available"
              }
            />
            {!isGeneratingPdf && slipAssetsReady ? (
              <Button size="sm" onClick={() => void buildPdf()}>
                Build PDF
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
