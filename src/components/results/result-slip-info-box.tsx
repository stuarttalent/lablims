"use client";

import type { ReactNode } from "react";

/** Bordered field block matching classic laboratory report layout. */
export function ResultInfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[3px] border border-neutral-800 px-2.5 py-2 font-mono text-[10.5pt] leading-[1.45] text-neutral-900">
      {children}
    </div>
  );
}

export function ResultInfoLine({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <p className="m-0">
      <span className="font-semibold text-[#1a4d8f]">{label}:</span>{" "}
      <span>{value ?? "—"}</span>
    </p>
  );
}
