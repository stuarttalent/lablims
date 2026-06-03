"use client";

import {
  A4_HEIGHT_MM,
  A4_HEIGHT_PX,
  A4_WIDTH_MM,
  A4_WIDTH_PX,
} from "@/lib/result-slip-a4";
import { buildPaginatedSlipExportRoot } from "@/lib/result-slip-pdf-pagination";
import { jsPDF } from "jspdf";

type BuildResultSlipPdfOptions = {
  element: HTMLElement;
};

const CAPTURE_MOUNT_ID = "lablims-slip-capture-mount";
/** Heuristic: blank PNG data URLs are tiny. */
const MIN_PAGE_PNG_LENGTH = 6_000;

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

function mountForCapture(content: HTMLElement): () => void {
  document.getElementById(CAPTURE_MOUNT_ID)?.remove();

  const mount = document.createElement("div");
  mount.id = CAPTURE_MOUNT_ID;
  mount.setAttribute("aria-hidden", "true");
  Object.assign(mount.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${A4_WIDTH_MM}mm`,
    transform: "translateX(-110vw)",
    zIndex: "2147483646",
    opacity: "1",
    visibility: "visible",
    pointerEvents: "none",
    background: "#ffffff",
    boxSizing: "border-box",
  });
  mount.appendChild(content);
  document.body.appendChild(mount);
  return () => mount.remove();
}

async function waitForCaptureLayout(root: HTMLElement): Promise<void> {
  const imgs = [...root.querySelectorAll("img")];
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }
        }),
    ),
  );
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

async function captureNodePng(
  node: HTMLElement,
  heightPx: number,
): Promise<string> {
  const { toPng } = await import("html-to-image");
  return toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    width: A4_WIDTH_PX,
    height: heightPx,
    backgroundColor: "#ffffff",
    style: {
      width: `${A4_WIDTH_MM}mm`,
      minWidth: `${A4_WIDTH_MM}mm`,
      maxWidth: `${A4_WIDTH_MM}mm`,
      height: `${A4_HEIGHT_MM}mm`,
      minHeight: `${A4_HEIGHT_MM}mm`,
      maxHeight: `${A4_HEIGHT_MM}mm`,
      opacity: "1",
      visibility: "visible",
      boxSizing: "border-box",
    },
    filter: (n) => {
      if (n instanceof HTMLElement && n.classList.contains("no-pdf")) return false;
      return true;
    },
  });
}

async function captureNodeHtml2Canvas(
  node: HTMLElement,
  heightPx: number,
): Promise<string> {
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(node, {
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

async function rasterizeNode(node: HTMLElement, heightPx: number): Promise<string> {
  try {
    return await captureNodePng(node, heightPx);
  } catch (e1) {
    console.warn("html-to-image capture failed:", e1);
    return captureNodeHtml2Canvas(node, heightPx);
  }
}

/** One rasterized A4 page (includes 25.4mm margins in layout) → one PDF page. */
async function buildPdfFromPaginatedPages(pages: HTMLElement[]): Promise<Blob> {
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i++) {
    const dataUrl = await rasterizeNode(pages[i], A4_HEIGHT_PX);
    if (dataUrl.length < MIN_PAGE_PNG_LENGTH) {
      throw new Error(`Page ${i + 1} capture appears blank.`);
    }
    if (i > 0) pdf.addPage("a4", "p");
    pdf.addImage(dataUrl, "PNG", 0, 0, pageWidth, pageHeight);
  }

  return pdf.output("blob");
}

/** Fallback: tall capture sliced at 297mm (only page 1 has layout margins). */
function pngDataUrlToPdfBlob(dataUrl: string): Blob {
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgProps = pdf.getImageProperties(dataUrl);
  const imageWidth = pageWidth;
  const imageHeight = (imgProps.height * imageWidth) / imgProps.width;

  let heightLeft = imageHeight;
  pdf.addImage(dataUrl, "PNG", 0, 0, imageWidth, imageHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0.5) {
    const positionY = -(imageHeight - heightLeft);
    pdf.addPage("a4", "p");
    pdf.addImage(dataUrl, "PNG", 0, positionY, imageWidth, imageHeight);
    heightLeft -= pageHeight;
  }

  return pdf.output("blob");
}

async function buildPdfFromSlipClone(slip: HTMLElement): Promise<Blob> {
  const clone = slip.cloneNode(true) as HTMLElement;
  clone.id = "lablims-result-slip-capture";
  clone.removeAttribute("data-has-pdf-letterhead");

  const unmount = mountForCapture(clone);
  try {
    await waitForCaptureLayout(clone);
    if (clone.offsetWidth < 100) {
      throw new Error("Result slip is not laid out at full A4 width for capture.");
    }
    const heightPx = Math.max(
      A4_HEIGHT_PX,
      Math.ceil(clone.scrollHeight || clone.offsetHeight || A4_HEIGHT_PX),
    );
    const dataUrl = await rasterizeNode(clone, heightPx);
    return pngDataUrlToPdfBlob(dataUrl);
  } finally {
    unmount();
  }
}

async function buildPdfFromPaginatedSlip(slip: HTMLElement): Promise<Blob> {
  const { exportRoot } = buildPaginatedSlipExportRoot(slip);
  const textLen = exportRoot.textContent?.replace(/\s+/g, "").length ?? 0;
  if (textLen < 40) {
    throw new Error("Paginated export has no content.");
  }

  const pages = [...exportRoot.querySelectorAll<HTMLElement>(".result-slip-a4-page")];
  if (pages.length === 0) {
    throw new Error("Paginated export produced no pages.");
  }

  const unmount = mountForCapture(exportRoot);
  try {
    await waitForCaptureLayout(exportRoot);
    return await buildPdfFromPaginatedPages(pages);
  } finally {
    unmount();
  }
}

/** Build an A4 PDF blob; each page includes 25.4mm (1in) margins on all sides. */
export async function buildResultSlipPdfBlob({
  element,
}: BuildResultSlipPdfOptions): Promise<Blob> {
  const slip =
    element.id === "lablims-result-slip"
      ? element
      : (element.querySelector("#lablims-result-slip") as HTMLElement | null) ?? element;

  const restore = prepareSlipForCapture(slip);

  try {
    try {
      return await buildPdfFromPaginatedSlip(slip);
    } catch (paginatedError) {
      console.warn("Paginated PDF failed, using full-slip fallback:", paginatedError);
      return await buildPdfFromSlipClone(slip);
    }
  } finally {
    restore();
    document.getElementById(CAPTURE_MOUNT_ID)?.remove();
  }
}
