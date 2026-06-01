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
import type { DemoStore, LabOrder, OrderTestLine, Patient } from "@/types";
import { useEffect, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import { buildResultVerificationToken } from "@/lib/verification-token";

/** A4 with ~20 mm side margins (ISO-friendly for clinical reports). */
const SLIP = {
  page: "w-full max-w-[210mm] min-h-[297mm] mx-auto",
  pad: "px-[20mm] pt-[18mm] pb-[20mm]",
  printPage:
    "print:w-[210mm] print:min-h-[297mm] print:max-w-none print:mx-auto print:shadow-none print:rounded-none",
  printPad: "print:px-[20mm] print:pt-[18mm] print:pb-[20mm]",
} as const;

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

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(5.5rem,28%)_1fr] gap-x-3 gap-y-0.5 text-[10.5pt] leading-snug print:text-[10pt]">
      <span className="text-slate-500 print:text-neutral-600">{label}</span>
      <span className="text-slate-900 font-medium print:text-black">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[9pt] font-semibold uppercase tracking-[0.14em] text-slate-800 border-b border-slate-300 pb-1 mb-3 print:text-black print:border-neutral-400">
      {children}
    </h2>
  );
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
    const verifyUrl = `${origin}/verify/${encodeURIComponent(order.id)}?v=${buildResultVerificationToken(order.id, order.createdAt, lims)}`;
    QRCode.toDataURL(verifyUrl, {
      width: 144,
      margin: 0,
      color: { dark: "#171717", light: "#ffffff" },
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
        "relative bg-white text-slate-900 font-[system-ui,sans-serif]",
        "shadow-sm border border-slate-200/80 rounded-sm",
        SLIP.page,
        SLIP.printPage,
        hasA4Letterhead ? "print:bg-transparent" : "print:bg-white",
        "print:border-0 print:[print-color-adjust:economy] print:[-webkit-print-color-adjust:economy]",
      ].join(" ")}
    >
      {letterheadImage ? (
        <div className="pointer-events-none absolute inset-0 z-0 print:inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={letterheadImage}
            alt=""
            className="h-full w-full object-fill"
          />
        </div>
      ) : null}

      <div
        className={[
          "relative z-10 flex flex-col min-h-[297mm]",
          SLIP.pad,
          SLIP.printPad,
        ].join(" ")}
      >
        {/* Header */}
        <header className="print:break-inside-avoid">
          <div className="flex items-start justify-between gap-6 pb-4 border-b border-slate-400 print:border-neutral-500">
            {!hasA4Letterhead ? (
              <div className="flex min-w-0 flex-1 items-start gap-4">
                {store.settings.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={store.settings.logoDataUrl}
                    alt=""
                    className="h-14 w-auto max-w-[42mm] object-contain object-left shrink-0"
                  />
                ) : (
                  <div className="shrink-0 text-[11pt] font-semibold tracking-tight text-slate-800 print:text-black">
                    {store.settings.labName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")}
                  </div>
                )}
                <div className="min-w-0 space-y-0.5">
                  <h1 className="text-[14pt] font-semibold tracking-tight text-slate-900 leading-tight print:text-black">
                    {store.settings.labName}
                  </h1>
                  {store.settings.tagline ? (
                    <p className="text-[8.5pt] uppercase tracking-[0.12em] text-slate-500 print:text-neutral-600">
                      {store.settings.tagline}
                    </p>
                  ) : null}
                  <p className="text-[9pt] leading-relaxed text-slate-600 pt-1 print:text-neutral-700">
                    {store.settings.address}
                  </p>
                  <p className="text-[9pt] text-slate-600 print:text-neutral-700">
                    Tel {store.settings.phone} · {store.settings.email}
                  </p>
                  <p className="text-[8pt] text-slate-500 print:text-neutral-600">
                    Reg. {store.settings.registrationNumber}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-[12mm]" aria-hidden />
            )}

            <div className="shrink-0 text-right space-y-3">
              <div>
                <p className="text-[8pt] uppercase tracking-[0.16em] text-slate-500 print:text-neutral-600">
                  Laboratory report
                </p>
                <p className="font-mono text-[12pt] font-semibold text-slate-900 mt-0.5 print:text-black">
                  {order.id}
                </p>
                <p className="text-[9pt] text-slate-600 mt-0.5 print:text-neutral-700">
                  Issued {reportDate}
                </p>
              </div>
              <div className="inline-flex flex-col items-end">
                {qrSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrSrc}
                    width={108}
                    height={108}
                    alt={`Verify ${order.id}`}
                    className="block"
                  />
                ) : (
                  <div className="size-[108px] border border-dashed border-slate-300" />
                )}
                <p className="mt-1 max-w-[28mm] text-[7pt] leading-tight text-slate-500 text-right print:text-neutral-600">
                  Verify at scan
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Patient & request */}
        <section className="mt-5 grid gap-6 sm:grid-cols-2 print:break-inside-avoid">
          <div>
            <SectionTitle>Patient</SectionTitle>
            <p className="text-[12pt] font-semibold text-slate-900 -mt-1 mb-2 print:text-black">
              {patient?.fullName ?? order.patientId}
            </p>
            <div className="space-y-1.5">
              <MetaRow
                label="Date of birth"
                value={
                  patient
                    ? `${patient.dateOfBirth} (${patient.age} yrs)`
                    : "—"
                }
              />
              <MetaRow label="Sex" value={patient?.gender ?? "—"} />
              <MetaRow label="Contact" value={patient?.phone ?? "—"} />
            </div>
          </div>
          <div>
            <SectionTitle>Request</SectionTitle>
            <div className="space-y-1.5 mt-0">
              <MetaRow label="Priority" value={order.priority} />
              <MetaRow label="Specimen" value={order.sampleType} />
              <MetaRow
                label="Collected"
                value={order.collectionDate.replace("T", " ")}
              />
              <MetaRow label="Referrer" value={order.requestingDoctor} />
            </div>
          </div>
        </section>

        {/* Results */}
        <div className="mt-7 space-y-7 flex-1">
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
              <div key={group.id} className="print:break-inside-auto">
                {tableLines.length > 0 ? (
                  <ResultProfileResultsTable
                    title={group.title}
                    lines={tableLines}
                    specimenType={group.specimenType}
                  />
                ) : null}
                {tableLines.length === 0 && microLines.length > 0 ? (
                  <div className="mb-3">
                    <h3 className="text-[10.5pt] font-semibold text-slate-900 tracking-tight print:text-black">
                      {group.title}
                    </h3>
                    <p className="text-[9pt] text-slate-500 mt-0.5 print:text-neutral-600">
                      Specimen: {group.specimenType}
                    </p>
                    <div className="mt-2 border-b border-slate-300 print:border-neutral-400" />
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

        {/* Authorization */}
        <section className="mt-8 print:break-inside-avoid">
          <SectionTitle>Result entry &amp; authorization</SectionTitle>
          <table className="w-full border-collapse text-[9.5pt] print:text-[9pt]">
            <thead>
              <tr className="border-b-2 border-slate-400 text-left print:border-neutral-600">
                <th className="py-1.5 pr-2 font-semibold text-slate-800 print:text-black">
                  Entered by
                </th>
                <th className="py-1.5 pr-2 font-semibold text-slate-800 print:text-black">
                  Credentials
                </th>
                <th className="py-1.5 pr-2 font-semibold text-slate-800 print:text-black">
                  Authorized by
                </th>
                <th className="py-1.5 pr-2 font-semibold text-slate-800 print:text-black">
                  Auth. credentials
                </th>
                <th className="py-1.5 font-semibold text-slate-800 print:text-black">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {attributionRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-2 text-slate-500 text-center print:text-neutral-600"
                  >
                    —
                  </td>
                </tr>
              ) : (
                attributionRows.map((line, idx) => (
                  <tr
                    key={`${line.enteredBy ?? ""}-${line.verifiedBy ?? ""}-${line.verificationDate ?? ""}-${idx}`}
                    className="border-b border-slate-200 print:border-neutral-300"
                  >
                    <td className="py-1.5 pr-2 text-slate-800 print:text-black">
                      {line.enteredBy ?? "—"}
                    </td>
                    <td className="py-1.5 pr-2 text-slate-600 print:text-neutral-800">
                      {line.enteredByCredential ?? "—"}
                    </td>
                    <td className="py-1.5 pr-2 font-medium text-slate-900 print:text-black">
                      {line.verifiedBy ?? "—"}
                    </td>
                    <td className="py-1.5 pr-2 text-slate-600 print:text-neutral-800">
                      {line.verifiedByCredential ?? "—"}
                    </td>
                    <td className="py-1.5 text-slate-600 print:text-neutral-800">
                      {line.verificationDate ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-6 border-t border-slate-200 pt-4 print:border-neutral-300">
            <p className="text-[9pt] text-slate-700 print:text-black">
              <span className="font-semibold uppercase tracking-wide text-[8pt] text-slate-500 print:text-neutral-600">
                Status ·{" "}
              </span>
              {released ? "Released to requester" : order.status}
            </p>
            <div className="text-right min-w-[52mm]">
              <p className="text-[8pt] uppercase tracking-[0.12em] text-slate-500 print:text-neutral-600">
                Authorised signatory
              </p>
              <div className="mt-6 border-b border-slate-500 print:border-black" />
              <p className="mt-1 text-[7.5pt] text-slate-500 print:text-neutral-600">
                Signature · name · registration
              </p>
            </div>
          </div>
        </section>

        {order.includeAiCommentInReport && order.aiGeneratedComment ? (
          <section className="mt-7 print:break-inside-avoid">
            <SectionTitle>Interpretive summary</SectionTitle>
            <p className="text-[8pt] text-slate-500 -mt-2 mb-2 print:text-neutral-600">
              AI-assisted decision support — clinical correlation required
            </p>
            <div className="text-[10pt] leading-[1.55] text-slate-800 whitespace-pre-wrap print:text-[9.5pt] print:text-black">
              {order.aiGeneratedComment}
            </div>
          </section>
        ) : null}

        <footer className="mt-8 pt-4 border-t border-slate-300 text-[8.5pt] leading-relaxed text-slate-600 print:mt-auto print:border-neutral-400 print:text-neutral-700">
          <p className="font-medium text-slate-800 print:text-black">
            {store.settings.reportFooter}
          </p>
          <p className="mt-1.5">
            QR verification for accession{" "}
            <span className="font-mono text-slate-900 print:text-black">{order.id}</span>
            {" · "}
            {store.settings.labName}
          </p>
        </footer>
      </div>
    </div>
  );
}
