"use client";

import { useData } from "@/contexts/data-context";
import { useAuth } from "@/contexts/auth-context";
import { canEditPatient } from "@/lib/permissions";
import type { Patient } from "@/types";
import { getTestById } from "@/data/catalogue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DemoDisclaimer } from "@/components/demo/demo-disclaimer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { differenceInYears, parseISO } from "date-fns";

export default function PatientProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { store, updatePatient } = useData();
  const { user } = useAuth();
  const patient = store.patients.find((p) => p.id === id);

  const orders = useMemo(
    () => store.orders.filter((o) => o.patientId === id),
    [store.orders, id],
  );

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Patient | null>(null);

  if (!patient) {
    notFound();
  }

  const canEdit = user && canEditPatient(user.role);

  function startEdit() {
    if (!patient) return;
    setDraft({ ...patient });
    setEditing(true);
  }

  function saveEdit() {
    if (!draft || !patient) return;
    let age = draft.age;
    try {
      age = differenceInYears(new Date(), parseISO(draft.dateOfBirth));
    } catch {
      toast.error("Invalid date of birth.");
      return;
    }
    updatePatient(patient.id, { ...draft, age });
    toast.success("Patient updated (demo, local only).");
    setEditing(false);
    setDraft(null);
  }

  const display = editing && draft ? draft : patient;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {patient.fullName}
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {patient.id}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Patient profile &amp; history</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              {editing ? (
                <>
                  <Button size="sm" onClick={saveEdit}>
                    Save changes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setDraft(null);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="secondary" onClick={startEdit}>
                  Edit patient
                </Button>
              )}
            </>
          )}
          <Button size="sm" variant="outline" asChild>
            <Link href="/patients">Back to list</Link>
          </Button>
          {user && (user.role === "admin" || user.role === "doctor") && (
            <Button size="sm" asChild>
              <Link href={`/orders/new?patient=${patient.id}`}>New test request</Link>
            </Button>
          )}
        </div>
      </div>

      <DemoDisclaimer variant="compact" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Demographics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <Field
              label="Date of birth"
              editing={editing}
              value={display.dateOfBirth}
              onChange={(v) => draft && setDraft({ ...draft, dateOfBirth: v })}
              type="date"
            />
            <Info label="Age (computed)" value={`${display.age} yrs`} />
            <Field
              label="Gender"
              editing={editing}
              value={display.gender}
              onChange={(v) => draft && setDraft({ ...draft, gender: v })}
            />
            <Field
              label="Phone"
              editing={editing}
              value={display.phone}
              onChange={(v) => draft && setDraft({ ...draft, phone: v })}
            />
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              {editing ? (
                <Input
                  value={draft!.email}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, email: e.target.value } : d))
                  }
                />
              ) : (
                <p className="font-medium">{patient.email}</p>
              )}
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Address</Label>
              {editing ? (
                <Textarea
                  rows={3}
                  value={draft!.address}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, address: e.target.value } : d))
                  }
                />
              ) : (
                <p className="font-medium whitespace-pre-wrap">{patient.address}</p>
              )}
            </div>
            <Field
              label="Referring doctor"
              editing={editing}
              value={display.referringDoctor}
              onChange={(v) => draft && setDraft({ ...draft, referringDoctor: v })}
            />
            <Field
              label="Medical aid"
              editing={editing}
              value={display.medicalAid}
              onChange={(v) => draft && setDraft({ ...draft, medicalAid: v })}
            />
            <Info label="Created" value={patient.createdAt} />
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Button asChild variant="outline">
              <Link href={`/billing/new?patient=${patient.id}`}>Create invoice</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/orders/new?patient=${patient.id}`}>Create lab order</Link>
            </Button>
            <p className="text-xs text-muted-foreground pt-2">
              Demo shortcuts — no external systems are contacted.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Test history</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders for this patient.</p>
          ) : (
            <div className="rounded-xl border border-border/70 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Tests</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.id}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{o.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {o.tests
                          .map((t) => getTestById(t.testId)?.name ?? t.testId)
                          .join(", ")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/orders/${o.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  editing,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing ? (
        <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <p className="font-medium">{value}</p>
      )}
    </div>
  );
}
