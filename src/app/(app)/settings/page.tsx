"use client";

import { TEST_CATALOGUE } from "@/data/catalogue";
import { useData } from "@/contexts/data-context";
import { useAuth } from "@/contexts/auth-context";
import {
  canEditCataloguePricing,
  hasAdminPrivileges,
} from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { resolveTestPrice } from "@/lib/pricing";

const LOGO_MAX_BYTES = 1_200_000;
const LETTERHEAD_A4_MAX_BYTES = 5_000_000;

export default function SettingsPage() {
  const { store, updateSettings, resetDemoData, dataSource, hydrated } = useData();
  const { user } = useAuth();
  const privileged = Boolean(user && hasAdminPrivileges(user.role));
  const canSaveProfile = privileged;
  const s = store.settings;
  const [labName, setLabName] = useState(s.labName);
  const [tagline, setTagline] = useState(s.tagline);
  const [address, setAddress] = useState(s.address);
  const [phone, setPhone] = useState(s.phone);
  const [email, setEmail] = useState(s.email);
  const [reg, setReg] = useState(s.registrationNumber);
  const [footer, setFooter] = useState(s.reportFooter);
  const [deptText, setDeptText] = useState(s.departments.join(", "));
  const [savingProfile, setSavingProfile] = useState(false);

  const [fhirBaseUrl, setFhirBaseUrl] = useState(s.fhirBaseUrl ?? "");
  const [fhirOrganizationId, setFhirOrganizationId] = useState(
    s.fhirOrganizationId ?? "",
  );

  useEffect(() => {
    if (!hydrated) return;
    const settings = store.settings;
    setLabName(settings.labName);
    setTagline(settings.tagline);
    setAddress(settings.address);
    setPhone(settings.phone);
    setEmail(settings.email);
    setReg(settings.registrationNumber);
    setFooter(settings.reportFooter);
    setDeptText(settings.departments.join(", "));
    setFhirBaseUrl(settings.fhirBaseUrl ?? "");
    setFhirOrganizationId(settings.fhirOrganizationId ?? "");
  }, [hydrated, store.settings]);

  async function saveProfile() {
    if (!canSaveProfile) {
      toast.error("Only lab managers and administrators can save the lab profile.");
      return;
    }
    const departments = deptText
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    setSavingProfile(true);
    try {
      await updateSettings({
        labName,
        tagline,
        address,
        phone,
        email,
        registrationNumber: reg,
        reportFooter: footer,
        departments: departments.length ? departments : s.departments,
        ...(privileged
          ? {
              fhirBaseUrl: fhirBaseUrl.trim() || undefined,
              fhirOrganizationId: fhirOrganizationId.trim() || undefined,
            }
          : {}),
      });
      toast.success(
        dataSource === "supabase"
          ? "Lab profile saved."
          : "Lab profile saved on this device.",
      );
    } catch (e) {
      console.error("Save lab profile failed:", e);
      toast.error(
        "Could not save lab profile. If you use Supabase, run migration 00018_lab_settings_save_policy.sql and ensure your role is lab manager or admin.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div key={store.settings.limsInstanceId ?? "settings"} className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Branding, report footer, and—if you have administrator access—integrations,
          letterhead logo, pricing, and data reset.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lab profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Lab name</Label>
            <Input value={labName} onChange={(e) => setLabName(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Tagline</Label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Registration / licence note</Label>
            <Input value={reg} onChange={(e) => setReg(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Departments (comma separated)</Label>
            <Input value={deptText} onChange={(e) => setDeptText(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Report template footer</Label>
            <Textarea rows={3} value={footer} onChange={(e) => setFooter(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={() => void saveProfile()} disabled={savingProfile || !canSaveProfile}>
              {savingProfile ? "Saving…" : "Save profile"}
            </Button>
            {!canSaveProfile ? (
              <p className="text-xs text-muted-foreground">
                Your role can view settings but cannot update the lab profile. Ask a lab
                manager or administrator.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {privileged ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Letterhead logo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Shown on printed and exported result slips. Use a horizontal PNG or SVG
              export for best results (max ~1.2&nbsp;MB for local storage).
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="lab-logo">Upload logo</Label>
                <Input
                  id="lab-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="max-w-xs cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    if (file.size > LOGO_MAX_BYTES) {
                      toast.error("Logo file is too large for local demo storage.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = reader.result;
                      if (typeof dataUrl !== "string") return;
                      updateSettings({ logoDataUrl: dataUrl });
                      toast.success("Logo saved. It will appear on new result slips.");
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
              {s.logoDataUrl ? (
                <div className="flex h-20 min-w-[140px] items-center justify-center rounded-xl border bg-muted/30 px-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview */}
                  <img
                    src={s.logoDataUrl}
                    alt="Lab logo preview"
                    className="max-h-full max-w-[200px] object-contain"
                  />
                </div>
              ) : null}
            </div>
            {s.logoDataUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  updateSettings({ logoDataUrl: undefined });
                  toast.message("Logo removed");
                }}
              >
                Remove logo
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {privileged ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">A4 letterhead (PDF)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload a full-page A4 PDF letterhead. It is used on result slips and invoices.
            </p>
            <Input
              type="file"
              accept="application/pdf"
              className="max-w-sm cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.size > LETTERHEAD_A4_MAX_BYTES) {
                  toast.error("A4 letterhead PDF is too large (max 5 MB).");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result;
                  if (typeof dataUrl !== "string") return;
                  updateSettings({ letterheadA4PdfDataUrl: dataUrl });
                  toast.success("A4 letterhead saved.");
                };
                reader.readAsDataURL(file);
              }}
            />
            {s.letterheadA4PdfDataUrl ? (
              <div className="space-y-2">
                <div className="rounded border p-2 bg-white">
                  <object
                    data={s.letterheadA4PdfDataUrl}
                    type="application/pdf"
                    className="h-[220px] w-full"
                    aria-label="A4 letterhead preview"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateSettings({ letterheadA4PdfDataUrl: undefined });
                    toast.message("A4 letterhead removed.");
                  }}
                >
                  Remove A4 letterhead
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {privileged ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">FHIR export metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>FHIR base URL</Label>
              <Input
                placeholder="https://your-fhir-server/fhir/R4"
                value={fhirBaseUrl}
                onChange={(e) => setFhirBaseUrl(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Used in exported JSON <code className="font-mono">NamingSystem</code> URIs
                only; no live API is called.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Organization logical id (FHIR id)</Label>
              <Input
                placeholder="lab-main"
                value={fhirOrganizationId}
                onChange={(e) => setFhirOrganizationId(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button variant="secondary" size="sm" onClick={saveProfile}>
                Save FHIR fields with profile
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {user && canEditCataloguePricing(user.role) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test pricing overrides</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Effective (USD)</TableHead>
                  <TableHead className="text-right">Override</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TEST_CATALOGUE.map((t) => (
                  <PriceRow key={t.id} testId={t.id} name={t.name} department={t.department} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test pricing overrides</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only administrators can edit catalogue pricing. Contact your lab
              administrator if you need a change.
            </p>
          </CardContent>
        </Card>
      )}

      {privileged ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Reset local data to the factory default dataset (clears unsaved changes on
              this workstation).
            </p>
            <Button
              variant="destructive"
              onClick={() => {
                resetDemoData();
                toast.success("Data reset to factory defaults.");
              }}
            >
              Reset to factory defaults
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function PriceRow({
  testId,
  name,
  department,
}: {
  testId: string;
  name: string;
  department: string;
}) {
  const { store, updateSettings } = useData();
  const effective = resolveTestPrice(testId, store.settings);
  const raw = store.settings.priceOverrides[testId];
  const committed = raw !== undefined ? String(raw) : "";

  return (
    <TableRow>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{department}</TableCell>
      <TableCell className="text-right font-mono">${effective.toFixed(0)}</TableCell>
      <TableCell className="text-right">
        <Input
          key={`${testId}-${committed}`}
          className="h-8 max-w-[100px] ml-auto text-right font-mono"
          placeholder="—"
          defaultValue={committed}
          onBlur={(e) => {
            const v = e.target.value.trim();
            const n = parseFloat(v);
            const next = { ...store.settings.priceOverrides };
            if (v === "" || Number.isNaN(n)) {
              delete next[testId];
            } else {
              next[testId] = n;
            }
            updateSettings({ priceOverrides: next });
            toast.message("Pricing updated", { description: name });
          }}
        />
      </TableCell>
    </TableRow>
  );
}
