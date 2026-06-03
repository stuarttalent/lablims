"use client";

import { getTestById } from "@/data/catalogue";
import {
  fbcDisplayTestName,
  formatFbcDifferentialResult,
  isFbcAutoComment,
} from "@/lib/fbc-differential";
import { isMicroStructuredComment } from "@/lib/microbiology";
import type { OrderTestLine } from "@/types";

function flagLetter(flag?: string): string {
  if (!flag || flag === "Normal") return "";
  if (flag === "Low") return "L";
  if (flag === "High") return "H";
  if (flag === "Critical") return "C";
  return flag.slice(0, 1).toUpperCase();
}

function flagClass(flag?: string): string {
  if (flag === "Low") return "text-[#2563eb] font-bold";
  if (flag === "High") return "text-[#b45309] font-bold";
  if (flag === "Critical") return "text-[#dc2626] font-bold";
  return "";
}

export function ResultProfileResultsTable({
  title,
  lines,
  specimenType,
}: {
  title: string;
  lines: OrderTestLine[];
  specimenType: string;
}) {
  const specimenUpper = specimenType.toUpperCase();

  return (
    <div className="mt-4 print:break-inside-avoid-page">
      <h3 className="m-0 text-[12pt] font-bold text-[#1a4d8f] font-sans tracking-tight">
        {title}
      </h3>
      <p className="mt-1 mb-2 font-mono text-[10pt] uppercase tracking-wide text-neutral-800">
        SPECIMEN TYPE : {specimenUpper}
      </p>
      <table className="w-full border-collapse font-mono text-[10.5pt]">
        <thead>
          <tr className="border-b border-neutral-400 text-left">
            <th className="py-1 pr-2 font-bold w-[38%]">Test</th>
            <th className="py-1 pr-2 font-bold w-[14%]">Result</th>
            <th className="py-1 pr-2 font-bold w-[12%]">Unit</th>
            <th className="py-1 pr-2 font-bold w-[8%]">Flag</th>
            <th className="py-1 font-bold">Range</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const meta = getTestById(line.testId);
            const testName = fbcDisplayTestName(
              line.testId,
              meta?.name ?? line.testId,
            );
            return (
              <tr key={line.testId} className="border-b border-neutral-200/80">
                <td className="py-[2px] pr-2">{testName}</td>
                <td className="py-[2px] pr-2 tabular-nums">
                  {formatFbcDifferentialResult(line, lines)}
                </td>
                <td className="py-[2px] pr-2">{line.units ?? meta?.units ?? "—"}</td>
                <td className={`py-[2px] pr-2 ${flagClass(line.flag)}`}>
                  {flagLetter(line.flag)}
                </td>
                <td className="py-[2px]">
                  {line.referenceRange ?? meta?.referenceRange ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ResultProfileComments({
  lines,
}: {
  lines: OrderTestLine[];
}) {
  const visible = lines.filter(
    (line) =>
      line.comment &&
      !isFbcAutoComment(line.comment) &&
      !isMicroStructuredComment(line.comment),
  );
  if (visible.length === 0) return null;

  return (
    <div className="mt-2 space-y-1 print:break-inside-avoid">
      {visible.map((line) => (
        <p
          key={`${line.testId}-c`}
          className="m-0 font-mono text-[10pt] leading-snug text-neutral-800"
        >
          <span className="font-semibold text-[#1a4d8f]">Comment:</span> {line.comment}
        </p>
      ))}
    </div>
  );
}
