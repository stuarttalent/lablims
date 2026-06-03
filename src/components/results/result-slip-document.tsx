"use client";

import {
  ResultProfileComments,
  ResultProfileResultsTable,
} from "@/components/results/result-profile-results-table";
import { MicrobiologyResultsReport } from "@/components/results/microbiology-results-report";
import { getTestById } from "@/data/catalogue";
import { filterFbcLinesForDisplay } from "@/lib/fbc-differential";
import { groupOrderTests } from "@/lib/group-order-tests";
import { isMicrobiologyMcsTest } from "@/lib/microbiology";
import { letterheadPdfToImage } from "@/lib/letterhead-image";
import { A4_MARGIN_CSS } from "@/lib/result-slip-a4";
import type { DemoStore, LabOrder, OrderTestLine, Patient } from "@/types";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildResultVerificationToken } from "@/lib/verification-token";

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
  onReady,
}: {
  order: LabOrder;
  patient?: Patient;
  store: DemoStore;
  onReady?: () => void;
}) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [branchLetterheadPdf, setBranchLetterheadPdf] = useState<string | null>(null);
  const [letterheadImage, setLetterheadImage] = useState<string | null>(null);
  const [letterheadResolved, setLetterheadResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const lims = store.settings.limsInstanceId ?? "";
    const token = buildResultVerificationToken(order.id, order.createdAt, lims);
    const verifyParams = new URLSearchParams({ v: token });
    if (lims) verifyParams.set("lims", lims);
    const verifyUrl = `${origin}/verify/${encodeURIComponent(order.id)}?${verifyParams.toString()}`;
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

  const letterheadPdfUrl =
    branchLetterheadPdf ?? store.settings.letterheadA4PdfDataUrl ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!letterheadPdfUrl) {
      setLetterheadImage(null);
      setLetterheadResolved(true);
      return;
    }
    setLetterheadResolved(false);
    void letterheadPdfToImage(letterheadPdfUrl)
      .then((img) => {
        if (!cancelled) setLetterheadImage(img);
      })
      .finally(() => {
        if (!cancelled) setLetterheadResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [letterheadPdfUrl]);

  useEffect(() => {
    if (!letterheadResolved) return;
    onReady?.();
  }, [letterheadResolved, onReady]);

  const resultGroups = groupOrderTests(order.tests, store.settings);
  const reportDate = new Date().toISOString().slice(0, 10);
  const released =
    order.status === "Released" ||
    order.tests.some((l) => l.resultStatus === "Released");
  const hasA4Letterhead = Boolean(letterheadImage || letterheadPdfUrl);
  const attributionRows = uniqueAttributionRows(order.tests);

  return (
    <div
      id="lablims-result-slip"
      data-has-pdf-letterhead={hasA4Letterhead ? "true" : "false"}
      className={[
        "result-slip-a4-page relative overflow-hidden bg-white text-slate-900",
        "print:rounded-none print:border-0 print:shadow-none",
        hasA4Letterhead ? "print:bg-transparent" : "print:bg-white",
        "print:[print-color-adjust:exact] print:[-webkit-print-color-adjust:exact]",
      ].join(" ")}
      style={{
        width: "210mm",
        minHeight: "297mm",
        maxWidth: "210mm",
        boxSizing: "border-box",
      }}
    >
      {letterheadImage ? (
        <div className="pointer-events-none absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={letterheadImage}
            alt=""
            className="h-full w-full object-fill"
          />
        </div>
      ) : null}

      <div
        className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-700 via-emerald-500 to-teal-600 z-[1] ${hasA4Letterhead ? "opacity-0" : ""}`}
        aria-hidden
      />

      <div
        className="relative z-10 flex min-h-[297mm] flex-col"
        style={{ padding: A4_MARGIN_CSS, boxSizing: "border-box" }}
      >
        <header className="result-slip-pdf-block flex flex-col gap-6 border-b border-teal-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
          {!hasA4Letterhead ? (
            <div className="flex flex-1 flex-wrap items-start gap-5">
              {store.settings.logoDataUrl ? (
                <div className="flex h-[72px] w-36 shrink-0 items-center justify-center rounded-xl border border-teal-100 bg-gradient-to-b from-teal-50/80 to-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={store.settings.logoDataUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-700 to-emerald-600 text-lg font-bold tracking-tight text-white">
                  {store.settings.labName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")}
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-teal-950">
                  {store.settings.labName}
                </h1>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-600/90">
                  {store.settings.tagline}
                </p>
                <p className="max-w-md text-[11px] leading-relaxed text-slate-600">
                  {store.settings.address}
                </p>
                <p className="text-[11px] text-slate-600">
                  Tel <span className="font-medium text-slate-800">{store.settings.phone}</span>
                  {" · "}
                  <span className="font-medium text-slate-800">{store.settings.email}</span>
                </p>
                <p className="text-[10px] text-teal-700/80">
                  Licence / registration: {store.settings.registrationNumber}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-[14mm]" aria-hidden />
          )}

          <div className="flex shrink-0 flex-col items-end gap-3 sm:pl-4">
            <div className="rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50 to-emerald-50/60 px-4 py-2.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-800">
                Official result report
              </p>
              <p className="mt-0.5 font-mono text-sm font-bold text-teal-950">
                {order.id}
              </p>
              <p className="text-[10px] text-teal-700/90">Issued {reportDate}</p>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-slate-200/80 bg-white p-2.5">
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrSrc}
                  width={120}
                  height={120}
                  alt={`Verify ${order.id}`}
                  className="rounded-lg"
                />
              ) : (
                <div className="size-[120px] rounded-lg bg-slate-50" />
              )}
              <p className="mt-1.5 max-w-[130px] text-center text-[9px] leading-snug text-slate-500">
                Scan to verify this report
              </p>
            </div>
          </div>
        </header>

        <section className="result-slip-pdf-block mt-6 grid gap-4 rounded-2xl border border-teal-100/80 bg-gradient-to-br from-slate-50/90 via-teal-50/30 to-emerald-50/20 p-5 sm:grid-cols-2">
          <div className="rounded-xl bg-white/70 p-4 ring-1 ring-teal-100/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
              Patient
            </p>
            <p className="mt-1.5 text-base font-semibold text-slate-900">
              {patient?.fullName ?? order.patientId}
            </p>
            <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
              <div className="flex gap-2">
                <dt className="text-teal-700/80 w-20 shrink-0">DOB</dt>
                <dd className="font-medium text-slate-800">
                  {patient?.dateOfBirth} · {patient?.gender} · {patient?.age} yrs
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-teal-700/80 w-20 shrink-0">Phone</dt>
                <dd className="font-medium text-slate-800">{patient?.phone ?? "—"}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-xl bg-white/70 p-4 ring-1 ring-teal-100/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
              Request
            </p>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex gap-2">
                <dt className="text-teal-700/80 w-24 shrink-0">Priority</dt>
                <dd className="font-medium text-slate-800">{order.priority}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-teal-700/80 w-24 shrink-0">Sample</dt>
                <dd className="font-medium text-slate-800">{order.sampleType}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-teal-700/80 w-24 shrink-0">Collection</dt>
                <dd className="font-medium text-slate-800">
                  {order.collectionDate.replace("T", " ")}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-teal-700/80 w-24 shrink-0">Referrer</dt>
                <dd className="font-medium text-slate-800">{order.requestingDoctor}</dd>
              </div>
            </dl>
          </div>
        </section>

        <div className="mt-7 space-y-6 flex-1">
          {resultGroups.map((group) => {
            const microLines = group.lines.filter((l) =>
              isMicrobiologyMcsTest(l.testId, store.settings),
            );
            const tableLines = filterFbcLinesForDisplay(
              group.lines.filter(
                (l) => !isMicrobiologyMcsTest(l.testId, store.settings),
              ),
            );
            return (
              <div key={group.id} className="space-y-4">
                {tableLines.length > 0 ? (
                  <ResultProfileResultsTable
                    title={group.title}
                    lines={tableLines}
                    specimenType={group.specimenType}
                  />
                ) : null}
                {tableLines.length === 0 && microLines.length > 0 ? (
                  <div className="result-slip-pdf-block mb-3 rounded-t-xl bg-gradient-to-r from-teal-700 to-emerald-600 px-4 py-2.5">
                    <h3 className="text-sm font-bold text-white">{group.title}</h3>
                    <p className="text-[10px] text-teal-50/90">
                      Specimen: {group.specimenType}
                    </p>
                  </div>
                ) : null}
                {microLines.map((line) => (
                  <MicrobiologyResultsReport
                    key={line.testId}
                    testName={
                      getTestById(line.testId, store.settings)?.name ?? line.testId
                    }
                    line={line}
                  />
                ))}
                <ResultProfileComments lines={group.lines} />
              </div>
            );
          })}
        </div>

        <section className="result-slip-pdf-block mt-8 overflow-hidden rounded-2xl border border-teal-100">
          <div className="bg-gradient-to-r from-teal-800 to-emerald-700 px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">
              Result entry &amp; authorization
            </h3>
          </div>
          <div className="overflow-x-auto bg-white">
            <table className="w-full min-w-[480px] text-[11px]">
              <thead>
                <tr className="border-b border-teal-100 bg-teal-50/80 text-left text-teal-900">
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
                    <td colSpan={5} className="px-3 py-3 text-center text-slate-500">
                      —
                    </td>
                  </tr>
                ) : (
                  attributionRows.map((line, idx) => (
                    <tr
                      key={`${line.enteredBy ?? ""}-${line.verifiedBy ?? ""}-${line.verificationDate ?? ""}-${idx}`}
                      className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}
                    >
                      <td className="px-3 py-2 text-slate-800">{line.enteredBy ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {line.enteredByCredential ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-medium text-teal-900">
                        {line.verifiedBy ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {line.verifiedByCredential ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {line.verificationDate ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-teal-100 bg-gradient-to-r from-teal-50/50 to-emerald-50/30 px-4 py-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                released
                  ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                  : "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
              }`}
            >
              {released ? "Released to requester" : order.status}
            </span>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-700">
                Authorised signatory
              </p>
              <div className="mt-3 inline-block min-w-[200px] border-b-2 border-teal-400" />
              <p className="mt-1 text-[10px] text-slate-500">
                Signature · name · professional registration
              </p>
            </div>
          </div>
        </section>

        {order.includeAiCommentInReport && order.aiGeneratedComment ? (
          <section className="result-slip-pdf-block mt-8 overflow-hidden rounded-2xl border border-indigo-200/90">
            <div className="bg-gradient-to-r from-indigo-700 to-violet-700 px-4 py-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">
                Interpretive summary (AI-assisted)
              </h3>
            </div>
            <div className="bg-gradient-to-b from-indigo-50/50 to-white px-5 py-4 text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap">
              {order.aiGeneratedComment}
            </div>
            <p className="border-t border-indigo-100 bg-indigo-50/40 px-5 py-2 text-[9px] text-indigo-800/80">
              Decision support only — clinical correlation required; does not replace
              professional judgment.
            </p>
          </section>
        ) : null}

        <footer className="result-slip-pdf-block mt-8 rounded-xl border border-teal-100 bg-gradient-to-br from-slate-50 to-teal-50/40 px-5 py-4 text-[10px] leading-relaxed text-slate-600">
          <p className="font-medium text-teal-900">{store.settings.reportFooter}</p>
          <p className="mt-2">
            The QR code encodes a secure verification link for accession{" "}
            <span className="font-mono font-semibold text-teal-800">{order.id}</span> on
            the issuing laboratory system.
          </p>
        </footer>
      </div>
    </div>
  );
}
