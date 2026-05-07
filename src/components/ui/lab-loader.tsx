"use client";

import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

export function LabLoader({
  className,
  message = "Loading laboratory workspace…",
}: {
  className?: string;
  message?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4",
        className,
      )}
    >
      <div className="relative flex size-16 items-center justify-center">
        <div
          className="absolute inset-0 rounded-full border-[3px] border-primary/20 border-t-primary motion-safe:animate-spin"
          style={{ animationDuration: "1s" }}
          aria-hidden
        />
        <div className="relative flex size-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <FlaskConical
            className="size-6 text-primary motion-safe:animate-pulse"
            strokeWidth={1.75}
            aria-hidden
          />
        </div>
      </div>
      <p className="max-w-xs text-center text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
