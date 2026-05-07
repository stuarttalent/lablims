"use client";

import { useAuth } from "@/contexts/auth-context";
import { useData } from "@/contexts/data-context";
import { getTestById } from "@/data/catalogue";
import {
  canCreateOrder,
  canCreatePatient,
  canManageBilling,
  hasAdminPrivileges,
  canVerifyResults,
} from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LabLoader } from "@/components/ui/lab-loader";
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
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileWarning,
  FlaskConical,
  Receipt,
  TestTube,
  UserPlus,
  Users,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { store, hydrated } = useData();
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  if (!hydrated) {
    return (
      <LabLoader className="min-h-[50vh]" message="Syncing laboratory data…" />
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
          <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            See what needs attention today at {store.settings.labName}. Use{" "}
            <span className="font-medium text-foreground/90">Quick actions</span>{" "}
            for common tasks — detailed tools stay under{" "}
            <span className="font-medium text-foreground/90">More tools</span>{" "}
            in the sidebar when you need them.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {format(new Date(), "PPP")}
        </Badge>
      </div>

      {user ? <QuickActions role={user.role} /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Patients on file"
          value={patients.length.toString()}
          icon={Users}
          hint="All registered people"
        />
        <MetricCard
          title="Tests today"
          value={testVolumeToday.toString()}
          icon={TestTube}
          hint="Test lines scheduled today"
        />
        <MetricCard
          title="Still in progress"
          value={pendingResults.toString()}
          icon={Clock}
          hint="Not yet released to the patient"
        />
        <MetricCard
          title="Finished orders"
          value={completedResults.toString()}
          icon={CheckCircle2}
          hint="Verified or already released"
        />
        <MetricCard
          title="Paid today"
          value={`$${revenueToday.toFixed(0)}`}
          icon={Banknote}
          hint={"Cash recorded today"}
        />
        <MetricCard
          title="Open invoices"
          value={unpaidInvoices.toString()}
          icon={FileWarning}
          hint="Awaiting payment"
        />
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
            <CardTitle className="text-base">Recent orders</CardTitle>
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

      <Collapsible
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        className="rounded-xl border border-border/70 bg-card/40 shadow-sm"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium outline-none hover:bg-muted/40 rounded-xl focus-visible:ring-2 focus-visible:ring-ring">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">Trends</span>
            <span className="hidden sm:inline"> — charts for supervisors & billing </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              analyticsOpen && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border/70 px-4 pb-4 pt-2 data-[ending-style]:animate-none">
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

          <Card className="border-border/70 shadow-sm mt-4">
            <CardHeader>
              <CardTitle className="text-base">Department volume</CardTitle>
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function QuickActions({ role }: { role: UserRole }) {
  const actions: {
    href: string;
    title: string;
    hint: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [];

  if (canCreatePatient(role)) {
    actions.push({
      href: "/patients/new",
      title: "Register patient",
      hint: "New person in the system",
      icon: UserPlus,
    });
  }
  if (canCreateOrder(role)) {
    actions.push({
      href: "/orders/new",
      title: "New order",
      hint: "Request lab tests",
      icon: ClipboardList,
    });
  }
  actions.push({
    href: "/results",
    title: "Results inbox",
    hint: "Open orders to enter values",
    icon: FlaskConical,
  });
  if (hasAdminPrivileges(role)) {
    actions.push({
      href: "/catalogue",
      title: "Test list",
      hint: "See panels & prices",
      icon: TestTube,
    });
  }
  if (canVerifyResults(role)) {
    actions.push({
      href: "/results/verify",
      title: "Authorization queue",
      hint: "Sign off pending results",
      icon: ClipboardCheck,
    });
  }
  if (canManageBilling(role)) {
    actions.push({
      href: "/billing/new",
      title: "New invoice",
      hint: "Bill a visit or order set",
      icon: Receipt,
    });
  }

  if (actions.length === 0) return null;

  return (
    <Card className="border-border/70 shadow-sm border-primary/15 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quick actions</CardTitle>
        <CardDescription>
          Frequent steps in one place. Everything else stays in the sidebar.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map(({ href, title, hint, icon: Icon }) => (
          <Button
            key={href + title}
            asChild
            variant="outline"
            className="h-auto justify-start gap-3 py-3 px-3.5 hover:bg-muted/60"
          >
            <Link href={href} className="flex items-start text-left">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-medium leading-snug">{title}</span>
                <span className="block text-xs font-normal text-muted-foreground leading-snug">
                  {hint}
                </span>
              </span>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
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
    <Card className="border-border/70 shadow-sm bg-card">
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
