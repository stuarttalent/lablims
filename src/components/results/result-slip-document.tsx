"use client";

import {
  ResultProfileComments,
  ResultProfileResultsTable,
} from "@/components/results/result-profile-results-table";
import { MicrobiologyResultsReport } from "@/components/results/microbiology-results-report";
import {
  ResultInfoBox,
  ResultInfoLine,
} from "@/components/results/result-slip-info-box";
import { getTestById } from "@/data/catalogue";
import { filterFbcLinesForDisplay } from "@/lib/fbc-differential";
import { groupOrderTests } from "@/lib/group-order-tests";
import { isMicrobiologyMcsTest } from "@/lib/microbiology";
import { letterheadPdfToImage } from "@/lib/letterhead-image";
import { A4_MARGIN_CSS } from "@/lib/result-slip-a4";
import {
  clinicalDataText,
  formatSlipDateTime,
  paymentMethodLabel,
  requestedTestsLabel,
} from "@/lib/result-slip-meta";
import { buildResultVerificationToken } from "@/lib/verification-token";
import type { DemoStore, LabOrder, OrderTestLine, Patient } from "@/types";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

const REPORT_BLUE = "#1a4d8f";

function uniqueAttributionRows(tests: OrderTestLine[]): OrderTestLine[] {
  const seen = new Set<string>();
  const out: OrderTestLine[] = [];
  for (const line of tests) {
    const key = [
      line.enteredBy ?? "",
      line.verifiedBy ?? "",
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
    const verifyUrl = `${origin}/verify/${encodeURIComponent(order.id)}?v=${buildResultVerificationToken(order.id, order.createdAt, lims)}`;
    QRCode.toDataURL(verifyUrl, {
      width: 96,
      margin: 0,
      color: { dark: REPORT_BLUE, light: "#ffffff" },
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
  const reportDate = formatSlipDateTime(new Date().toISOString());
  const collectionDate = formatSlipDateTime(order.collectionDate);
  const hasA4Letterhead = Boolean(letterheadImage || letterheadPdfUrl);
  const attributionRows = uniqueAttributionRows(order.tests);
  const primaryEntered = attributionRows.find((l) => l.enteredBy)?.enteredBy;
  const primaryAuthorized = attributionRows.find((l) => l.verifiedBy)?.verifiedBy;
  const requestedTests = requestedTestsLabel(order, store.settings);
  const payment = paymentMethodLabel(store, order, patient);
  const clinical = clinicalDataText(order, patient);
  const ageLabel = patient ? `${patient.age} years` : "—";

  return (
    <div
      id="lablims-result-slip"
      data-has-pdf-letterhead={hasA4Letterhead ? "true" : "false"}
      className={[
        "result-slip-a4-page result-slip-daylight relative overflow-hidden bg-white text-neutral-900",
        hasA4Letterhead ? "print:bg-transparent" : "",
        "print:[print-color-adjust:exact] print:[-webkit-print-color-adjust:exact]",
      ].join(" ")}
      style={{
        width: "210mm",
        minHeight: "297mm",
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
        className="relative z-10 flex min-h-[297mm] flex-col font-sans"
        style={{ padding: A4_MARGIN_CSS, boxSizing: "border-box" }}
      >
        {!hasA4Letterhead ? (
          <header className="print:break-inside-avoid">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {store.settings.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={store.settings.logoDataUrl}
                    alt=""
                    className="h-14 w-auto max-w-[48mm] object-contain shrink-0"
                  />
                ) : null}
                <div>
                  <h1
                    className="m-0 text-[15pt] font-bold leading-tight"
                    style={{ color: REPORT_BLUE }}
                  >
                    {store.settings.labName}
                  </h1>
                  {store.settings.tagline ? (
                    <p
                      className="m-0 mt-0.5 text-[9pt] font-semibold uppercase tracking-wide"
                      style={{ color: REPORT_BLUE }}
                    >
                      {store.settings.tagline}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="shrink-0 text-right text-[9pt] leading-snug max-w-[48%]">
                <p
                  className="m-0 whitespace-pre-line font-semibold"
                  style={{ color: REPORT_BLUE }}
                >
                  {store.settings.address}
                </p>
                <p className="m-0 mt-1 font-semibold" style={{ color: REPORT_BLUE }}>
                  {store.settings.phone}
                </p>
                <p className="m-0 font-semibold" style={{ color: REPORT_BLUE }}>
                  {store.settings.email}
                </p>
                {qrSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrSrc}
                    alt=""
                    width={72}
                    height={72}
                    className="mt-2 ml-auto block"
                  />
                ) : null}
              </div>
            </div>
            <div
              className="mt-3 h-[3px] w-full"
              style={{ backgroundColor: REPORT_BLUE }}
              aria-hidden
            />
          </header>
        ) : (
          <div className="min-h-[22mm]" aria-hidden />
        )}

        <section className="mt-4 space-y-2.5 print:break-inside-avoid">
          <ResultInfoBox>
            <ResultInfoLine
              label="Patient Name"
              value={patient?.fullName ?? order.patientId}
            />
            <ResultInfoLine label="Lab Number" value={order.id} />
            <ResultInfoLine label="Payment Method(s)" value={payment} />
            <ResultInfoLine label="Requested Test(s)" value={requestedTests} />
          </ResultInfoBox>

          <ResultInfoBox>
            <ResultInfoLine
              label="Passport/ID Number"
              value={patient?.id ?? "—"}
            />
            <ResultInfoLine label="Age" value={ageLabel} />
            <ResultInfoLine label="Gender" value={patient?.gender ?? "—"} />
            <ResultInfoLine label="DateTime Collected" value={collectionDate} />
            <ResultInfoLine label="Report Date" value={reportDate} />
            <ResultInfoLine label="Doctor Ref" value={order.requestingDoctor} />
            <ResultInfoLine label="Contact No" value={patient?.phone ?? "—"} />
          </ResultInfoBox>

          <ResultInfoBox>
            <ResultInfoLine label="Clinical data" value={clinical} />
          </ResultInfoBox>
        </section>

        <div className="mt-2 flex-1">
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
              <div key={group.id}>
                {tableLines.length > 0 ? (
                  <ResultProfileResultsTable
                    title={group.title}
                    lines={tableLines}
                    specimenType={group.specimenType}
                  />
                ) : null}
                {tableLines.length === 0 && microLines.length > 0 ? (
                  <div className="mt-4">
                    <h3
                      className="m-0 text-[12pt] font-bold tracking-tight"
                      style={{ color: REPORT_BLUE }}
                    >
                      {group.title}
                    </h3>
                    <p className="mt-1 font-mono text-[10pt] uppercase">
                      SPECIMEN TYPE : {group.specimenType.toUpperCase()}
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

        {order.includeAiCommentInReport && order.aiGeneratedComment ? (
          <section className="mt-4 print:break-inside-avoid">
            <h3
              className="m-0 text-[11pt] font-bold"
              style={{ color: REPORT_BLUE }}
            >
              Interpretive comments
            </h3>
            <p className="mt-1 font-mono text-[10pt] leading-relaxed whitespace-pre-wrap">
              {order.aiGeneratedComment}
            </p>
          </section>
        ) : null}

        <footer className="mt-6 space-y-2 border-t border-neutral-300 pt-3 font-mono text-[9.5pt] text-neutral-700 print:break-inside-avoid">
          {primaryEntered ? (
            <p className="m-0">
              <span className="font-semibold text-[#1a4d8f]">Captured By:</span>{" "}
              {primaryEntered}
            </p>
          ) : null}
          {primaryAuthorized ? (
            <p className="m-0">
              <span className="font-semibold text-[#1a4d8f]">
                Previously Authorised By:
              </span>{" "}
              {primaryAuthorized}
            </p>
          ) : null}
          <p className="m-0 mt-2 text-[8.5pt] leading-snug">{store.settings.reportFooter}</p>
        </footer>
      </div>
    </div>
  );
}
