"use client";

import { Button } from "@/components/ui/button";
import { Download, Mail, Printer } from "lucide-react";
import { toast } from "sonner";

export function SlipExportActions({ orderId }: { orderId: string }) {
  async function pdf() {
    const el = document.getElementById("lablims-result-slip");
    if (!el) {
      toast.error("Report not ready for export.");
      return;
    }
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      const maxH = pageH - margin * 2;
      const ratio = imgH > maxH ? maxH / imgH : 1;
      pdf.addImage(img, "PNG", margin, margin, imgW * ratio, imgH * ratio);
      pdf.save(`LabLIMS-demo-${orderId}.pdf`);
      toast.success("PDF generated — includes demo watermark text.");
    } catch {
      toast.error("Could not generate PDF in this browser.");
    }
  }

  function email() {
    toast.success("Email simulated — no messages are sent in the demo.");
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
        Send email (simulated)
      </Button>
    </div>
  );
}
