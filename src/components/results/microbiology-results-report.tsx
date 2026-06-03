"use client";

import { getTestById } from "@/data/catalogue";
import { parseMicrobiologyResult } from "@/lib/microbiology";
import type { OrderTestLine } from "@/types";

function susClass(result: string): string {
  if (result === "S") return "text-emerald-700 font-bold";
  if (result === "R") return "text-red-700 font-bold";
  if (result === "I") return "text-amber-700 font-bold";
  return "text-neutral-600";
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
  const specimenUpper = (meta?.sampleType ?? "—").toUpperCase();

  return (
    <div className="mt-4 print:break-inside-avoid-page">
      <h3 className="m-0 text-[12pt] font-bold text-[#1a4d8f] font-sans tracking-tight">
        {testName}
      </h3>
      <p className="mt-1 mb-2 font-mono text-[10pt] uppercase tracking-wide text-neutral-800">
        SPECIMEN TYPE : {specimenUpper} · CULTURE &amp; SENSITIVITY
      </p>

      <table className="mb-2 w-full border-collapse font-mono text-[10.5pt]">
        <tbody>
          <tr className="border-b border-neutral-200">
            <td className="py-[2px] pr-3 font-semibold text-[#1a4d8f] w-[30%]">
              Culture
            </td>
            <td className="py-[2px]">{micro.cultureOutcome ?? "—"}</td>
          </tr>
          {micro.colonyCount ? (
            <tr className="border-b border-neutral-200">
              <td className="py-[2px] pr-3 font-semibold text-[#1a4d8f]">
                Colony count
              </td>
              <td className="py-[2px]">{micro.colonyCount}</td>
            </tr>
          ) : null}
          {micro.gramStain ? (
            <tr className="border-b border-neutral-200">
              <td className="py-[2px] pr-3 font-semibold text-[#1a4d8f]">
                Gram stain
              </td>
              <td className="py-[2px]">{micro.gramStain}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {micro.organisms.length > 0 ? (
        <div className="space-y-3">
          {micro.organisms.map((org, idx) => (
            <div key={idx}>
              <p className="m-0 font-mono text-[10pt] font-bold text-neutral-900">
                Organism {micro.organisms.length > 1 ? `${idx + 1}: ` : ": "}
                {org.name || "—"}
                {org.quantity ? ` · ${org.quantity}` : ""}
              </p>
              <table className="mt-1 w-full border-collapse font-mono text-[10pt]">
                <thead>
                  <tr className="border-b border-neutral-400">
                    <th className="py-1 pr-2 text-left font-bold">Antimicrobial</th>
                    <th className="py-1 pr-2 font-bold w-12">S/I/R</th>
                    <th className="py-1 font-bold w-20">MIC</th>
                  </tr>
                </thead>
                <tbody>
                  {org.antibiotics
                    .filter((a) => a.drug.trim())
                    .map((ab, j) => (
                      <tr key={j} className="border-b border-neutral-200/80">
                        <td className="py-[2px] pr-2">{ab.drug}</td>
                        <td className={`py-[2px] pr-2 ${susClass(ab.result)}`}>
                          {ab.result}
                        </td>
                        <td className="py-[2px]">{ab.mic || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : micro.cultureOutcome === "No growth" ||
        micro.cultureOutcome === "Normal flora" ? (
        <p className="font-mono text-[10pt] italic text-neutral-700">
          No isolate susceptibility reported.
        </p>
      ) : null}

      {micro.additionalNotes ? (
        <p className="mt-2 font-mono text-[10pt] text-neutral-800">
          <span className="font-semibold text-[#1a4d8f]">Notes:</span>{" "}
          {micro.additionalNotes}
        </p>
      ) : null}
    </div>
  );
}
