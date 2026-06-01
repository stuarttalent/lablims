"use client";

import { getTestById } from "@/data/catalogue";
import { parseMicrobiologyResult } from "@/lib/microbiology";
import type { OrderTestLine } from "@/types";

function susClass(result: string): string {
  if (result === "S") return "text-emerald-800 font-bold";
  if (result === "R") return "text-red-800 font-bold";
  if (result === "I") return "text-amber-800 font-bold";
  return "text-slate-600";
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
    <div className="mb-6 print:break-inside-avoid-page rounded-lg border border-slate-200 bg-white/90 p-4">
      <div className="mb-3 border-b border-blue-200 pb-2">
        <h3 className="text-sm font-bold text-blue-800">{testName}</h3>
        <p className="text-[10px] text-slate-600">
          Specimen: {meta?.sampleType ?? "—"} · Culture &amp; sensitivity
        </p>
      </div>

      <table className="mb-3 w-full text-[11px] print:text-[12pt]">
        <tbody>
          <tr className="border-b border-slate-100">
            <td className="py-1 pr-3 font-semibold text-slate-700 w-[32%]">Culture</td>
            <td className="py-1 text-slate-900">{micro.cultureOutcome ?? "—"}</td>
          </tr>
          {micro.colonyCount ? (
            <tr className="border-b border-slate-100">
              <td className="py-1 pr-3 font-semibold text-slate-700">Colony count</td>
              <td className="py-1 text-slate-900">{micro.colonyCount}</td>
            </tr>
          ) : null}
          {micro.gramStain ? (
            <tr className="border-b border-slate-100">
              <td className="py-1 pr-3 font-semibold text-slate-700">Gram stain</td>
              <td className="py-1 text-slate-900">{micro.gramStain}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {micro.organisms.length > 0 ? (
        <div className="space-y-4">
          {micro.organisms.map((org, idx) => (
            <div key={idx}>
              <p className="text-xs font-bold text-slate-900">
                Organism {micro.organisms.length > 1 ? idx + 1 : ""}: {org.name || "—"}
                {org.quantity ? (
                  <span className="font-normal text-slate-600"> · {org.quantity}</span>
                ) : null}
              </p>
              <table className="mt-1 w-full border-collapse text-[10px] print:text-[11pt]">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-50 text-left">
                    <th className="px-2 py-1 font-semibold">Antimicrobial</th>
                    <th className="px-2 py-1 font-semibold w-12">S/I/R</th>
                    <th className="px-2 py-1 font-semibold w-20">MIC</th>
                  </tr>
                </thead>
                <tbody>
                  {org.antibiotics
                    .filter((a) => a.drug.trim())
                    .map((ab, j) => (
                      <tr key={j} className="border-b border-slate-100">
                        <td className="px-2 py-1">{ab.drug}</td>
                        <td className={`px-2 py-1 ${susClass(ab.result)}`}>
                          {ab.result}
                        </td>
                        <td className="px-2 py-1 text-slate-700">{ab.mic || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : micro.cultureOutcome === "No growth" || micro.cultureOutcome === "Normal flora" ? (
        <p className="text-xs text-slate-800 italic">No isolate susceptibility reported.</p>
      ) : null}

      {micro.additionalNotes ? (
        <p className="mt-3 border-l-2 border-slate-400 pl-2 text-[10px] text-slate-800">
          <span className="font-semibold">Notes:</span> {micro.additionalNotes}
        </p>
      ) : null}
    </div>
  );
}
