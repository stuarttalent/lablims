"use client";

import { Button } from "@/components/ui/button";
import { printPdfBlobUrl } from "@/lib/print-pdf-blob";
import { buildResultSlipPdfBlob } from "@/lib/result-slip-pdf";
import { Download, Mail, Printer } from "lucide-react";
import { toast } from "sonner";

export function SlipExportActions({
  orderId,
  elementId = "lablims-result-slip",
  fileNamePrefix = "LabReport",
  emailSubject,
  pdfBlobUrl,
  onBeforeExport,
}: {
  orderId: string;
  elementId?: string;
  fileNamePrefix?: string;
  emailSubject?: string;
  pdfBlobUrl?: string | null;
  onBeforeExport?: () => Promise<string | null>;
}) {
  async function resolvePdfBlobUrl(): Promise<string | null> {
    if (pdfBlobUrl) return pdfBlobUrl;
    if (onBeforeExport) {
      const fromParent = await onBeforeExport();
      if (fromParent) return fromParent;
    }
    const el = document.getElementById(elementId);
    if (!el) return null;
    try {
      const blob = await buildResultSlipPdfBlob({ element: el });
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }

  async function handlePrint() {
    const blobUrl = await resolvePdfBlobUrl();
    if (blobUrl) {
      try {
        await printPdfBlobUrl(blobUrl);
        toast.message("Opening print dialog", {
          description: "Choose your printer or Save as PDF.",
        });
      } catch {
        toast.error("Could not print. Try Export PDF, then print the downloaded file.");
      }
      if (!pdfBlobUrl && !onBeforeExport) {
        URL.revokeObjectURL(blobUrl);
      }
      return;
    }

    const el = document.getElementById(elementId);
    if (!el) {
      toast.error("Report not ready for printing.");
      return;
    }

    toast.message("Opening print dialog", {
      description: "Printing the on-screen report layout.",
    });
    window.print();
  }

  async function pdf() {
    let readyBlobUrl = pdfBlobUrl ?? null;
    let revokeAfterDownload = false;

    if (!readyBlobUrl) {
      if (onBeforeExport) {
        readyBlobUrl = await onBeforeExport();
      } else {
        const el = document.getElementById(elementId);
        if (!el) {
          toast.error("Report not ready for export.");
          return;
        }
        try {
          const blob = await buildResultSlipPdfBlob({ element: el });
          readyBlobUrl = URL.createObjectURL(blob);
          revokeAfterDownload = true;
        } catch {
          toast.error("Could not build PDF. Try Refresh PDF or Print.");
          return;
        }
      }
    }

    if (!readyBlobUrl) {
      toast.error("PDF not ready yet.");
      return;
    }

    const a = document.createElement("a");
    a.href = readyBlobUrl;
    a.download = `${fileNamePrefix}-${orderId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (revokeAfterDownload) URL.revokeObjectURL(readyBlobUrl);
    toast.success("PDF downloaded.");
  }

  function email() {
    const subject = encodeURIComponent(
      emailSubject ?? `Laboratory report ${orderId}`,
    );
    window.location.href = `mailto:?subject=${subject}`;
    toast.success("Opening your email app…");
  }

  return (
    <div className="flex flex-wrap gap-2 no-print">
      <Button type="button" variant="outline" size="sm" onClick={() => void handlePrint()}>
        <Printer className="size-4" />
        Print
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={() => void pdf()}>
        <Download className="size-4" />
        Export PDF
      </Button>
      <Button type="button" size="sm" onClick={email}>
        <Mail className="size-4" />
        Email report
      </Button>
    </div>
  );
}
