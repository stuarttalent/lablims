# LabLIMS (demo)

Modern **demo-only** web application simulating a **Laboratory Information Management System (LIMS)** for training and product evaluation. **Not for real clinical or diagnostic use.** Demo disclaimers appear on login, dashboard, result slips, invoices, and PDF exports.

## Tech stack

- [Next.js](https://nextjs.org/) App Router (React 19)
- TypeScript
- [Tailwind CSS](https://tailwindcss.com/) v4
- [shadcn/ui](https://ui.shadcn.com/) (Base Nova) + [Lucide](https://lucide.dev/) icons
- [Recharts](https://recharts.org/) for dashboard charts
- Local persistence via `localStorage` only (no backend)
- PDF: [html2canvas](https://html2canvas.hertzen.com/) + [jsPDF](https://github.com/parallax/jsPDF) on the result slip view; “email” uses a **toast** only

## Prerequisites

- **Node.js 20+** (recommended; matches Next 16 expectations)
- **npm** (bundled with Node)

## Run locally

```bash
cd lablims
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to the demo login screen.

### Production build

```bash
npm run build
npm start
```

## Using the demo

1. **Login** — Choose any of the five personas (Admin, Lab Scientist, Lab Tech, Biller, Doctor). No password.
2. **Roles** — Navigation and actions change by role (e.g. billing and settings for Admin/Biller; verification for Scientist; entry for Tech).
3. **Data** — Seeded patients, doctors, orders, invoices, and catalogue tests load on first visit; changes persist in the browser until you **Reset demo data** under **Settings** (Admin).
4. **FHIR / HL7** — Under **FHIR / Interop**, preview **HL7 FHIR R4** JSON (Bundle with Organization, Patient, ServiceRequest, Observation, DiagnosticReport). Tests in the catalogue include representative **LOINC** codes for `Observation.code`. This app does **not** host a live FHIR REST API; exports are for demonstration only. Legacy **HL7 v2.x** messaging (e.g. ORU^R01) is referenced but not generated.

5. **PDF / print** — Open a **Result slip**, then **Export PDF** or **Print**. Footer text states the document is for demonstration only.

## Project layout (high level)

- `src/app/` — Routes (`/login`, dashboard modules under `(app)/`)
- `src/components/` — UI, layout shell, result slip, providers
- `src/contexts/` — Mock auth + demo data store
- `src/data/` — Seed data and static catalogue
- `src/lib/` — Permissions, pricing, local storage, **FHIR R4 JSON builders** (`lib/fhir/`)
- `src/types/` — Shared TypeScript types

## Licence / compliance

This repository is a **frontend demo**. It does not implement secure healthcare interoperability, audit trails fit for regulated labs, or validated diagnostic logic. Do not deploy for real patient care without a full regulatory and clinical review.
