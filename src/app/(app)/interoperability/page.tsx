"use client";

import { useData } from "@/contexts/data-context";
import {
  buildDemoTransactionBundle,
  buildOrganization,
  buildPatient,
  buildServiceRequest,
  resolveFhirBase,
} from "@/lib/fhir/build-resources";
import { APP_NAME } from "@/lib/app-brand";
import { FHIR_VERSION } from "@/lib/fhir/constants";
import { FhirJsonPanel } from "@/components/fhir/fhir-json-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState, useEffect, Suspense, startTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function InteroperabilityPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <InteroperabilityInner />
    </Suspense>
  );
}

function InteroperabilityInner() {
  const { store } = useData();
  const sp = useSearchParams();
  const [orderId, setOrderId] = useState(store.orders[0]?.id ?? "");

  useEffect(() => {
    const q = sp.get("order");
    if (q && store.orders.some((o) => o.id === q)) {
      startTransition(() => setOrderId(q));
    }
  }, [sp, store.orders]);

  const order = store.orders.find((o) => o.id === orderId);
  const patient = order
    ? store.patients.find((p) => p.id === order.patientId)
    : undefined;

  const bundle = useMemo(
    () => (orderId ? buildDemoTransactionBundle(store, orderId) : null),
    [store, orderId],
  );

  const orgJson = useMemo(() => buildOrganization(store.settings), [store.settings]);
  const patientJson = useMemo(
    () => (patient ? buildPatient(patient, store.settings) : null),
    [patient, store.settings],
  );
  const srJson = useMemo(
    () =>
      order && patient ? buildServiceRequest(order, patient, store.settings) : null,
    [order, patient, store.settings],
  );

  const base = resolveFhirBase(store.settings);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Interoperability
            </h1>
            <Badge variant="outline" className="font-mono text-[10px]">
              HL7 FHIR R4
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            <span className="text-foreground/90 font-medium">
              Mostly for IT, interface engines, and EHR teams
            </span>{" "}
            — not required for routine specimen or result entry. Structured
            laboratory data aligned with{" "}
            <strong>HL7 FHIR Release 4</strong> resource patterns (Patient,
            Organization, ServiceRequest, Observation, DiagnosticReport). LOINC
            codes from the catalogue are emitted in{" "}
            <code className="text-xs font-mono bg-muted px-1 rounded">code.coding</code>{" "}
            where available. Pair this export with your organisation&apos;s FHIR
            gateway or integration engine as required.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://hl7.org/fhir/R4/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-3.5" />
              FHIR R4 specification
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://www.loinc.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LOINC
            </a>
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Export context</CardTitle>
          <CardDescription>
            Capability / naming base configured as{" "}
            <span className="font-mono text-xs">{base}</span> · FHIR{" "}
            <span className="font-mono">{FHIR_VERSION}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2 flex-1 max-w-md">
            <Label>Laboratory order (ServiceRequest id = order id)</Label>
            <Select
              value={orderId}
              onValueChange={(v) => setOrderId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select order" />
              </SelectTrigger>
              <SelectContent>
                {store.orders.map((o) => {
                  const p = store.patients.find((x) => x.id === o.patientId);
                  return (
                    <SelectItem key={o.id} value={o.id}>
                      {o.id} · {p?.fullName ?? o.patientId}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {order && (
            <Button variant="secondary" asChild>
              <Link href={`/orders/${order.id}`}>Open order in {APP_NAME}</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {!order || !patient ? (
        <p className="text-sm text-muted-foreground">Select a valid order.</p>
      ) : (
        <Tabs defaultValue="bundle" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
            <TabsTrigger value="bundle">Bundle (collection)</TabsTrigger>
            <TabsTrigger value="patient">Patient</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="servicerequest">ServiceRequest</TabsTrigger>
          </TabsList>
          <TabsContent value="bundle" className="mt-4">
            {bundle ? (
              <FhirJsonPanel title="Bundle — collection" data={bundle} />
            ) : null}
          </TabsContent>
          <TabsContent value="patient" className="mt-4">
            {patientJson ? (
              <FhirJsonPanel title="Patient resource" data={patientJson} />
            ) : null}
          </TabsContent>
          <TabsContent value="organization" className="mt-4">
            <FhirJsonPanel title="Organization resource" data={orgJson} />
          </TabsContent>
          <TabsContent value="servicerequest" className="mt-4">
            {srJson ? (
              <FhirJsonPanel title="ServiceRequest resource" data={srJson} />
            ) : null}
          </TabsContent>
        </Tabs>
      )}

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base">HL7 v2.x (reference)</CardTitle>
          <CardDescription>
            ORU^R01 observation result and OML^O21 laboratory order messages
            are common in legacy lab–EHR integration. This module provides
            FHIR R4 JSON exports; HL7 v2 wire formats are not generated here.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
