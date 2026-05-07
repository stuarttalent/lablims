"use client";

import { useData } from "@/contexts/data-context";
import { getTestById } from "@/data/catalogue";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const { store } = useData();
  const today = format(new Date(), "yyyy-MM-dd");

  const testsToday = store.orders.reduce((s, o) => {
    if (!o.collectionDate.startsWith(today)) return s;
    return s + o.tests.length;
  }, 0);

  const revenueMonth = store.invoices
    .filter((i) => i.createdAt.slice(0, 7) === today.slice(0, 7))
    .reduce((s, i) => s + i.total, 0);

  const pending = store.orders.filter((o) =>
    ["Requested", "Sample Collected", "In Progress", "Pending Verification"].includes(
      o.status,
    ),
  );

  const completed = store.orders.filter((o) =>
    ["Verified", "Released"].includes(o.status),
  );

  const unpaid = store.invoices.filter((i) => i.paymentStatus !== "Paid");

  const deptRows = store.settings.departments.map((dep) => {
    const tests = store.orders.reduce((sum, o) => {
      const c = o.tests.filter(
        (t) => getTestById(t.testId)?.department === dep,
      ).length;
      return sum + c;
    }, 0);
    return { dep, tests };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Lightweight operational summaries for finance and supervision.
        </p>
      </div>
      <Tabs defaultValue="volume">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="volume">Daily volume</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="dept">Departments</TabsTrigger>
          <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tests collected today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{testsToday}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Counts analytes on orders with today&apos;s collection date prefix.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue — current month (all invoices)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">${revenueMonth.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                USD totals, irrespective of payment status.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <ReportTable
            title="Pending pipeline"
            rows={pending.map((o) => ({
              a: o.id,
              b: o.status,
              c: o.priority,
            }))}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <ReportTable
            title="Verified / released"
            rows={completed.map((o) => ({
              a: o.id,
              b: o.status,
              c: o.priority,
            }))}
          />
        </TabsContent>

        <TabsContent value="dept" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Department workload</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Tests on orders</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptRows.map((r) => (
                    <TableRow key={r.dep}>
                      <TableCell>{r.dep}</TableCell>
                      <TableCell className="text-right">{r.tests}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unpaid" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Unpaid / partial invoices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {unpaid.length === 0 ? (
                <p className="text-sm text-muted-foreground">None — great work.</p>
              ) : (
                unpaid.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-mono text-xs">{i.invoiceNumber}</p>
                      <Badge variant="secondary">{i.paymentStatus}</Badge>
                    </div>
                    <p className="font-semibold">${i.total.toFixed(2)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportTable({
  title,
  rows,
}: {
  title: string;
  rows: { a: string; b: string; c: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground text-sm">
                  No rows.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.a}>
                  <TableCell className="font-mono text-xs">{r.a}</TableCell>
                  <TableCell>{r.b}</TableCell>
                  <TableCell>{r.c}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
