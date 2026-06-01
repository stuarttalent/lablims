"use client";

import { getTestById } from "@/data/catalogue";
import { parseMicrobiologyResult } from "@/lib/microbiology";
import type { OrderTestLine } from "@/types";

function susClass(result: string): string {
  if (result === "S") return "text-emerald-700 font-bold";
  if (result === "R") return "text-red-700 font-bold";
  if (result === "I") return "text-amber-700 font-bold";
  return "text-slate-500";
}

export function MicrobiologyResultsReport({
  testName,
  line,
}: {
  testName: string;
  line: OrderTestLine;
}) {
  const meta = getTestById(line.testId);
  const micro = parseMicrobiologyResult(line);

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-cyan-200/80 shadow-sm print:break-inside-avoid-page">
      <div className="bg-gradient-to-r from-cyan-700 to-teal-600 px-4 py-2.5">
        <h3 className="text-sm font-bold text-white">{testName}</h3>
        <p className="text-[10px] text-cyan-50/90">
          {meta?.sampleType ?? "—"} · Culture &amp; sensitivity
        </p>
      </div>

      <div className="bg-gradient-to-b from-cyan-50/30 to-white p-4">
        <table className="mb-3 w-full rounded-lg overflow-hidden text-[11px] ring-1 ring-cyan-100">
          <tbody className="bg-white">
            <tr className="border-b border-cyan-50">
              <td className="px-3 py-1.5 font-semibold text-cyan-800 w-[32%] bg-cyan-50/50">
                Culture
              </td>
              <td className="px-3 py-1.5 font-medium text-slate-900">
                {micro.cultureOutcome ?? "—"}
              </td>
            </tr>
            {micro.colonyCount ? (
              <tr className="border-b border-cyan-50">
                <td className="px-3 py-1.5 font-semibold text-cyan-800 bg-cyan-50/50">
                  Colony count
                </td>
                <td className="px-3 py-1.5 text-slate-900">{micro.colonyCount}</td>
              </tr>
            ) : null}
            {micro.gramStain ? (
              <tr className="border-b border-cyan-50">
                <td className="px-3 py-1.5 font-semibold text-cyan-800 bg-cyan-50/50">
                  Gram stain
                </td>
                <td className="px-3 py-1.5 text-slate-900">{micro.gramStain}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {micro.organisms.length > 0 ? (
          <div className="space-y-4">
            {micro.organisms.map((org, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-teal-100 bg-white p-3 shadow-sm"
              >
                <p className="text-xs font-bold text-teal-900">
                  Organism {micro.organisms.length > 1 ? idx + 1 : ""}:{" "}
                  {org.name || "—"}
                  {org.quantity ? (
                    <span className="font-normal text-slate-600"> · {org.quantity}</span>
                  ) : null}
                </p>
                <table className="mt-2 w-full border-collapse text-[10px] rounded-lg overflow-hidden ring-1 ring-slate-100">
                  <thead>
                    <tr className="bg-teal-50 text-left text-teal-900">
                      <th className="px-2 py-1.5 font-semibold">Antimicrobial</th>
                      <th className="px-2 py-1.5 font-semibold w-12 text-center">
                        S/I/R
                      </th>
                      <th className="px-2 py-1.5 font-semibold w-20">MIC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {org.antibiotics
                      .filter((a) => a.drug.trim())
                      .map((ab, j) => (
                        <tr
                          key={j}
                          className={`border-t border-slate-100 ${j % 2 === 0 ? "bg-white" : "bg-slate-50/80"}`}
                        >
                          <td className="px-2 py-1 text-slate-800">{ab.drug}</td>
                          <td className={`px-2 py-1 text-center ${susClass(ab.result)}`}>
                            {ab.result}
                          </td>
                          <td className="px-2 py-1 text-slate-600">{ab.mic || "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : micro.cultureOutcome === "No growth" ||
          micro.cultureOutcome === "Normal flora" ? (
          <p className="text-xs text-slate-600 italic px-1">
            No isolate susceptibility reported.
          </p>
        ) : null}

        {micro.additionalNotes ? (
          <p className="mt-3 rounded-lg border border-violet-200/80 bg-violet-50/50 px-3 py-2 text-[10px] text-violet-950">
            <span className="font-semibold text-violet-800">Notes · </span>
            {micro.additionalNotes}
          </p>
        ) : null}
      </div>
    </div>
  );
}
