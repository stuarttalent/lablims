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
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[10.5pt] font-semibold text-slate-900 tracking-tight print:text-black">
          {title}
        </h3>
        <span className="text-[8.5pt] text-slate-500 print:text-neutral-600">
          Specimen: {specimenType}
        </span>
      </div>
      <div className="border-b border-slate-300 mb-2 print:border-neutral-400" />
      <table className="w-full border-collapse text-[10pt] print:text-[9.5pt]">
        <thead>
          <tr className="border-b border-slate-400 text-left print:border-neutral-600">
            <th className="py-1 pr-2 font-semibold text-slate-800 w-[36%] print:text-black">
              Test
            </th>
            <th className="py-1 pr-2 font-semibold text-slate-800 w-[16%] print:text-black">
              Result
            </th>
            <th className="py-1 pr-2 font-semibold text-slate-800 w-[12%] print:text-black">
              Unit
            </th>
            <th className="py-1 pr-2 font-semibold text-slate-800 w-[6%] text-center print:text-black">
              
            </th>
            <th className="py-1 font-semibold text-slate-800 print:text-black">
              Reference interval
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const meta = getTestById(line.testId);
            const abnormal = line.flag && line.flag !== "Normal";
            const testName = fbcDisplayTestName(
              line.testId,
              meta?.name ?? line.testId,
            );
            return (
              <tr
                key={line.testId}
                className="border-b border-slate-200/80 print:border-neutral-200"
              >
                <td className="py-[3px] pr-2 text-slate-900 print:text-black">
                  {testName}
                </td>
                <td
                  className={`py-[3px] pr-2 tabular-nums ${abnormal ? "font-semibold" : ""} text-slate-900 print:text-black`}
                >
                  {formatFbcDifferentialResult(line, lines)}
                </td>
                <td className="py-[3px] pr-2 text-slate-600 text-[9.5pt] print:text-neutral-700">
                  {line.units ?? meta?.units ?? "—"}
                </td>
                <td className="py-[3px] pr-2 text-center font-semibold text-slate-900 text-[9pt] print:text-black">
                  {flagLabel(line.flag)}
                </td>
                <td className="py-[3px] text-slate-600 text-[9.5pt] print:text-neutral-700">
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
    <div className="mt-3 space-y-1.5 print:break-inside-avoid">
      {visible.map((line) => (
        <p
          key={`${line.testId}-c`}
          className="text-[9pt] leading-snug text-slate-700 pl-3 border-l border-slate-400 print:text-neutral-800 print:border-neutral-500"
        >
          <span className="font-semibold text-slate-800 print:text-black">Note · </span>
          {line.comment}
        </p>
      ))}
    </div>
  );
}
