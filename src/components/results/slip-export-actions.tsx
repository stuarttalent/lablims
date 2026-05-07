"use client";

import { Button } from "@/components/ui/button";
import { Download, Mail, Printer } from "lucide-react";
import { toast } from "sonner";

function slipPdfFallback(orderId: string) {
  const lines = [
    "LabLIMS — result report",
    `Accession: ${orderId}`,
    "",
    "This PDF was generated as a simplified text export because rich layout",
    "capture is not available in this browser. Use Print → Save as PDF for",
    "a full formatted copy, or try another browser.",
    "",
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
  ];
  return lines.join("\n");
}

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

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight,
        onclone(clonedDoc) {
          const node = clonedDoc.getElementById("lablims-result-slip");
          if (!node) return;
          const win = clonedDoc.defaultView;
          if (!win) return;

          const stripProblematicStyles = (element: Element) => {
            if (!(element instanceof win.HTMLElement)) return;
            const h = element;
            try {
              const cs = win.getComputedStyle(h);
              h.style.fontFamily = "Arial, Helvetica, sans-serif";
              h.style.color = cs.color;
              h.style.backgroundColor = cs.backgroundColor;
              h.style.borderColor = cs.borderColor;
              h.style.fontSize = cs.fontSize;
              h.style.fontWeight = cs.fontWeight;
              h.style.textAlign = cs.textAlign as string;
            } catch {
              h.style.fontFamily = "Arial, Helvetica, sans-serif";
            }
            for (const child of h.children) {
              stripProblematicStyles(child);
            }
          };
          stripProblematicStyles(node);
        },
      });

      const img = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      const maxH = pageH - margin * 2;
      const ratio = imgH > maxH ? maxH / imgH : 1;
      pdf.addImage(img, "PNG", margin, margin, imgW * ratio, imgH * ratio);
      pdf.save(`LabReport-${orderId}.pdf`);
      toast.success("PDF downloaded.");
    } catch (e) {
      console.error("PDF export failed:", e);
      try {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
        const margin = 10;
        const lines = pdf.splitTextToSize(slipPdfFallback(orderId), 180);
        pdf.text(lines, margin, margin);
        pdf.save(`LabReport-${orderId}.pdf`);
        toast.message("PDF saved (simplified text layout)", {
          description:
            "For a pixel-perfect copy, use Print and choose Save as PDF.",
        });
      } catch {
        toast.error(
          "Unable to export PDF. Use Print, then choose Save as PDF.",
        );
      }
    }
  }

  function email() {
    const subject = encodeURIComponent(`Laboratory report ${orderId}`);
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
