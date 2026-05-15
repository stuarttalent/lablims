"use client";

import type { CumulativeTestMatrix } from "@/lib/cumulative-tests";
import type { DemoStore, Patient } from "@/types";
import { cn } from "@/lib/utils";

export const CUMULATIVE_SLIP_ELEMENT_ID = "als-cumulative-tests-slip";

function flagClass(flag?: string): string {
  if (!flag || flag === "Normal") return "text-slate-700";
  if (flag === "Critical") return "font-semibold text-red-800";
  return "font-semibold text-amber-900";
}

export function CumulativeTestsSlip({
  patient,
  store,
  matrix,
  generatedOn,
}: {
  patient: Patient;
  store: DemoStore;
  matrix: CumulativeTestMatrix;
  generatedOn: string;
}) {
  return (
    <div
      id={CUMULATIVE_SLIP_ELEMENT_ID}
      className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-slate-900 shadow-lg print:rounded-none print:border-2 print:border-slate-400 print:shadow-none"
    >
      <div
        className="h-1.5 bg-gradient-to-r from-teal-700 via-emerald-500 to-teal-600 print:h-1 print:bg-slate-700 print:[background-image:none]"
        aria-hidden
      />

      <div className="p-6 pb-5 print:p-7">
        <header className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between print:border-slate-300">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-800 print:text-slate-800">
              Cumulative laboratory report
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-teal-950 print:text-slate-900">
              {store.settings.labName}
            </h1>
            <p className="text-xs text-slate-600 print:text-slate-800">
              {store.settings.address}
            </p>
          </div>
          <div className="shrink-0 rounded-lg border border-teal-200 bg-teal-50/90 px-3 py-2 text-xs print:border-slate-400 print:bg-white">
            <p className="font-semibold text-teal-950 print:text-slate-900">
              {patient.fullName}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-teal-900/80 print:text-slate-800">
              {patient.id}
            </p>
            <p className="mt-1 text-slate-600 print:text-slate-800">
              DOB {patient.dateOfBirth} · {patient.gender} · {patient.age} yrs
            </p>
            <p className="mt-1 text-[10px] text-slate-500 print:text-slate-700">
              Generated {generatedOn}
            </p>
          </div>
        </header>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-600 print:text-slate-800">
          Historical values for the same test parameters across visits, shown
          side by side (oldest left, most recent right). Reference intervals may
          change between visits; see each column&apos;s order for full context.
        </p>

        <div className="mt-5 space-y-8">
          {matrix.departments.map((dep) => {
            const deptRows = matrix.rows.filter((r) => r.department === dep);
            if (deptRows.length === 0) return null;

            return (
              <section key={dep}>
                <div className="flex items-center gap-2">
                  <span className="h-px flex-1 bg-gradient-to-r from-teal-600/50 to-transparent print:bg-slate-400 print:[background-image:none]" />
                  <h2 className="shrink-0 text-xs font-bold uppercase tracking-[0.15em] text-teal-900 print:text-slate-900">
                    {dep}
                  </h2>
                  <span className="h-px flex-1 bg-gradient-to-l from-teal-600/50 to-transparent print:bg-slate-400 print:[background-image:none]" />
                </div>

                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 print:border-slate-400">
                  <table className="w-full min-w-[640px] border-collapse text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white print:bg-slate-800 print:[background-image:none]">
                        <th className="sticky left-0 z-10 min-w-[10rem] bg-slate-800 px-3 py-2.5 text-left font-semibold print:bg-slate-800">
                          Parameter
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold">
                          Units
                        </th>
                        <th className="min-w-[7rem] px-3 py-2.5 text-left font-semibold">
                          Reference
                        </th>
                        {matrix.columns.map((col) => (
                          <th
                            key={col.orderId}
                            className="min-w-[5.5rem] px-3 py-2.5 text-center font-semibold"
                          >
                            <span className="block">{col.label}</span>
                            <span className="mt-0.5 block font-mono text-[9px] font-normal text-white/75 print:text-slate-300">
                              {col.orderId}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deptRows.map((row, idx) => (
                        <tr
                          key={row.testId}
                          className={
                            idx % 2 === 0
                              ? "bg-white"
                              : "bg-slate-50/80 print:bg-slate-100"
                          }
                        >
                          <td className="sticky left-0 z-10 border-r border-slate-100 bg-inherit px-3 py-2.5 font-medium text-slate-900 print:border-slate-300">
                            {row.parameterName}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 print:text-slate-800">
                            {row.units}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 print:text-slate-800">
                            {row.referenceRange}
                          </td>
                          {matrix.columns.map((col) => {
                            const cell = row.byOrder[col.orderId];
                            return (
                              <td
                                key={col.orderId}
                                className="px-3 py-2.5 text-center"
                              >
                                {cell ? (
                                  <span
                                    className={cn(
                                      "inline-flex flex-col items-center gap-0.5",
                                      flagClass(cell.flag),
                                    )}
                                  >
                                    <span>{cell.value}</span>
                                    {cell.flag && cell.flag !== "Normal" ? (
                                      <span className="rounded bg-amber-100 px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-amber-900 print:bg-white print:ring-1 print:ring-slate-500">
                                        {cell.flag}
                                      </span>
                                    ) : null}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>

        <footer className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] leading-relaxed text-slate-600 print:border-slate-400 print:bg-white print:text-slate-800">
          <p className="font-medium text-slate-800 print:text-slate-900">
            {store.settings.reportFooter}
          </p>
          <p className="mt-2">
            Cumulative view includes {matrix.columns.length} visit
            {matrix.columns.length === 1 ? "" : "s"} with entered results for
            this patient.
          </p>
        </footer>
      </div>
    </div>
  );
}
