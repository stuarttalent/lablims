"use client";

import { DemoDisclaimer } from "@/components/demo/demo-disclaimer";
import { useData } from "@/contexts/data-context";
import { getTestById } from "@/data/catalogue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, TestTube, Clock, CheckCircle2, Banknote, FileWarning } from "lucide-react";

export default function DashboardPage() {
  const { store, hydrated } = useData();

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const orders = store.orders;
  const patients = store.patients;
  const invoices = store.invoices;

  const testsToday = orders.filter((o) => o.collectionDate.startsWith(today));
  const testVolumeToday = testsToday.reduce((s, o) => s + o.tests.length, 0);

  const pendingResults = orders.filter((o) =>
    ["Requested", "Sample Collected", "In Progress", "Pending Verification"].includes(
      o.status,
    ),
  ).length;

  const completedResults = orders.filter((o) =>
    ["Verified", "Released"].includes(o.status),
  ).length;

  const revenueToday = invoices
    .filter((i) => i.createdAt === today && i.paymentStatus === "Paid")
    .reduce((s, i) => s + i.total, 0);

  const unpaidInvoices = invoices.filter((i) => i.paymentStatus !== "Paid").length;

  const recentPatients = [...patients]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const recentOrders = [...orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  const last7 = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - idx));
    const key = format(d, "yyyy-MM-dd");
    const vol = orders
      .filter((o) => o.collectionDate.startsWith(key))
      .reduce((s, o) => s + o.tests.length, 0);
    const rev = invoices
      .filter((i) => i.createdAt === key && i.paymentStatus === "Paid")
      .reduce((s, i) => s + i.total, 0);
    return { day: format(d, "EEE"), tests: vol, revenue: rev };
  });

  const deptWorkload = store.settings.departments.map((dep) => {
    const count = orders.reduce((sum, o) => {
      const lineDeps = o.tests
        .map((t) => getTestById(t.testId)?.department)
        .filter(Boolean);
      return sum + lineDeps.filter((d) => d === dep).length;
    }, 0);
    return { department: dep, tests: count };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Operational snapshot for {store.settings.labName}.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {format(new Date(), "PPP")}
        </Badge>
      </div>

      <DemoDisclaimer variant="inline" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Total patients"
          value={patients.length.toString()}
          icon={Users}
          hint="Registered demo patients"
        />
        <MetricCard
          title="Tests today"
          value={testVolumeToday.toString()}
          icon={TestTube}
          hint="Panels counted as individual tests"
        />
        <MetricCard
          title="Pending pipeline"
          value={pendingResults.toString()}
          icon={Clock}
          hint="Orders before final release"
        />
        <MetricCard
          title="Completed / verified"
          value={completedResults.toString()}
          icon={CheckCircle2}
          hint="Verified or released orders"
        />
        <MetricCard
          title="Revenue today"
          value={`$${revenueToday.toFixed(0)}`}
          icon={Banknote}
          hint={"Paid invoices dated today"}
        />
        <MetricCard
          title="Unpaid invoices"
          value={unpaidInvoices.toString()}
          icon={FileWarning}
          hint="Outstanding balances (demo)"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 shadow-sm bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">7-day test volume</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7}>
                <defs>
                  <linearGradient id="gTest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tests"
                  stroke="var(--color-chart-1)"
                  fill="url(#gTest)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">7-day paid revenue</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                  }}
                  formatter={(v) => [`$${Number(v ?? 0)}`, "Paid"]}
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-chart-2)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Recent patients</CardTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href="/patients">
                View <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentPatients.length === 0 ? (
              <Empty text="No patients yet." />
            ) : (
              <ScrollArea className="h-48 pr-3">
                <ul className="space-y-3 text-sm">
                  {recentPatients.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.id} · {p.medicalAid}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/patients/${p.id}`}>Open</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Recent test requests</CardTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href="/orders">
                View <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48 pr-3">
              <ul className="space-y-3 text-sm">
                {recentOrders.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{o.id}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {o.status} · {o.priority}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/orders/${o.id}`}>Open</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Department workload (demo orders)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deptWorkload} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="department" width={140} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }}
              />
              <Bar dataKey="tests" fill="var(--color-chart-3)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-border/70 shadow-sm bg-gradient-to-br from-card via-card to-cyan-50/30 dark:to-cyan-950/20">
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight mt-1">{value}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
