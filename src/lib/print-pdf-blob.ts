/** Open the browser print dialog for a PDF blob URL. */
export function printPdfBlobUrl(blobUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "Print report");
    iframe.setAttribute("aria-hidden", "true");
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
      opacity: "0",
      pointerEvents: "none",
    });
    iframe.src = blobUrl;

    const cleanup = () => {
      window.setTimeout(() => iframe.remove(), 2000);
    };

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        reject(new Error("Could not load PDF for printing."));
        return;
      }
      win.focus();
      win.print();
      cleanup();
      resolve();
    };

    iframe.onerror = () => {
      cleanup();
      reject(new Error("Could not load PDF for printing."));
    };

    document.body.appendChild(iframe);
  });
}
