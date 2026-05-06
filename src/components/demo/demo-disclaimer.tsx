import { AlertTriangle } from "lucide-react";

const DEMO_TEXT =
  "Demo / testing only. Not for real patient care or clinical diagnosis.";

export function DemoDisclaimer({
  variant = "banner",
  className = "",
}: {
  variant?: "banner" | "inline" | "compact";
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <p
        className={`text-xs text-amber-800 dark:text-amber-200 flex items-center gap-1.5 ${className}`}
      >
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
        {DEMO_TEXT}
      </p>
    );
  }
  if (variant === "inline") {
    return (
      <div
        className={`rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-50 ${className}`}
      >
        <div className="flex gap-2">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-medium">Demo disclaimer</p>
            <p className="text-amber-900/90 dark:text-amber-100/90">{DEMO_TEXT}</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      role="status"
      className={`rounded-xl border border-amber-300/70 bg-gradient-to-r from-amber-50 via-white to-cyan-50/80 px-4 py-3 text-sm text-amber-950 shadow-sm dark:from-amber-950/50 dark:via-background dark:to-cyan-950/30 dark:border-amber-800/60 dark:text-amber-50 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        <span className="font-semibold tracking-tight">LabLIMS — demonstration</span>
        <span className="text-amber-900/85 dark:text-amber-100/85">· {DEMO_TEXT}</span>
      </div>
    </div>
  );
}

export const DEMO_DISCLAIMER_TEXT = DEMO_TEXT;
