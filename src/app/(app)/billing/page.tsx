"use client";

import { useData } from "@/contexts/data-context";
import type { DemoStore, Invoice } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BillingPage() {
  const { store } = useData();
  const invoices = [...store.invoices].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const unpaid = invoices.filter((i) => i.paymentStatus !== "Paid");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Invoices, tenders, and payment tracking (USD).
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/billing/new">
            <Plus className="size-4" />
            New invoice
          </Link>
        </Button>
      </div>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All invoices</TabsTrigger>
          <TabsTrigger value="unpaid" className="gap-2">
            <Filter className="size-3.5" />
            Unpaid ({unpaid.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <InvoiceTable invoices={invoices} store={store} />
        </TabsContent>
        <TabsContent value="unpaid" className="mt-4">
          <InvoiceTable invoices={unpaid} store={store} empty="No unpaid invoices." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InvoiceTable({
  invoices,
  store,
  empty,
}: {
  invoices: Invoice[];
  store: DemoStore;
  empty?: string;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead className="hidden md:table-cell">Patient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {empty ?? "No invoices."}
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => {
                const patient = store.patients.find((p) => p.id === inv.patientId);
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-medium">
                      {patient?.fullName ?? inv.patientId}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{inv.paymentStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-right">${inv.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/billing/${inv.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
