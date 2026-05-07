"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

type LabMarketingShellProps = {
  children: React.ReactNode;
  /** Slightly stronger dimming behind dense forms (e.g. login). */
  variant?: "landing" | "auth";
  className?: string;
};

export function LabMarketingShell({
  children,
  variant = "landing",
  className,
}: LabMarketingShellProps) {
  return (
    <div
      className={cn(
        "relative min-h-screen overflow-hidden bg-slate-950",
        className,
      )}
    >
      {/* Local asset so the hero works offline and without remote image optimization. */}
      <Image
        src="/hero-lab.jpg"
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div
        className={cn(
          "absolute inset-0",
          variant === "landing"
            ? "bg-gradient-to-br from-slate-950/92 via-slate-950/75 to-primary/25"
            : "bg-gradient-to-br from-slate-950/94 via-slate-950/82 to-slate-950/88",
        )}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(56,189,248,0.15),transparent_50%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent_55%)]"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
