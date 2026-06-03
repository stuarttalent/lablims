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
  return flag;
}

function flagClass(flag?: string): string {
  if (flag === "Low") return "text-sky-700 font-bold";
  if (flag === "High") return "text-amber-700 font-bold";
  if (flag === "Critical") return "text-red-700 font-bold";
  return "text-slate-500";
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
    <div
      data-slip-table-root
      className="result-slip-pdf-block overflow-hidden rounded-2xl border border-teal-100/80"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-teal-700 to-emerald-600 px-4 py-2.5">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <span className="text-[10px] font-medium uppercase tracking-wide text-teal-50/95">
          Specimen: {specimenType}
        </span>
      </div>
      <div className="bg-white">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-teal-100 bg-teal-50 text-left text-teal-900">
              <th className="px-3 py-2 font-semibold w-[36%]">Test</th>
              <th className="px-3 py-2 font-semibold w-[16%]">Result</th>
              <th className="px-3 py-2 font-semibold w-[12%]">Unit</th>
              <th className="px-3 py-2 font-semibold w-[10%]">Flag</th>
              <th className="px-3 py-2 font-semibold">Reference range</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => {
              const meta = getTestById(line.testId);
              const abnormal = line.flag && line.flag !== "Normal";
              const testName = fbcDisplayTestName(
                line.testId,
                meta?.name ?? line.testId,
              );
              return (
                <tr
                  key={line.testId}
                  className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-emerald-50/25"}`}
                >
                  <td className="px-3 py-1.5 font-medium text-slate-900">
                    {testName}
                  </td>
                  <td
                    className={`px-3 py-1.5 tabular-nums ${abnormal ? "font-bold text-slate-900" : "text-slate-800"}`}
                  >
                    {formatFbcDifferentialResult(line, lines)}
                  </td>
                  <td className="px-3 py-1.5 text-slate-600">
                    {line.units ?? meta?.units ?? "—"}
                  </td>
                  <td className={`px-3 py-1.5 text-xs ${flagClass(line.flag)}`}>
                    {flagLabel(line.flag)}
                  </td>
                  <td className="px-3 py-1.5 text-slate-600">
                    {line.referenceRange ?? meta?.referenceRange ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
    <div className="result-slip-pdf-block mt-3 space-y-2">
      {visible.map((line) => (
        <p
          key={`${line.testId}-c`}
          className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-[10px] leading-snug text-amber-950"
        >
          <span className="font-semibold text-amber-800">Comment · </span>
          {line.comment}
        </p>
      ))}
    </div>
  );
}
