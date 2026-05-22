"use client";

import type { ResultAmendment } from "@/types";
import { ROLE_LABELS } from "@/lib/permissions";

export function ResultAmendmentHistory({
  amendments,
}: {
  amendments?: ResultAmendment[];
}) {
  if (!amendments?.length) return null;

  return (
    <div className="sm:col-span-2 rounded-lg border border-violet-500/25 bg-violet-50/20 dark:bg-violet-950/20 p-3 space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Amendment audit trail
      </p>
      <ul className="space-y-2 text-xs">
        {[...amendments].reverse().map((a, i) => (
          <li key={`${a.at}-${i}`} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
            <p className="text-muted-foreground">
              {a.at} · {a.amendedBy} ({ROLE_LABELS[a.amendedByRole]})
            </p>
            <p className="mt-0.5 text-foreground leading-relaxed">{a.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
