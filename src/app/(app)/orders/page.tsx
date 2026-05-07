"use client";

import { useData } from "@/contexts/data-context";
import { useAuth } from "@/contexts/auth-context";
import { canCreateOrder } from "@/lib/permissions";
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
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";

export default function OrdersPage() {
  const { store } = useData();
  const { user } = useAuth();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = [...store.orders].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    if (user?.role === "tech") {
      list = list.filter((o) => o.assignedTechId === user.id);
    }
    if (!needle) return list;
    return list.filter((o) => {
      const patient = store.patients.find((p) => p.id === o.patientId);
      return (
        o.id.toLowerCase().includes(needle) ||
        (patient?.fullName.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [store.orders, store.patients, q, user]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Each row is one lab request. Open it to see status, assign work, or
            add clinical notes.
          </p>
        </div>
        {user && canCreateOrder(user.role) ? (
          <Button asChild className="gap-2">
            <Link href="/orders/new">
              <Plus className="size-4" />
              New request
            </Link>
          </Button>
        ) : (
          <Badge variant="secondary">Assigned work only</Badge>
        )}
      </div>
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <Input
            placeholder="Search order ID or patient…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="rounded-xl border border-border/70 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      No orders to show.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((o) => {
                    const patient = store.patients.find((p) => p.id === o.patientId);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.id}</TableCell>
                        <TableCell className="font-medium">
                          {patient?.fullName ?? o.patientId}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">{o.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{o.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/orders/${o.id}`}>View</Link>
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
