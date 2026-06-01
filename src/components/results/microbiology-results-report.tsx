"use client";

import { getTestById } from "@/data/catalogue";
import { parseMicrobiologyResult } from "@/lib/microbiology";
import type { OrderTestLine } from "@/types";

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
    <div className="mb-6 print:break-inside-avoid-page">
      <div className="mb-2">
        <h3 className="text-[10.5pt] font-semibold text-slate-900 tracking-tight print:text-black">
          {testName}
        </h3>
        <p className="text-[9pt] text-slate-500 mt-0.5 print:text-neutral-600">
          {meta?.sampleType ?? "—"} · Culture &amp; sensitivity
        </p>
        <div className="mt-2 border-b border-slate-300 print:border-neutral-400" />
      </div>

      <table className="mb-3 w-full border-collapse text-[10pt] print:text-[9.5pt]">
        <tbody>
          <tr className="border-b border-slate-200 print:border-neutral-300">
            <td className="py-1 pr-4 text-slate-500 w-[30%] print:text-neutral-600">
              Culture
            </td>
            <td className="py-1 text-slate-900 font-medium print:text-black">
              {micro.cultureOutcome ?? "—"}
            </td>
          </tr>
          {micro.colonyCount ? (
            <tr className="border-b border-slate-200 print:border-neutral-300">
              <td className="py-1 pr-4 text-slate-500 print:text-neutral-600">
                Colony count
              </td>
              <td className="py-1 text-slate-900 print:text-black">
                {micro.colonyCount}
              </td>
            </tr>
          ) : null}
          {micro.gramStain ? (
            <tr className="border-b border-slate-200 print:border-neutral-300">
              <td className="py-1 pr-4 text-slate-500 print:text-neutral-600">
                Gram stain
              </td>
              <td className="py-1 text-slate-900 print:text-black">
                {micro.gramStain}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {micro.organisms.length > 0 ? (
        <div className="space-y-4">
          {micro.organisms.map((org, idx) => (
            <div key={idx}>
              <p className="text-[10pt] font-semibold text-slate-900 print:text-black">
                {micro.organisms.length > 1 ? `Isolate ${idx + 1}: ` : "Isolate: "}
                {org.name || "—"}
                {org.quantity ? (
                  <span className="font-normal text-slate-600 print:text-neutral-700">
                    {" "}
                    · {org.quantity}
                  </span>
                ) : null}
              </p>
              <table className="mt-1.5 w-full border-collapse text-[9.5pt] print:text-[9pt]">
                <thead>
                  <tr className="border-b border-slate-400 text-left print:border-neutral-600">
                    <th className="py-1 pr-2 font-semibold text-slate-800 print:text-black">
                      Antimicrobial
                    </th>
                    <th className="py-1 pr-2 font-semibold text-slate-800 w-12 text-center print:text-black">
                      S/I/R
                    </th>
                    <th className="py-1 font-semibold text-slate-800 w-20 print:text-black">
                      MIC
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {org.antibiotics
                    .filter((a) => a.drug.trim())
                    .map((ab, j) => (
                      <tr
                        key={j}
                        className="border-b border-slate-200/80 print:border-neutral-200"
                      >
                        <td className="py-[3px] pr-2 text-slate-900 print:text-black">
                          {ab.drug}
                        </td>
                        <td className="py-[3px] pr-2 text-center font-semibold text-slate-900 print:text-black">
                          {ab.result}
                        </td>
                        <td className="py-[3px] text-slate-600 print:text-neutral-700">
                          {ab.mic || "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : micro.cultureOutcome === "No growth" ||
        micro.cultureOutcome === "Normal flora" ? (
        <p className="text-[9.5pt] text-slate-600 italic print:text-neutral-700">
          No isolate susceptibility reported.
        </p>
      ) : null}

      {micro.additionalNotes ? (
        <p className="mt-3 text-[9pt] leading-snug text-slate-700 pl-3 border-l border-slate-400 print:text-neutral-800 print:border-neutral-500">
          <span className="font-semibold text-slate-800 print:text-black">Notes · </span>
          {micro.additionalNotes}
        </p>
      ) : null}
    </div>
  );
}
