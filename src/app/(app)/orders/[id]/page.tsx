"use client";

import { MOCK_USERS } from "@/data/mock-users";
import { getTestById } from "@/data/catalogue";
import { useData } from "@/contexts/data-context";
import { useAuth } from "@/contexts/auth-context";
import {
  canAssignOrder,
  canChangeOrderStatus,
} from "@/lib/permissions";
import type { OrderStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";

const STATUSES: OrderStatus[] = [
  "Requested",
  "Sample Collected",
  "In Progress",
  "Pending Verification",
  "Verified",
  "Released",
];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { store, updateOrder } = useData();
  const { user } = useAuth();
  const order = store.orders.find((o) => o.id === params.id);

  if (!order) notFound();

  const patient = store.patients.find((p) => p.id === order.patientId);
  const techs = MOCK_USERS.filter((u) => u.role === "tech");
  const scientists = MOCK_USERS.filter((u) => u.role === "scientist");

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{order.id}</h1>
            <Badge variant="outline">{order.priority}</Badge>
            <Badge variant="secondary">{order.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {patient?.fullName ?? order.patientId}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/orders">Back</Link>
          </Button>
          <Button asChild>
            <Link href={`/results/${order.id}`}>Results workspace</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/results/slip/${order.id}`}>Result slip</Link>
          </Button>
        </div>
      </div>

      <Card className="border-dashed border-primary/25 bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">HL7 FHIR (R4)</CardTitle>
          <CardDescription className="text-xs">
            Generate a synthetic <strong>Bundle</strong> with Organization, Patient,
            ServiceRequest, Observations, and DiagnosticReport for this accession.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/interoperability?order=${order.id}`}>
              Open interoperability workspace
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Workflow</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Status</p>
            <Select
              disabled={!user || !canChangeOrderStatus(user.role)}
              value={order.status}
              onValueChange={(v) =>
                updateOrder(order.id, {
                  status: (v ?? order.status) as OrderStatus,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {user && !canChangeOrderStatus(user.role) && (
              <p className="text-[11px] text-muted-foreground">
                Status changes require laboratory operations roles.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Assign lab tech</p>
            <Select
              disabled={!user || !canAssignOrder(user.role)}
              value={order.assignedTechId ?? "none"}
              onValueChange={(v) =>
                updateOrder(order.id, {
                  assignedTechId: v && v !== "none" ? v : undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {techs.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">
              Assign verifying scientist
            </p>
            <Select
              disabled={!user || !canAssignOrder(user.role)}
              value={order.assignedScientistId ?? "none"}
              onValueChange={(v) =>
                updateOrder(order.id, {
                  assignedScientistId: v && v !== "none" ? v : undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {scientists.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Clinical details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <KV label="Patient" value={patient ? `${patient.fullName} (${patient.id})` : order.patientId} />
          <KV label="Sample type" value={order.sampleType} />
          <KV label="Requesting doctor" value={order.requestingDoctor} />
          <KV label="Collection" value={order.collectionDate.replace("T", " ")} />
          <div className="sm:col-span-2">
            <KV label="Notes" value={order.notes || "—"} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Requested tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.tests.map((line, idx) => {
            const meta = getTestById(line.testId);
            return (
              <div key={line.testId}>
                {idx > 0 ? <Separator className="mb-3" /> : null}
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{meta?.name ?? line.testId}</p>
                    <p className="text-xs text-muted-foreground">
                      {meta?.department} · {meta?.sampleType}
                    </p>
                  </div>
                  <Badge variant="outline">{line.resultStatus ?? "Pending"}</Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
