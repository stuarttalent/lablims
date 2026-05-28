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
  const width = Math.max(element.scrollWidth, element.offsetWidth, 794);
  const height = Math.max(element.scrollHeight, element.offsetHeight, 1123);

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = `${width}px`;
  host.style.background = "#ffffff";
  host.style.opacity = "1";
  host.style.pointerEvents = "none";
  host.style.zIndex = "-1";

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${width}px`;
  clone.style.minHeight = `${height}px`;
  clone.style.background = "#ffffff";

  // Embedded PDF <object> nodes can fail html2canvas in some browsers.
  clone.querySelectorAll('object[type="application/pdf"]').forEach((node) => {
    const replacement = document.createElement("div");
    replacement.style.width = "100%";
    replacement.style.height = "100%";
    replacement.style.background = "transparent";
    replacement.setAttribute("aria-hidden", "true");
    node.replaceWith(replacement);
  });

  host.appendChild(clone);
  document.body.appendChild(host);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: width,
      windowHeight: height,
    });
  } finally {
    host.remove();
  }

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
