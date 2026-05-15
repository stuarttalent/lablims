"use client";

import { Button } from "@/components/ui/button";
import { Download, Mail, Printer } from "lucide-react";
import { toast } from "sonner";

function slipPdfFallback(orderId: string) {
  const lines = [
    "Laboratory report",
    `Accession: ${orderId}`,
    "",
    "Raster export failed in this browser session.",
    "Use Print → Save as PDF for an identical layout.",
    "",
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
  ];
  return lines.join("\n");
}

export function SlipExportActions({
  orderId,
  elementId = "lablims-result-slip",
  fileNamePrefix = "LabReport",
  emailSubject,
}: {
  orderId: string;
  elementId?: string;
  fileNamePrefix?: string;
  emailSubject?: string;
}) {
  async function pdf() {
    const el = document.getElementById(elementId);
    if (!el) {
      toast.error("Report not ready for export.");
      return;
    }

    const { jsPDF } = await import("jspdf");

    const margin = 10;
    const buildPdfWithImage = (dataUrl: string, format: "PNG" | "JPEG") => {
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgW = pw - margin * 2;
      const imgH = (imgProps.height * imgW) / imgProps.width;
      const maxH = ph - margin * 2;
      let drawH = imgH;
      let drawW = imgW;
      if (imgH > maxH) {
        const scale = maxH / imgH;
        drawH = maxH;
        drawW = imgW * scale;
      }
      pdf.addImage(dataUrl, format, margin, margin, drawW, drawH);
      pdf.save(`${fileNamePrefix}-${orderId}.pdf`);
    };

    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(el, {
        cacheBust: true,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains("no-pdf"))
            return false;
          return true;
        },
      });
      buildPdfWithImage(dataUrl, "PNG");
      toast.success("PDF downloaded.");
      return;
    } catch (e1) {
      console.warn("html-to-image PDF path failed:", e1);
    }

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        onclone(clonedDoc) {
          const node = clonedDoc.getElementById(elementId);
          if (!node) return;
          const win = clonedDoc.defaultView;
          if (!win) return;
          const normalize = (element: Element) => {
            if (!(element instanceof win.HTMLElement)) return;
            const h = element;
            try {
              const cs = win.getComputedStyle(h);
              h.style.fontFamily = "Arial, Helvetica, sans-serif";
              h.style.color = cs.color;
              h.style.backgroundColor = cs.backgroundColor;
              h.style.borderColor = cs.borderColor;
            } catch {
              h.style.fontFamily = "Arial, Helvetica, sans-serif";
            }
            for (const c of h.children) normalize(c);
          };
          normalize(node);
        },
      });
      const dataUrl = canvas.toDataURL("image/png", 1);
      buildPdfWithImage(dataUrl, "PNG");
      toast.success("PDF downloaded.");
      return;
    } catch (e2) {
      console.error("html2canvas PDF path failed:", e2);
    }

    try {
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const lines = pdf.splitTextToSize(slipPdfFallback(orderId), 180);
      pdf.text(lines, margin, margin);
      pdf.save(`${fileNamePrefix}-${orderId}.pdf`);
      toast.message("PDF saved as text fallback", {
        description: "Use Print → Save as PDF for the full layout.",
      });
    } catch {
      toast.error("Unable to export PDF. Use Print, then Save as PDF.");
    }
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
