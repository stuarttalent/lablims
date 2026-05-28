"use client";

import { getTestById } from "@/data/catalogue";
import type { DemoStore, LabOrder, OrderTestLine, Patient, TestDepartment } from "@/types";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildResultVerificationToken } from "@/lib/verification-token";

const DEPT_ORDER: TestDepartment[] = [
  "Haematology",
  "Chemistry",
  "Microbiology",
  "Serology/Immunology",
  "Molecular",
];

/** One row per distinct enterer / authorizer combination (no repeated users). */
function uniqueAttributionRows(tests: OrderTestLine[]): OrderTestLine[] {
  const seen = new Set<string>();
  const out: OrderTestLine[] = [];
  for (const line of tests) {
    const key = [
      line.enteredBy ?? "",
      line.enteredByCredential ?? "",
      line.verifiedBy ?? "",
      line.verifiedByCredential ?? "",
      line.verificationDate ?? "",
    ].join("\u001f");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

export function ResultSlipDocument({
  order,
  patient,
  store,
}: {
  order: LabOrder;
  patient?: Patient;
  store: DemoStore;
}) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [branchLetterheadPdf, setBranchLetterheadPdf] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const lims = store.settings.limsInstanceId ?? "";
    const verifyUrl = `${origin}/verify/${encodeURIComponent(order.id)}?v=${buildResultVerificationToken(order.id, order.createdAt, lims)}`;
    QRCode.toDataURL(verifyUrl, {
      width: 160,
      margin: 1,
      color: { dark: "#0c3929", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => {
        if (!cancelled) setQrSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [order.id, order.createdAt, store.settings.limsInstanceId]);

  useEffect(() => {
    let cancelled = false;
    if (!order.branchId) {
      setBranchLetterheadPdf(null);
      return;
    }
    fetch(`/api/branches/${order.branchId}/letterhead`, { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as { letterheadPdfDataUrl?: string | null };
        if (!cancelled) setBranchLetterheadPdf(data.letterheadPdfDataUrl ?? null);
      })
      .catch(() => {
        if (!cancelled) setBranchLetterheadPdf(null);
      });
    return () => {
      cancelled = true;
    };
  }, [order.branchId]);

  const grouped = new Map<TestDepartment, typeof order.tests>();
  for (const d of DEPT_ORDER) grouped.set(d, []);
  for (const line of order.tests) {
    const dep = getTestById(line.testId)?.department;
    if (!dep) continue;
    const arr = grouped.get(dep) ?? [];
    arr.push(line);
    grouped.set(dep, arr);
  }

  const reportDate = new Date().toISOString().slice(0, 10);
  const released =
    order.status === "Released" ||
    order.tests.some((l) => l.resultStatus === "Released");
  const letterheadPdfUrl =
    branchLetterheadPdf ?? store.settings.letterheadA4PdfDataUrl ?? null;
  const hasA4Letterhead = Boolean(letterheadPdfUrl);

  const attributionRows = uniqueAttributionRows(order.tests);

  return (
    <div
      id="lablims-result-slip"
      data-has-pdf-letterhead={hasA4Letterhead ? "true" : "false"}
      className={`relative rounded-2xl border border-slate-200/90 text-slate-900 shadow-lg print:rounded-none print:border-2 print:border-slate-400 print:shadow-none print:w-[210mm] print:min-h-[297mm] print:[print-color-adjust:economy] print:[-webkit-print-color-adjust:economy] ${hasA4Letterhead ? "bg-transparent" : "bg-white"}`}
    >
      {hasA4Letterhead ? (
        <div className="pointer-events-none absolute inset-0 z-0">
          <object
            data={letterheadPdfUrl ?? undefined}
            type="application/pdf"
            className="h-full w-full"
            aria-label="A4 letterhead"
          />
        </div>
      ) : null}

      <div
        className={`h-1.5 bg-gradient-to-r from-teal-700 via-emerald-500 to-teal-600 print:h-1 print:bg-slate-700 print:[background-image:none] ${hasA4Letterhead ? "opacity-0" : ""}`}
        aria-hidden
      />

      <div className="relative z-10 p-8 pb-6 print:p-7">
        <header className="flex flex-col gap-6 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between print:border-slate-300">
          {!hasA4Letterhead ? (
            <div className="flex flex-1 flex-wrap items-start gap-5">
              {store.settings.logoDataUrl ? (
                <div className="flex h-20 w-36 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50/80 p-2 print:border-slate-300 print:bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL letterhead for PDF capture */}
                  <img
                    src={store.settings.logoDataUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-700 to-emerald-700 text-lg font-bold tracking-tight text-white shadow-md print:bg-slate-800 print:text-white print:shadow-none print:[background-image:none]">
                  {store.settings.labName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")}
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-teal-950 print:text-slate-900">
                  {store.settings.labName}
                </h1>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-700/80 print:text-slate-700">
                  {store.settings.tagline}
                </p>
                <p className="max-w-md text-[11px] leading-relaxed text-slate-600 print:text-slate-800">
                  {store.settings.address}
                </p>
                <p className="text-[11px] text-slate-600 print:text-slate-800">
                  Tel <span className="font-medium">{store.settings.phone}</span>
                  {" · "}
                  <span className="font-medium">{store.settings.email}</span>
                </p>
                <p className="text-[10px] text-slate-500 print:text-slate-600">
                  Licence / registration: {store.settings.registrationNumber}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex shrink-0 flex-col items-end gap-3 sm:pl-4">
            <div className="rounded-lg border border-teal-200 bg-teal-50/90 px-3 py-1.5 text-center shadow-sm print:border-2 print:border-slate-500 print:bg-white print:shadow-none">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-800 print:text-slate-900">
                Official result report
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-teal-950 print:text-slate-900">
                {order.id}
              </p>
              <p className="text-[10px] text-teal-800/80 print:text-slate-700">
                Issued {reportDate}
              </p>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-2 shadow-sm print:border-slate-400 print:shadow-none">
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrSrc}
                  width={128}
                  height={128}
                  alt={`Verify ${order.id}`}
                  className="rounded-md"
                />
              ) : (
                <div className="size-[128px] rounded-md bg-slate-50" />
              )}
              <p className="mt-1.5 max-w-[140px] text-center text-[9px] leading-snug text-slate-500 print:text-slate-700">
                Scan to verify this report
              </p>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 rounded-xl border border-slate-100 bg-slate-50/40 p-4 sm:grid-cols-2 print:break-inside-avoid print:border-slate-400 print:bg-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800 print:text-slate-800">
              Patient
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {patient?.fullName ?? order.patientId}
            </p>
            <p className="mt-1 text-xs text-slate-600 print:text-slate-800">
              DOB {patient?.dateOfBirth} · {patient?.gender} · {patient?.age}{" "}
              yrs
            </p>
            <p className="text-xs text-slate-600 print:text-slate-800">{patient?.phone}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800 print:text-slate-800">
              Request
            </p>
            <p className="mt-1 text-xs text-slate-700 print:text-slate-800">
              <span className="font-medium text-slate-900">Priority:</span>{" "}
              {order.priority}
            </p>
            <p className="text-xs text-slate-700 print:text-slate-800">
              <span className="font-medium text-slate-900">Sample:</span>{" "}
              {order.sampleType}
            </p>
            <p className="text-xs text-slate-700 print:text-slate-800">
              <span className="font-medium text-slate-900">Collection:</span>{" "}
              {order.collectionDate.replace("T", " ")}
            </p>
            <p className="text-xs text-slate-700 print:text-slate-800">
              <span className="font-medium text-slate-900">Referrer:</span>{" "}
              {order.requestingDoctor}
            </p>
          </div>
        </section>

        <div className="mt-6 space-y-8">
          {DEPT_ORDER.map((dep) => {
            const lines = grouped.get(dep) ?? [];
            if (lines.length === 0) return null;
            return (
              <div key={dep} className="print:break-inside-avoid-page">
                <div className="flex items-center gap-2">
                  <span className="h-px flex-1 bg-gradient-to-r from-teal-600/50 to-transparent print:bg-slate-400 print:[background-image:none]" />
                  <h2 className="shrink-0 text-xs font-bold uppercase tracking-[0.15em] text-teal-900 print:text-slate-900">
                    {dep}
                  </h2>
                  <span className="h-px flex-1 bg-gradient-to-l from-teal-600/50 to-transparent print:bg-slate-400 print:[background-image:none]" />
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 print:border-slate-400">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white print:bg-slate-800 print:text-white print:[background-image:none]">
                        <th className="px-3 py-2.5 text-left font-semibold">
                          Test
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold">
                          Result
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold">
                          Units
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold">
                          Reference
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold">
                          Flag
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => {
                        const meta = getTestById(line.testId);
                        const abnormal = line.flag && line.flag !== "Normal";
                        return (
                          <tr
                            key={line.testId}
                            className={
                              idx % 2 === 0
                                ? "bg-white print:bg-white"
                                : "bg-slate-50/80 print:bg-slate-100"
                            }
                          >
                            <td
                              className={`px-3 py-2.5 font-medium print:text-slate-900 ${abnormal ? "text-amber-900 print:text-slate-900 print:font-semibold" : "text-slate-900"}`}
                            >
                              {meta?.name ?? line.testId}
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-slate-900 print:text-black">
                              {line.resultValue ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-slate-700 print:text-slate-800">
                              {line.units ?? meta?.units ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 print:text-slate-800">
                              {line.referenceRange ?? meta?.referenceRange ?? "—"}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={
                                  abnormal
                                    ? "rounded-md bg-amber-100 px-2 py-0.5 font-medium text-amber-900 print:bg-white print:px-2 print:py-0.5 print:font-semibold print:text-slate-900 print:ring-1 print:ring-slate-500"
                                    : "text-slate-600 print:text-slate-800"
                                }
                              >
                                {line.flag ?? "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {lines.map((line) =>
                    line.comment ? (
                      <p
                        key={`${line.testId}-c`}
                        className="border-t border-slate-100 bg-amber-50/50 px-3 py-2 text-[11px] text-amber-950 print:border-slate-300 print:bg-white print:border-l-4 print:border-l-slate-600 print:text-slate-900"
                      >
                        <span className="font-semibold">Clinical comment:</span>{" "}
                        {line.comment}
                      </p>
                    ) : null,
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <section className="mt-8 overflow-hidden rounded-xl border border-teal-100 bg-gradient-to-b from-white to-teal-50/30 shadow-sm print:break-inside-avoid print:border-2 print:border-slate-400 print:bg-white print:from-white print:to-white print:shadow-none">
          <div className="border-b border-teal-100 bg-teal-900/95 px-4 py-2 print:border-slate-600 print:bg-slate-800 print:text-white print:[background-image:none]">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">
              Result entry &amp; authorization
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600 print:bg-white print:text-slate-800">
                  <th className="px-3 py-2 font-semibold">Entered by</th>
                  <th className="px-3 py-2 font-semibold">Credentials</th>
                  <th className="px-3 py-2 font-semibold">Authorized by</th>
                  <th className="px-3 py-2 font-semibold">Auth. credentials</th>
                  <th className="px-3 py-2 font-semibold">Auth. date</th>
                </tr>
              </thead>
              <tbody>
                {attributionRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-center text-slate-500 print:text-slate-700">
                      —
                    </td>
                  </tr>
                ) : (
                  attributionRows.map((line, idx) => (
                    <tr
                      key={`${line.enteredBy ?? ""}-${line.verifiedBy ?? ""}-${line.verificationDate ?? ""}-${idx}`}
                      className="border-b border-slate-100 last:border-0 print:border-slate-200"
                    >
                      <td className="px-3 py-2 text-slate-800 print:text-slate-900">
                        {line.enteredBy ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600 print:text-slate-800">
                        {line.enteredByCredential ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-medium text-teal-900 print:text-slate-900">
                        {line.verifiedBy ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600 print:text-slate-800">
                        {line.verifiedByCredential ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600 print:text-slate-800">
                        {line.verificationDate ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-teal-100 px-4 py-3 print:border-slate-300">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide print:rounded-md print:border print:border-slate-600 print:bg-white ${released ? "bg-emerald-100 text-emerald-900 print:text-slate-900" : "bg-amber-100 text-amber-900 print:text-slate-900"}`}
              >
                {released ? "Released to requester" : order.status}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 print:text-slate-700">
                Authorised signatory
              </p>
              <div className="mt-3 inline-block min-w-[200px] border-b-2 border-slate-400 print:border-slate-700" />
              <p className="mt-1 text-[10px] text-slate-500 print:text-slate-700">
                Signature · name · professional registration
              </p>
            </div>
          </div>
        </section>

        {order.includeAiCommentInReport && order.aiGeneratedComment ? (
          <section className="mt-8 overflow-hidden rounded-xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 to-white shadow-sm print:border-2 print:border-slate-400 print:bg-white print:from-white print:to-white print:shadow-none">
            <div className="border-b border-indigo-100 bg-indigo-950/90 px-4 py-2 print:border-slate-600 print:bg-slate-800 print:text-white print:[background-image:none]">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">
                Interpretive summary (AI-assisted)
              </h3>
            </div>
            <div className="px-5 py-4 text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap print:text-slate-900">
              {order.aiGeneratedComment}
            </div>
            <p className="border-t border-indigo-100 px-5 py-2 text-[9px] text-slate-500 print:border-slate-300 print:text-slate-700">
              This narrative is generated as decision support only. Clinical correlation is
              required; it does not replace professional judgment.
            </p>
          </section>
        ) : null}

        <footer className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-[10px] leading-relaxed text-slate-600 print:border-slate-400 print:bg-white print:text-slate-800">
          <p className="font-medium text-slate-800 print:text-slate-900">{store.settings.reportFooter}</p>
          <p className="mt-2">
            The QR code on this report encodes a secure verification link for
            accession{" "}
            <span className="font-mono font-semibold text-slate-900">
              {order.id}
            </span>{" "}
            on the issuing laboratory system.
          </p>
        </footer>
      </div>
    </div>
  );
}
