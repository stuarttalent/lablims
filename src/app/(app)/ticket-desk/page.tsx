"use client";

import Link from "next/link";
import { useData } from "@/contexts/data-context";
import { getTestById } from "@/data/catalogue";
import { LabModulePage } from "@/components/layout/lab-module-page";
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
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Headset,
  LayoutDashboard,
  Microscope,
  Users,
} from "lucide-react";
import { useMemo } from "react";

export default function TicketDeskPage() {
  const { store } = useData();

  const queue = useMemo(() => {
    return [...store.orders]
      .filter((o) => o.status !== "Released")
      .sort((a, b) => {
        const pri = { STAT: 0, Urgent: 1, Routine: 2 };
        const pd =
          (pri[a.priority as keyof typeof pri] ?? 9) -
          (pri[b.priority as keyof typeof pri] ?? 9);
        if (pd !== 0) return pd;
        return a.collectionDate.localeCompare(b.collectionDate);
      })
      .slice(0, 12);
  }, [store.orders]);

  const waitingPatients = store.orders.filter((o) => o.status === "Requested").length;

  return (
    <LabModulePage
      title="Ticket desk"
      description="Front-office queue for registrations, specimen receipt, and routing into the laboratory worklist."
      stats={[
        { label: "Open tickets", value: String(queue.length), icon: Headset },
        { label: "Awaiting sample", value: String(waitingPatients), icon: ClipboardList },
        { label: "STAT in queue", value: String(queue.filter((o) => o.priority === "STAT").length), icon: Headset },
        { label: "Patients", value: String(store.patients.length), icon: Users },
      ]}
    >
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Active queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No open orders in the queue.
                    </TableCell>
                  </TableRow>
                ) : (
                  queue.map((o) => {
                    const patient = store.patients.find((p) => p.id === o.patientId);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.id}</TableCell>
                        <TableCell>{patient?.fullName ?? o.patientId}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              o.priority === "STAT" ? "destructive" : "secondary"
                            }
                          >
                            {o.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{o.status}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate text-xs text-muted-foreground">
                          {o.tests
                            .map((t) => getTestById(t.testId)?.name ?? t.testId)
                            .join(", ")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/orders/${o.id}`}>Open</Link>
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 p-4">
              <LayoutDashboard className="size-8 text-primary" />
              <div>
                <p className="font-medium">Dashboard</p>
                <p className="text-xs text-muted-foreground">Volumes &amp; TAT</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/patients">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="size-8 text-primary" />
              <div>
                <p className="font-medium">Patients</p>
                <p className="text-xs text-muted-foreground">Register &amp; lookup</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/orders">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 p-4">
              <ClipboardList className="size-8 text-primary" />
              <div>
                <p className="font-medium">Worklist</p>
                <p className="text-xs text-muted-foreground">Full order list</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/results">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Microscope className="size-8 text-primary" />
              <div>
                <p className="font-medium">Results</p>
                <p className="text-xs text-muted-foreground">Entry &amp; release</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </LabModulePage>
  );
}
