"use client";

import { jsPDF } from "jspdf";

type BuildResultSlipPdfOptions = {
  element: HTMLElement;
  marginMm?: number;
};

export async function buildResultSlipPdfBlob({
  element,
  marginMm = 8,
}: BuildResultSlipPdfOptions): Promise<Blob> {
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/png", 1);
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginMm * 2;
  const contentHeight = pageHeight - marginMm * 2;

  const imageWidth = contentWidth;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;
  let remainingHeight = imageHeight;
  let offsetY = marginMm;

  pdf.addImage(imgData, "PNG", marginMm, offsetY, imageWidth, imageHeight);
  remainingHeight -= contentHeight;

  while (remainingHeight > 0) {
    offsetY = marginMm - (imageHeight - remainingHeight);
    pdf.addPage("a4", "p");
    pdf.addImage(imgData, "PNG", marginMm, offsetY, imageWidth, imageHeight);
    remainingHeight -= contentHeight;
  }

  return pdf.output("blob");
}
