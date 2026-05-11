"use client";

import { testsForOrderPicker } from "@/data/catalogue";
import { ORDER_TEMPLATES, type OrderTemplate } from "@/data/order-templates";
import { useData } from "@/contexts/data-context";
import { useAuth } from "@/contexts/auth-context";
import { canCreateOrder } from "@/lib/permissions";
import type { OrderPriority, TestDepartment } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const DEPT_ORDER: TestDepartment[] = [
  "Haematology",
  "Chemistry",
  "Microbiology",
  "Serology/Immunology",
  "Molecular",
];

export default function NewOrderPage() {
  const { store, addOrder } = useData();
  const { user } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const presetPatient = sp.get("patient") ?? "";

  const [patientId, setPatientId] = useState(presetPatient);
  const [sampleType, setSampleType] = useState("Serum");
  const [priority, setPriority] = useState<OrderPriority>("Routine");
  const [doctor, setDoctor] = useState(store.doctors[0]?.name ?? "");
  const [collection, setCollection] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedIds = useMemo(() => {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    return [...new Set(ids)];
  }, [selected]);

  const pickableCatalogue = useMemo(() => testsForOrderPicker(), []);

  function applyTemplate(tpl: OrderTemplate) {
    setSelected((s) => {
      const next = { ...s };
      for (const id of tpl.testIds) next[id] = true;
      return next;
    });
    setSampleType(tpl.sampleTypeHint);
  }

  if (!user || !canCreateOrder(user.role)) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Your role cannot create laboratory orders.
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/orders">Back</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function toggle(id: string, checked: boolean) {
    setSelected((s) => ({ ...s, [id]: checked }));
  }

  function submit() {
    if (!patientId) {
      toast.error("Select a patient.");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Select at least one test.");
      return;
    }
    const order = addOrder({
      patientId,
      sampleType,
      priority,
      requestingDoctor: doctor,
      collectionDate: collection,
      status: "Requested",
      notes: notes.trim() || undefined,
      testIds: selectedIds,
    });
    toast.success("Laboratory order created.");
    router.push(`/orders/${order.id}`);
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New test request</h1>
        <p className="text-sm text-muted-foreground">
          Combine multiple analytes in a single collection event. Use templates below for
          common panels (FBC 3-part vs 5-part differential, lipids, U&amp;E).
        </p>
      </div>
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Order details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Patient</Label>
            <Select
              value={patientId}
              onValueChange={(v) => setPatientId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose patient…" />
              </SelectTrigger>
              <SelectContent>
                {store.patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName} · {p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sample type</Label>
            <Input value={sampleType} onChange={(e) => setSampleType(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) =>
                setPriority((v ?? "Routine") as OrderPriority)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Routine">Routine</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
                <SelectItem value="STAT">STAT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Requesting doctor</Label>
            <Select
              value={doctor}
              onValueChange={(v) => setDoctor(v ?? store.doctors[0]?.name ?? "")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {store.doctors.map((d) => (
                  <SelectItem key={d.id} value={d.name}>
                    {d.name} — {d.specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Collection date &amp; time</Label>
            <Input
              type="datetime-local"
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Adds the analyte lines for that panel. You can still add or remove individual
            tests in the list below. For FBC, pick either a three-part or a five-part
            differential (do not mix both unless you intend to report twice).
          </p>
          <div className="flex flex-wrap gap-2">
            {ORDER_TEMPLATES.map((tpl) => (
              <Button
                key={tpl.id}
                type="button"
                variant="secondary"
                size="sm"
                className="text-left h-auto min-h-9 py-2 px-3 whitespace-normal"
                onClick={() => applyTemplate(tpl)}
              >
                <span className="block font-medium leading-snug">{tpl.label}</span>
                <span className="block text-[11px] font-normal text-muted-foreground leading-snug mt-0.5">
                  {tpl.description}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {DEPT_ORDER.map((dep, idx) => {
            const items = pickableCatalogue.filter((t) => t.department === dep);
            if (items.length === 0) return null;
            return (
              <div key={dep}>
                {idx > 0 ? <Separator className="mb-6" /> : null}
                <p className="text-sm font-medium mb-3">{dep}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-start gap-3 rounded-xl border border-border/70 p-3 hover:bg-muted/40 cursor-pointer"
                    >
                      <Checkbox
                        checked={!!selected[t.id]}
                        onCheckedChange={(c) => toggle(t.id, c === true)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium block">{t.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {t.sampleType} · ${t.price}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={submit}>Create order</Button>
        <Button variant="outline" asChild>
          <Link href="/orders">Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
