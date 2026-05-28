"use client";

import { jsPDF } from "jspdf";

type BuildResultSlipPdfOptions = {
  element: HTMLElement;
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

  let remainingHeight = imageHeight;
  let offsetY = marginMm;

  pdf.addImage(dataUrl, "PNG", marginMm, offsetY, imageWidth, imageHeight);
  remainingHeight -= contentHeight;

  while (remainingHeight > 0) {
    offsetY = marginMm - (imageHeight - remainingHeight);
    pdf.addPage("a4", "p");
    pdf.addImage(dataUrl, "PNG", marginMm, offsetY, imageWidth, imageHeight);
    remainingHeight -= contentHeight;
  }

  return pdf.output("blob");
}

async function captureElementPng(element: HTMLElement): Promise<string> {
  const { toPng } = await import("html-to-image");
  return toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
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
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: 0,
  });
  return canvas.toDataURL("image/png", 1);
}

/** Build an A4 PDF blob from a visible result slip element. */
export async function buildResultSlipPdfBlob({
  element,
  marginMm = 8,
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
