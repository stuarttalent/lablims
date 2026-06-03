import {
  A4_CONTENT_HEIGHT_MM,
  A4_HEIGHT_MM,
  A4_MARGIN_CSS,
  A4_WIDTH_MM,
  a4MmToPx,
} from "@/lib/result-slip-a4";

const PAGE_HEIGHT_PX = a4MmToPx(A4_HEIGHT_MM);
const CONTENT_HEIGHT_PX = a4MmToPx(A4_CONTENT_HEIGHT_MM);

export const PDF_BLOCK_CLASS = "result-slip-pdf-block";

type PageShell = { page: HTMLElement; inner: HTMLElement };

let measureHost: HTMLElement | null = null;

function getMeasureHost(): HTMLElement {
  if (measureHost?.isConnected) return measureHost;
  measureHost = document.createElement("div");
  measureHost.setAttribute("aria-hidden", "true");
  measureHost.style.cssText = [
    "position:fixed",
    "left:-9999px",
    "top:0",
    `width:${A4_WIDTH_MM}mm`,
    `padding:${A4_MARGIN_CSS}`,
    "box-sizing:border-box",
    "visibility:hidden",
    "pointer-events:none",
    "background:#fff",
  ].join(";");
  document.body.appendChild(measureHost);
  return measureHost;
}

function measureElement(el: HTMLElement): number {
  const host = getMeasureHost();
  const slot = document.createElement("div");
  host.appendChild(slot);
  const clone = el.cloneNode(true) as HTMLElement;
  slot.appendChild(clone);
  const height = Math.ceil(clone.getBoundingClientRect().height || clone.offsetHeight);
  host.removeChild(slot);
  return height;
}

function createPageShell(letterheadFragment: HTMLElement | null): PageShell {
  const page = document.createElement("div");
  page.className = "result-slip-a4-page bg-white text-slate-900";
  page.style.cssText = [
    `width:${A4_WIDTH_MM}mm`,
    `height:${A4_HEIGHT_MM}mm`,
    `min-height:${A4_HEIGHT_MM}mm`,
    `max-height:${A4_HEIGHT_MM}mm`,
    "position:relative",
    "overflow:hidden",
    "box-sizing:border-box",
    "page-break-after:always",
    "break-after:page",
  ].join(";");

  if (letterheadFragment) {
    page.appendChild(letterheadFragment.cloneNode(true) as HTMLElement);
  }

  const inner = document.createElement("div");
  inner.style.cssText = [
    "position:relative",
    "z-index:10",
    "display:flex",
    "flex-direction:column",
    `height:${A4_HEIGHT_MM}mm`,
    `padding:${A4_MARGIN_CSS}`,
    "box-sizing:border-box",
    "overflow:hidden",
  ].join(";");
  page.appendChild(inner);
  return { page, inner };
}

function tableRoot(block: HTMLElement): HTMLElement {
  return block.querySelector<HTMLElement>("[data-slip-table-root]") ?? block;
}

function buildTableFragment(
  source: HTMLElement,
  rows: HTMLTableRowElement[],
  includePanelHeader: boolean,
): HTMLElement {
  const frag = source.cloneNode(true) as HTMLElement;
  const fragRoot = tableRoot(frag);
  if (!includePanelHeader) {
    const panelBar = fragRoot.querySelector(":scope > div:first-child");
    if (panelBar?.querySelector("h3")) panelBar.remove();
  }
  const tbody = fragRoot.querySelector("tbody");
  if (tbody) {
    tbody.innerHTML = "";
    for (const row of rows) {
      tbody.appendChild(row.cloneNode(true));
    }
  }
  return frag;
}

function splitTableBlock(block: HTMLElement, maxContentH: number): HTMLElement[] {
  const root = tableRoot(block);
  const tbody = root.querySelector("tbody");
  const rows = tbody ? [...tbody.querySelectorAll("tr")] : [];
  if (rows.length === 0) {
    const single = block.cloneNode(true) as HTMLElement;
    return measureElement(single) <= maxContentH
      ? [single]
      : [single];
  }

  const chunks: HTMLElement[] = [];
  let currentRows: HTMLTableRowElement[] = [];
  let isFirst = true;

  const flush = () => {
    if (currentRows.length === 0) return;
    chunks.push(buildTableFragment(block, currentRows, isFirst));
    isFirst = false;
    currentRows = [];
  };

  for (const row of rows) {
    const trialRows = [...currentRows, row];
    const trial = buildTableFragment(block, trialRows, isFirst);
    const h = measureElement(trial);
    if (h > maxContentH && currentRows.length > 0) {
      flush();
      currentRows = [row];
      const single = buildTableFragment(block, currentRows, isFirst);
      if (measureElement(single) <= maxContentH) continue;
      flush();
      currentRows = [];
      chunks.push(buildTableFragment(block, [row], false));
      isFirst = false;
    } else {
      currentRows = trialRows;
    }
  }
  flush();
  return chunks.length > 0 ? chunks : [block.cloneNode(true) as HTMLElement];
}

function splitBlockToFit(block: HTMLElement, maxContentH: number): HTMLElement[] {
  const full = block.cloneNode(true) as HTMLElement;
  const h = measureElement(full);
  if (h <= maxContentH) return [full];
  if (block.querySelector("tbody tr")) return splitTableBlock(block, maxContentH);
  return [full];
}

function packBlocks(
  blocks: HTMLElement[],
  letterheadFragment: HTMLElement | null,
): HTMLElement[] {
  const pages: PageShell[] = [];
  let shell = createPageShell(letterheadFragment);
  pages.push(shell);
  let used = 0;

  const startNewPage = () => {
    shell = createPageShell(letterheadFragment);
    pages.push(shell);
    used = 0;
  };

  const appendPart = (part: HTMLElement) => {
    const h = measureElement(part);
    if (used + h > CONTENT_HEIGHT_PX && used > 0) startNewPage();
    shell.inner.appendChild(part);
    used += h;
  };

  for (const block of blocks) {
    const parts = splitBlockToFit(block, CONTENT_HEIGHT_PX);
    for (const part of parts) {
      const h = measureElement(part);
      if (h > CONTENT_HEIGHT_PX) {
        if (used > 0) startNewPage();
        shell.inner.appendChild(part);
        used = h;
        continue;
      }
      appendPart(part);
    }
  }

  if (pages.length > 1 && pages[pages.length - 1].inner.childElementCount === 0) {
    pages.pop();
  }

  return pages.map((p) => p.page);
}

/**
 * Build a fixed-height A4 page stack for raster PDF capture (1in margins on every page).
 * Caller must remove the returned root after capture.
 */
export function buildPaginatedSlipExportRoot(slip: HTMLElement): {
  exportRoot: HTMLElement;
  pageCount: number;
} {
  const blocks = [
    ...slip.querySelectorAll<HTMLElement>(`.${PDF_BLOCK_CLASS}`),
  ];
  const letterheadLayer = slip.querySelector<HTMLElement>(
    ":scope > .pointer-events-none.absolute",
  );

  const pageElements = packBlocks(blocks, letterheadLayer);

  const exportRoot = document.createElement("div");
  exportRoot.id = "lablims-result-slip-pdf-export";
  exportRoot.style.cssText = [
    `width:${A4_WIDTH_MM}mm`,
    "margin:0",
    "padding:0",
    "background:#fff",
    "box-sizing:border-box",
  ].join(";");

  for (const page of pageElements) {
    exportRoot.appendChild(page);
  }

  return { exportRoot, pageCount: pageElements.length };
}

export function expectedExportHeightPx(pageCount: number): number {
  return Math.max(PAGE_HEIGHT_PX, pageCount * PAGE_HEIGHT_PX);
}
