"use client";

import { TEST_CATALOGUE } from "@/data/catalogue";
import { useData } from "@/contexts/data-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DemoDisclaimer } from "@/components/demo/demo-disclaimer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useState } from "react";
import { resolveTestPrice } from "@/lib/pricing";

export default function SettingsPage() {
  const { store, updateSettings, resetDemoData } = useData();
  const s = store.settings;
  const [labName, setLabName] = useState(s.labName);
  const [tagline, setTagline] = useState(s.tagline);
  const [address, setAddress] = useState(s.address);
  const [phone, setPhone] = useState(s.phone);
  const [email, setEmail] = useState(s.email);
  const [reg, setReg] = useState(s.registrationNumber);
  const [footer, setFooter] = useState(s.reportFooter);
  const [deptText, setDeptText] = useState(s.departments.join(", "));

  function saveProfile() {
    const departments = deptText
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    updateSettings({
      labName,
      tagline,
      address,
      phone,
      email,
      registrationNumber: reg,
      reportFooter: footer,
      departments: departments.length ? departments : s.departments,
    });
    toast.success("Lab profile saved locally.");
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Branding, catalogue pricing overrides, and template footers.
        </p>
      </div>
      <DemoDisclaimer variant="compact" />

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
            <Button onClick={saveProfile}>Save profile</Button>
          </div>
        </CardContent>
      </Card>

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

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Reset local demo storage to the original seeded JSON (clears browser changes).
          </p>
          <Button
            variant="destructive"
            onClick={() => {
              resetDemoData();
              toast.success("Demo data restored from seed.");
            }}
          >
            Reset demo data
          </Button>
        </CardContent>
      </Card>
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
            toast.message("Pricing updated (demo)", { description: name });
          }}
        />
      </TableCell>
    </TableRow>
  );
}
