"use client";

import { A4_WIDTH_MM, A4_WIDTH_PX } from "@/lib/result-slip-a4";
import { jsPDF } from "jspdf";

type BuildResultSlipPdfOptions = {
  element: HTMLElement;
  /**
   * Extra PDF page margin when the captured element is content-only.
   * Default 0: slip is already 210×297mm with 25.4mm padding baked in.
   */
  marginMm?: number;
};

function pngDataUrlToPdfBlob(dataUrl: string, marginMm: number): Blob {
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginMm * 2;
  const contentHeight = pageHeight - marginMm * 2;

  const imgProps = pdf.getImageProperties(dataUrl);
  const imageWidth = contentWidth;
  const imageHeight = (imgProps.height * imageWidth) / imgProps.width;

  let heightLeft = imageHeight;
  let positionY = marginMm;

  pdf.addImage(dataUrl, "PNG", marginMm, positionY, imageWidth, imageHeight);
  heightLeft -= contentHeight;

  while (heightLeft > 0.5) {
    positionY = marginMm - (imageHeight - heightLeft);
    pdf.addPage("a4", "p");
    pdf.addImage(dataUrl, "PNG", marginMm, positionY, imageWidth, imageHeight);
    heightLeft -= contentHeight;
  }

  return pdf.output("blob");
}

async function captureElementPng(element: HTMLElement): Promise<string> {
  const { toPng } = await import("html-to-image");
  return toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    width: A4_WIDTH_PX * 2,
    backgroundColor: "#ffffff",
    style: {
      width: `${A4_WIDTH_MM}mm`,
      margin: "0",
      boxSizing: "border-box",
    },
    filter: (node) => {
      if (node instanceof HTMLElement && node.classList.contains("no-pdf")) {
        return false;
      }
      return true;
    },
  });
}

async function captureElementPngHtml2Canvas(element: HTMLElement): Promise<string> {
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(element, {
    scale: 2,
    width: A4_WIDTH_PX,
    windowWidth: A4_WIDTH_PX,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: 0,
  });
  return canvas.toDataURL("image/png", 1);
}

/** Build an A4 PDF blob from a visible result slip element (210×297mm, 1in margins in layout). */
export async function buildResultSlipPdfBlob({
  element,
  marginMm = 0,
}: BuildResultSlipPdfOptions): Promise<Blob> {
  const slip =
    element.id === "lablims-result-slip"
      ? element
      : (element.querySelector("#lablims-result-slip") as HTMLElement | null) ?? element;

  if (slip.offsetWidth < 10 || slip.offsetHeight < 10) {
    throw new Error("Result slip is not visible for capture.");
  }

  let dataUrl: string | null = null;
  try {
    dataUrl = await captureElementPng(slip);
  } catch (e1) {
    console.warn("html-to-image capture failed:", e1);
  }

  if (!dataUrl) {
    try {
      dataUrl = await captureElementPngHtml2Canvas(slip);
    } catch (e2) {
      console.warn("html2canvas capture failed:", e2);
    }
  }

  if (!dataUrl) {
    throw new Error("Could not capture result slip.");
  }

  return pngDataUrlToPdfBlob(dataUrl, marginMm);
}
