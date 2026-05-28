"use client";

import { Button } from "@/components/ui/button";
import { Download, Mail, Printer } from "lucide-react";
import { toast } from "sonner";
import { buildResultSlipPdfBlob } from "@/lib/result-slip-pdf";

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
  async function pdf() {
    let readyBlobUrl = pdfBlobUrl ?? null;
    if (!readyBlobUrl && onBeforeExport) {
      readyBlobUrl = await onBeforeExport();
    }
    if (!readyBlobUrl) {
      const el = document.getElementById(elementId);
      if (!el) {
        toast.error("Report not ready for export.");
        return;
      }
      try {
        const blob = await buildResultSlipPdfBlob({ element: el });
        readyBlobUrl = URL.createObjectURL(blob);
      } catch {
        toast.error("Unable to export PDF.");
        return;
      }
    }

    const a = document.createElement("a");
    a.href = readyBlobUrl;
    a.download = `${fileNamePrefix}-${orderId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="size-4" />
        Print
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={pdf}>
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
