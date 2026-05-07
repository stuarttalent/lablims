"use client";

import { getTestById } from "@/data/catalogue";
import type { DemoStore, LabOrder, Patient, TestDepartment } from "@/types";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import { buildResultVerificationToken } from "@/lib/verification-token";

const DEPT_ORDER: TestDepartment[] = [
  "Haematology",
  "Chemistry",
  "Microbiology",
  "Serology/Immunology",
  "Molecular",
];

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

  useEffect(() => {
    let cancelled = false;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const lims = store.settings.limsInstanceId ?? "";
    const verifyUrl = `${origin}/verify/${encodeURIComponent(order.id)}?v=${buildResultVerificationToken(order.id, order.createdAt, lims)}`;
    QRCode.toDataURL(verifyUrl, {
      width: 132,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
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

  const grouped = new Map<TestDepartment, typeof order.tests>();
  for (const d of DEPT_ORDER) grouped.set(d, []);
  for (const line of order.tests) {
    const dep = getTestById(line.testId)?.department;
    if (!dep) continue;
    const arr = grouped.get(dep) ?? [];
    arr.push(line);
    grouped.set(dep, arr);
  }

  return (
    <div
      id="lablims-result-slip"
      className="bg-white text-slate-900 rounded-xl border border-slate-200 p-6 text-sm print:border-0 print:rounded-none print:p-8"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xl font-semibold tracking-tight text-teal-800">
            {store.settings.labName}
          </p>
          <p className="text-xs text-slate-600 mt-1">{store.settings.tagline}</p>
          <p className="text-xs text-slate-600">{store.settings.address}</p>
          <p className="text-xs text-slate-600">
            Tel {store.settings.phone} · {store.settings.email}
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            Reg: {store.settings.registrationNumber}
          </p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-900 bg-teal-50 border border-teal-200 px-2 py-1 rounded-md inline-block">
            Laboratory report
          </p>
          <p className="font-mono text-sm">{order.id}</p>
          <p className="text-xs text-slate-600">
            Report date: {new Date().toISOString().slice(0, 10)}
          </p>
          <div className="flex flex-col items-end gap-1 pt-2">
            {qrSrc ? (
              <Image
                src={qrSrc}
                width={120}
                height={120}
                unoptimized
                alt={`Verification for accession ${order.id}`}
                className="rounded-md border border-slate-200"
              />
            ) : (
              <div className="size-[120px] rounded-md border border-slate-200 bg-slate-50" />
            )}
            <p className="max-w-[140px] text-[9px] leading-tight text-slate-600 text-center">
              Scan to verify this report online
            </p>
          </div>
        </div>
      </header>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase">Patient</p>
          <p className="font-medium">{patient?.fullName ?? order.patientId}</p>
          <p className="text-xs text-slate-600">
            DOB {patient?.dateOfBirth} · {patient?.gender} · {patient?.age} yrs
          </p>
          <p className="text-xs text-slate-600">{patient?.phone}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase">Order</p>
          <p className="text-xs text-slate-600">Priority: {order.priority}</p>
          <p className="text-xs text-slate-600">Sample: {order.sampleType}</p>
          <p className="text-xs text-slate-600">
            Collection: {order.collectionDate.replace("T", " ")}
          </p>
          <p className="text-xs text-slate-600">Referrer: {order.requestingDoctor}</p>
        </div>
      </section>

      <div className="mt-6 space-y-6">
        {DEPT_ORDER.map((dep) => {
          const lines = grouped.get(dep) ?? [];
          if (lines.length === 0) return null;
          return (
            <div key={dep}>
              <p className="text-sm font-semibold text-teal-900">{dep}</p>
              <Separator className="my-2" />
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left p-2 font-medium">Test</th>
                    <th className="text-left p-2 font-medium">Result</th>
                    <th className="text-left p-2 font-medium">Units</th>
                    <th className="text-left p-2 font-medium">Ref.</th>
                    <th className="text-left p-2 font-medium">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const meta = getTestById(line.testId);
                    const abnormal = line.flag && line.flag !== "Normal";
                    return (
                      <tr
                        key={line.testId}
                        className={abnormal ? "bg-amber-50" : "bg-white"}
                      >
                        <td className="p-2 border-t border-slate-100">
                          {meta?.name ?? line.testId}
                        </td>
                        <td className="p-2 border-t border-slate-100 font-medium">
                          {line.resultValue ?? "—"}
                        </td>
                        <td className="p-2 border-t border-slate-100">
                          {line.units ?? meta?.units ?? "—"}
                        </td>
                        <td className="p-2 border-t border-slate-100">
                          {line.referenceRange ?? meta?.referenceRange ?? "—"}
                        </td>
                        <td className="p-2 border-t border-slate-100">
                          {line.flag ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {lines.map((line) =>
                line.comment ? (
                  <p key={`${line.testId}-c`} className="text-[11px] text-slate-600 mt-2">
                    <span className="font-semibold">Comment:</span> {line.comment}
                  </p>
                ) : null,
              )}
            </div>
          );
        })}
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 text-xs text-slate-600">
        <div>
          <p className="font-semibold text-slate-700">Verification</p>
          <p>
            Verified by:{" "}
            {order.tests.map((l) => l.verifiedBy).filter(Boolean)[0] ?? "—"}
          </p>
          <p>
            Date:{" "}
            {order.tests.map((l) => l.verificationDate).filter(Boolean)[0] ?? "—"}
          </p>
          <p className="mt-2 text-slate-700">
            Status:{" "}
            <span className="font-medium">
              {order.status === "Released" ||
              order.tests.some((l) => l.resultStatus === "Released")
                ? "Verified / released"
                : order.status}
            </span>
          </p>
        </div>
        <div>
          <p className="font-semibold text-slate-700">Authorised signature</p>
          <div className="mt-6 border-b border-slate-400 w-48" />
          <p className="text-[10px] mt-1">Authorised signatory &amp; designation</p>
        </div>
      </section>

      <footer className="mt-10 pt-4 border-t border-slate-200 space-y-2 text-[11px] text-slate-600 -mx-6 -mb-6 px-6 py-4 rounded-b-xl print:rounded-none bg-slate-50">
        <p className="text-slate-700">{store.settings.reportFooter}</p>
        <p>
          Report authenticity can be confirmed by scanning the QR code, which
          includes a security code tied to accession{" "}
          <span className="font-mono font-medium text-slate-900">{order.id}</span>{" "}
          on this laboratory system.
        </p>
      </footer>
    </div>
  );
}
