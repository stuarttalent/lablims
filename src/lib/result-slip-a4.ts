/** ISO A4 result report — single source of truth for layout and PDF export. */
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
/** Standard 1 inch margin on all sides. */
export const A4_MARGIN_MM = 25.4;

export const A4_CONTENT_WIDTH_MM = A4_WIDTH_MM - A4_MARGIN_MM * 2;
export const A4_CONTENT_HEIGHT_MM = A4_HEIGHT_MM - A4_MARGIN_MM * 2;

/** CSS length for Tailwind arbitrary values and inline styles. */
export const A4_MARGIN_CSS = `${A4_MARGIN_MM}mm`;

/** ~96 CSS px per inch at 1in = 25.4mm */
export function a4MmToPx(mm: number, scale = 1): number {
  return Math.round((mm / 25.4) * 96 * scale);
}

export const A4_WIDTH_PX = a4MmToPx(A4_WIDTH_MM);
export const A4_HEIGHT_PX = a4MmToPx(A4_HEIGHT_MM);
