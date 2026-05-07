"use client";

import { useData } from "@/contexts/data-context";
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
import { DemoDisclaimer } from "@/components/demo/demo-disclaimer";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";

export default function ResultsIndexPage() {
  const { store } = useData();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    let list = [...store.orders].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((o) => {
        const p = store.patients.find((x) => x.id === o.patientId);
        return (
          o.id.toLowerCase().includes(needle) ||
          (p?.fullName.toLowerCase().includes(needle) ?? false)
        );
      });
    }
    return list;
  }, [store.orders, store.patients, q]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Results</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Choose an order to type in results and send the report. Day-to-day
          work stays on this page; scientist sign-off is under{" "}
          <span className="font-medium text-foreground/90">More tools</span>.
        </p>
      </div>
      <DemoDisclaimer variant="compact" />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <Input
            placeholder="Search orders or patients…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="rounded-xl border border-border/70 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="text-right">Workspace</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      No orders yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((o) => {
                    const p = store.patients.find((x) => x.id === o.patientId);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.id}</TableCell>
                        <TableCell className="font-medium">
                          {p?.fullName ?? o.patientId}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary">{o.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/results/${o.id}`}>Open</Link>
                          </Button>
                          <Button asChild size="sm">
                            <Link href={`/results/slip/${o.id}`}>Slip</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
