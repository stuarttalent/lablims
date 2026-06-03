"use client";

import {
  A4_HEIGHT_MM,
  A4_HEIGHT_PX,
  A4_WIDTH_MM,
  A4_WIDTH_PX,
} from "@/lib/result-slip-a4";
import { jsPDF } from "jspdf";

type BuildResultSlipPdfOptions = {
  element: HTMLElement;
};

const CAPTURE_MOUNT_ID = "lablims-slip-capture-mount";

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

function captureHeightPx(node: HTMLElement): number {
  return Math.max(
    A4_HEIGHT_PX,
    Math.ceil(node.scrollHeight || node.offsetHeight || A4_HEIGHT_PX),
  );
}

async function captureNodePng(node: HTMLElement): Promise<string> {
  const heightPx = captureHeightPx(node);
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

async function captureNodeHtml2Canvas(node: HTMLElement): Promise<string> {
  const html2canvas = (await import("html2canvas")).default;
  const heightPx = captureHeightPx(node);
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

async function rasterizeNode(node: HTMLElement): Promise<string> {
  try {
    return await captureNodePng(node);
  } catch (e1) {
    console.warn("html-to-image capture failed:", e1);
    return captureNodeHtml2Canvas(node);
  }
}

/** Slice one tall capture into A4 pages (fallback when pagination is not used). */
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
    const dataUrl = await rasterizeNode(clone);
    return pngDataUrlToPdfBlob(dataUrl);
  } finally {
    unmount();
  }
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

  try {
    return await buildPdfFromSlipClone(slip);
  } finally {
    restore();
    document.getElementById(CAPTURE_MOUNT_ID)?.remove();
  }
}
