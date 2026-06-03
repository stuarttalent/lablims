"use client";

import {
  A4_HEIGHT_MM,
  A4_HEIGHT_PX,
  A4_WIDTH_MM,
  A4_WIDTH_PX,
} from "@/lib/result-slip-a4";
import {
  buildPaginatedSlipExportRoot,
  expectedExportHeightPx,
} from "@/lib/result-slip-pdf-pagination";
import { jsPDF } from "jspdf";

type BuildResultSlipPdfOptions = {
  element: HTMLElement;
};

/** Ensure the slip element is laid out at full A4 width before raster capture. */
function prepareSlipForCapture(slip: HTMLElement): () => void {
  const prev = {
    width: slip.style.width,
    minWidth: slip.style.minWidth,
    maxWidth: slip.style.maxWidth,
    minHeight: slip.style.minHeight,
    boxSizing: slip.style.boxSizing,
  };
  slip.style.width = `${A4_WIDTH_MM}mm`;
  slip.style.minWidth = `${A4_WIDTH_MM}mm`;
  slip.style.maxWidth = `${A4_WIDTH_MM}mm`;
  slip.style.minHeight = `${A4_HEIGHT_MM}mm`;
  slip.style.boxSizing = "border-box";
  return () => {
    slip.style.width = prev.width;
    slip.style.minWidth = prev.minWidth;
    slip.style.maxWidth = prev.maxWidth;
    slip.style.minHeight = prev.minHeight;
    slip.style.boxSizing = prev.boxSizing;
  };
}

function pngDataUrlToPdfBlob(dataUrl: string): Blob {
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgProps = pdf.getImageProperties(dataUrl);
  const imageWidth = pageWidth;
  const imageHeight = (imgProps.height * imageWidth) / imgProps.width;

  let heightLeft = imageHeight;
  let positionY = 0;

  pdf.addImage(dataUrl, "PNG", 0, 0, imageWidth, imageHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0.5) {
    positionY = -(imageHeight - heightLeft);
    pdf.addPage("a4", "p");
    pdf.addImage(dataUrl, "PNG", 0, positionY, imageWidth, imageHeight);
    heightLeft -= pageHeight;
  }

  return pdf.output("blob");
}

async function captureElementPng(
  slip: HTMLElement,
  heightPx: number,
): Promise<string> {
  const { toPng } = await import("html-to-image");
  return toPng(slip, {
    cacheBust: true,
    pixelRatio: 2,
    width: A4_WIDTH_PX,
    height: heightPx,
    backgroundColor: "#ffffff",
    style: {
      width: `${A4_WIDTH_MM}mm`,
      minWidth: `${A4_WIDTH_MM}mm`,
      maxWidth: `${A4_WIDTH_MM}mm`,
      margin: "0",
      opacity: "1",
      visibility: "visible",
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

async function captureElementPngHtml2Canvas(
  slip: HTMLElement,
  heightPx: number,
): Promise<string> {
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(slip, {
    scale: 2,
    width: A4_WIDTH_PX,
    height: heightPx,
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

/** Build an A4 PDF blob; slip element must already include 25.4mm margins in its layout. */
export async function buildResultSlipPdfBlob({
  element,
}: BuildResultSlipPdfOptions): Promise<Blob> {
  const slip =
    element.id === "lablims-result-slip"
      ? element
      : (element.querySelector("#lablims-result-slip") as HTMLElement | null) ?? element;

  const restore = prepareSlipForCapture(slip);

  const { exportRoot, pageCount } = buildPaginatedSlipExportRoot(slip);
  const hasPageContent = [...exportRoot.querySelectorAll(".result-slip-a4-page")].some(
    (page) => (page.lastElementChild as HTMLElement | null)?.childElementCount,
  );
  if (!hasPageContent) {
    throw new Error("Result slip has no content to export.");
  }

  // Must not sit under .result-slip-print-root (opacity ~0) or capture renders blank.
  exportRoot.style.cssText += [
    `width:${A4_WIDTH_MM}mm`,
    "position:fixed",
    "left:-12000px",
    "top:0",
    "opacity:1",
    "visibility:visible",
    "z-index:-1",
    "pointer-events:none",
    "background:#fff",
  ].join(";");
  document.body.appendChild(exportRoot);

  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const captureHeightPx = expectedExportHeightPx(pageCount);

  try {
    if (slip.offsetWidth < 100) {
      throw new Error("Result slip is not laid out at full A4 width for capture.");
    }

    let dataUrl: string | null = null;
    try {
      dataUrl = await captureElementPng(exportRoot, captureHeightPx);
    } catch (e1) {
      console.warn("html-to-image capture failed:", e1);
    }

    if (!dataUrl) {
      dataUrl = await captureElementPngHtml2Canvas(exportRoot, captureHeightPx);
    }

    if (!dataUrl) {
      throw new Error("Could not capture result slip.");
    }

    return pngDataUrlToPdfBlob(dataUrl);
  } finally {
    exportRoot.remove();
    restore();
  }
}
