"use client";

import { getTestById } from "@/data/catalogue";
import {
  fbcDisplayTestName,
  formatFbcDifferentialResult,
  isFbcAutoComment,
} from "@/lib/fbc-differential";
import { isMicroStructuredComment } from "@/lib/microbiology";
import type { OrderTestLine } from "@/types";

function flagLabel(flag?: string): string {
  if (!flag || flag === "Normal") return "";
  if (flag === "Low") return "L";
  if (flag === "High") return "H";
  if (flag === "Critical") return "C";
  return flag.slice(0, 1);
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
  return (
    <div className="print:break-inside-avoid-page">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-blue-200 pb-1">
        <h3 className="text-sm font-bold text-blue-700 print:text-blue-800">{title}</h3>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-600">
          Specimen type : {specimenType}
        </span>
      </div>
      <table className="w-full border-collapse text-[11px] print:text-[12pt]">
        <thead>
          <tr className="border-b border-slate-300 text-left text-slate-700">
            <th className="py-1.5 pr-2 font-semibold w-[38%]">Test</th>
            <th className="py-1.5 pr-2 font-semibold w-[14%]">Result</th>
            <th className="py-1.5 pr-2 font-semibold w-[14%]">Unit</th>
            <th className="py-1.5 pr-2 font-semibold w-[8%]">Flag</th>
            <th className="py-1.5 font-semibold">Range</th>
          </tr>
        </thead>
        <tbody className="font-mono text-[11px] print:text-[12pt]">
          {lines.map((line) => {
            const meta = getTestById(line.testId);
            const abnormal = line.flag && line.flag !== "Normal";
            const testName = fbcDisplayTestName(
              line.testId,
              meta?.name ?? line.testId,
            );
            return (
              <tr key={line.testId} className="border-b border-slate-100">
                <td className="py-1 pr-2 font-sans font-medium text-slate-900">
                  {testName}
                </td>
                <td
                  className={`py-1 pr-2 ${abnormal ? "font-bold text-slate-900" : "text-slate-800"}`}
                >
                  {formatFbcDifferentialResult(line, lines)}
                </td>
                <td className="py-1 pr-2 text-slate-700">
                  {line.units ?? meta?.units ?? "—"}
                </td>
                <td className="py-1 pr-2 font-bold text-slate-900">
                  {flagLabel(line.flag)}
                </td>
                <td className="py-1 text-slate-600 font-sans">
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
  return (
    <>
      {lines.map((line) =>
        line.comment &&
        !isFbcAutoComment(line.comment) &&
        !isMicroStructuredComment(line.comment) ? (
          <p
            key={`${line.testId}-c`}
            className="mt-1 border-l-2 border-slate-400 pl-2 text-[10px] text-slate-700"
          >
            <span className="font-semibold">Comment:</span> {line.comment}
          </p>
        ) : null,
      )}
    </>
  );
}
