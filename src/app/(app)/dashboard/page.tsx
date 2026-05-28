"use client";

import { useAuth } from "@/contexts/auth-context";
import { useData } from "@/contexts/data-context";
import {
  buildLast7DayRows,
  computeTatRolling,
  computeYesterdayStats,
  departmentVolumesLastDays,
  mostRequestedTests,
} from "@/lib/dashboard-chiron-metrics";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DemoStore, UserRole } from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileWarning,
  FlaskConical,
  Import as ImportIcon,
  ListOrdered,
  Receipt,
  Sparkles,
  TestTube,
  Timer,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";

function depLabel(name: string): string {
  if (name === "Chemistry") return "Biochemistry blood";
  if (name === "Serology/Immunology") return "Serology · immunology";
  return name;
}

/** Extra discipline tags from the Chiron dashboard (not all mapped to demo catalogue departments). */
const EXTRA_CHIRON_DEPT_LABELS = [
  "Andrology",
  "Bacteriology",
  "Biochemistry faeces",
  "Cerebrospinal fluid",
  "Coagulation",
  "Endocrinology",
  "HIV monitoring",
  "Immuno-chemistry",
  "Virology",
] as const;

function volumeMapFromStore(store: DemoStore, days: number) {
  const rows = departmentVolumesLastDays(store, days);
  const m = new Map(rows.map((r) => [r.department, r.tests]));
  return m;
}

type DemoInstrumentRow = { name: string; lastRun: string; status: "ok" | "warn" };

const DEMO_INTERFACE_ROWS: DemoInstrumentRow[] = [
  { name: "Biobase biochemistry", lastRun: "2026-05-06T09:14:00", status: "ok" },
  { name: "Maccura 560", lastRun: "2026-04-26T12:23:00", status: "warn" },
  { name: "Maccura i1000 UE034", lastRun: "2026-05-10T16:41:00", status: "ok" },
  { name: "Maccura i1000 UE023", lastRun: "2026-05-09T11:02:00", status: "ok" },
];

function hoursSince(iso: string): number {
  return Math.floor((Date.now() - Date.parse(iso)) / 3600000);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { store, hydrated } = useData();
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [shiftBusy, setShiftBusy] = useState(false);
  const [shiftNarrative, setShiftNarrative] = useState<string | null>(null);
  const [shiftStats, setShiftStats] = useState<{
    incompleteOrders: number;
    statIncomplete: number;
    overdueVsEta: number;
    warningVsEta: number;
    onTrackVsEta: number;
    pendingVerificationLines: number;
  } | null>(null);
  const [shiftSource, setShiftSource] = useState<"openai" | "heuristic" | null>(null);

  if (!hydrated) {
    return <LabLoader className="min-h-[50vh]" message="Syncing laboratory data…" />;
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const orders = store.orders;
  const patients = store.patients;
  const invoices = store.invoices;

  const yStats = computeYesterdayStats(store);
  const weekRows = buildLast7DayRows(store);
  const tatRoll = computeTatRolling(store);
  const top30 = mostRequestedTests(store, 30, new Date(), 10);
  const topToday = mostRequestedTests(store, 1, new Date(), 10);
  const volMap = volumeMapFromStore(store, 30);

  const testsToday = orders.filter((o) => o.collectionDate.startsWith(today));
  const testVolumeToday = testsToday.reduce((s, o) => s + o.tests.length, 0);
  const pendingResults = orders.filter((o) =>
    ["Requested", "Sample Collected", "In Progress", "Pending Verification"].includes(o.status),
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
      const lineDeps = o.tests.map((t) => getTestById(t.testId)?.department).filter(Boolean);
      return sum + lineDeps.filter((d) => d === dep).length;
    }, 0);
    return { department: dep, tests: count };
  });

  const firstName = user?.name?.split(/\s+/)[0] ?? "there";

  async function generateShiftBrief() {
    setShiftBusy(true);
    try {
      const res = await fetch("/api/ai/shift-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store }),
      });
      const data = (await res.json()) as {
        narrative?: string;
        stats?: {
          incompleteOrders: number;
          statIncomplete: number;
          overdueVsEta: number;
          warningVsEta: number;
          onTrackVsEta: number;
          pendingVerificationLines: number;
          topDepartmentBacklog: { department: string; openLines: number }[];
        };
        source?: "openai" | "heuristic";
        error?: string;
      };
      if (!res.ok || !data.narrative || !data.stats) {
        toast.error(data.error ?? "Could not build shift briefing.");
        return;
      }
      setShiftNarrative(data.narrative);
      setShiftStats({
        incompleteOrders: data.stats.incompleteOrders,
        statIncomplete: data.stats.statIncomplete,
        overdueVsEta: data.stats.overdueVsEta,
        warningVsEta: data.stats.warningVsEta,
        onTrackVsEta: data.stats.onTrackVsEta,
        pendingVerificationLines: data.stats.pendingVerificationLines,
      });
      setShiftSource(data.source ?? "heuristic");
      toast.success(
        data.source === "openai"
          ? "Briefing ready (AI)."
          : "Briefing ready (heuristic — set OPENAI_API_KEY for full AI).",
      );
    } catch {
      toast.error("Shift briefing request failed.");
    } finally {
      setShiftBusy(false);
    }
  }

  const tatPerf =
    tatRoll.prev7AvgHours != null && tatRoll.curr7AvgHours != null
      ? tatRoll.curr7AvgHours <= tatRoll.prev7AvgHours * 1.05
        ? "Similar"
        : "Watch"
      : "—";

  return (
    <div className="space-y-6">
      <header className="border-b border-border/80 pb-5">
        <p className="text-lg font-semibold tracking-tight text-foreground">
          Welcome {firstName}
        </p>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Here are some of yesterday&apos;s statistics for your laboratory ({yStats.dateLabel}).
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ChironStatCard
          label="Requisitions captured"
          value={yStats.requisitionsCaptured}
          icon={ListOrdered}
        />
        <ChironStatCard
          label="Tests requested"
          value={yStats.testsRequested}
          icon={TestTube}
        />
        <ChironStatCard
          label="Unentered results"
          value={yStats.unenteredResults}
          icon={Clock}
        />
        <ChironStatCard
          label="Tests running late"
          value={yStats.testsRunningLate}
          icon={AlertTriangle}
          tone="warning"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          asChild
          className="gap-2 rounded-md bg-primary px-5 shadow-sm hover:bg-primary/90"
        >
          <Link href="/results">
            <ArrowLeft className="size-4 rotate-180" />
            View results
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2 rounded-md border-primary/40">
          <Link href="/send-receive">
            <ImportIcon className="size-4" />
            Interfaced results
            <Badge variant="secondary" className="ml-1 font-mono text-[10px]">
              {yStats.interfacedImportHint} pending
            </Badge>
          </Link>
        </Button>
      </div>

      {user ? <QuickActions role={user.role} /> : null}

      <Card className="overflow-hidden border-border/80 shadow-md">
        <CardHeader className="border-b border-border/60 bg-muted/30 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">
              Quantitative performance (last 7 days)
            </CardTitle>
            <Badge variant="outline" className="font-normal text-muted-foreground">
              <Timer className="size-3.5 mr-1" />
              Throughput &amp; TAT
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/60">
                <TableHead className="w-[140px] pl-4">Day</TableHead>
                <TableHead>TAT exceeded</TableHead>
                <TableHead>Unentered</TableHead>
                <TableHead className="w-14 text-center"> </TableHead>
                <TableHead className="pr-4 text-right">Total tests</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weekRows.map((row) => (
                <TableRow key={row.isoDate} className="border-border/50">
                  <TableCell className="pl-4 font-medium text-foreground">
                    {row.dateShort}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {row.forms > 0 ? (
                      <>
                        {row.tatExceededPct.toFixed(1)}%{" "}
                        <span className="text-foreground/80">| {row.tatExceededCount}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {row.totalTests > 0 ? (
                      <>
                        {row.unenteredPct.toFixed(1)}%{" "}
                        <span className="text-foreground/80">| {row.unenteredCount}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.trophy ? (
                      <Trophy
                        className="inline-block size-4 text-amber-500"
                        aria-label="Strong day"
                      />
                    ) : null}
                  </TableCell>
                  <TableCell className="pr-4 text-right text-sm tabular-nums">
                    {row.totalTests > 0 ? (
                      <>
                        <span className="font-medium text-foreground">{row.totalTests}</span>
                        <span className="text-muted-foreground"> in {row.forms} forms</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">No activity</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RollingTatChip
          title="Prev 7 day r. avg TAT"
          value={tatRoll.prev7AvgHours}
        />
        <RollingTatChip
          title="Curr 7 day r. avg TAT"
          value={tatRoll.curr7AvgHours}
        />
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">TAT performance</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{tatPerf}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Rolling comparison of realised sign-out time
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">30d unentered load</p>
            <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
              {(tatRoll.unenteredLast30Fraction * 100).toFixed(1)}%
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {tatRoll.unenteredLast30Lines} / {tatRoll.openLinesCounted} open lines · last 30 d
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Laboratory drivers</CardTitle>
          <CardDescription>
            Typical Chiron KPI strip — correlate capture, entry, and sign-out latency in production.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          {[
            "Collected → capture",
            "Capture → entry",
            "Entry → sign-out",
            "Total time",
            "Requisitions",
            "Tests",
            "% TAT exceeded",
            "% Unentered",
          ].map((t) => (
            <Badge key={t} variant="outline" className="font-normal">
              {t}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Most requested tests (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestList rows={top30} empty="No tests in the last 30 days." />
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Most requested tests (today)</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestList rows={topToday} empty="Nothing collected today yet." />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ImportIcon className="size-4" />
              Interfaced results
            </CardTitle>
            <CardDescription>
              NICD NMC-style queue — click through to send / receive when your bridge is live.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              <Button asChild variant="link" className="h-auto p-0 text-primary">
                <Link href="/send-receive">Click here</Link>
              </Button>{" "}
              to transmit any outstanding interface batches.
            </p>
            <Button asChild size="sm" variant="secondary">
              <Link href="/interoperability">Open FHIR &amp; export</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Instruments</CardTitle>
            <CardDescription>Last run heartbeat (demo schedule)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Instrument</TableHead>
                  <TableHead className="pr-4 text-right">Last run</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMO_INTERFACE_ROWS.map((row) => {
                  const h = hoursSince(row.lastRun);
                  return (
                    <TableRow key={row.name}>
                      <TableCell className="pl-4">
                        <span className="flex items-center gap-2">
                          {row.status === "ok" ? (
                            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                          )}
                          {row.name}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4 text-right text-xs text-muted-foreground">
                        {format(Date.parse(row.lastRun), "yyyy-MM-dd HH:mm")}{" "}
                        <span className={cn("block text-foreground tabular-nums", row.status === "warn" && "text-amber-700")}>
                          {h} hrs ago
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm bg-muted/20">
        <CardContent className="py-4 text-sm flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Control data</span>
          <Button asChild variant="link" className="h-auto p-0 text-primary">
            <Link href="/quality/programmes">Click here</Link>
          </Button>
          <span className="text-muted-foreground">to review QC recommendations.</span>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-sm font-semibold tracking-tight mb-3">
          Departmental volumes (last 30 days)
        </h2>
        <div className="flex flex-wrap gap-2">
          {store.settings.departments.map((d) => {
            const n = volMap.get(d) ?? 0;
            return (
              <Link
                key={d}
                href="/catalogue"
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  n > 0
                    ? "border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10"
                    : "border-border/80 bg-card text-muted-foreground hover:bg-muted/50",
                )}
              >
                {depLabel(d)}
                <span className="ml-1.5 tabular-nums text-muted-foreground">({n})</span>
              </Link>
            );
          })}
          {EXTRA_CHIRON_DEPT_LABELS.map((label) => (
            <span
              key={label}
              className="rounded-full border border-dashed border-border/80 px-3 py-1.5 text-xs text-muted-foreground capitalize"
            >
              {label} (0)
            </span>
          ))}
        </div>
      </section>

      {user ? (
        <Card className="border-border/70 shadow-sm border-sky-500/20 bg-sky-50/15 dark:bg-sky-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4 text-sky-600" />
              Shift &amp; routing snapshot
            </CardTitle>
            <CardDescription>
              Optional AI briefing on the same workload picture — verify against live operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              size="sm"
              disabled={shiftBusy}
              onClick={() => void generateShiftBrief()}
            >
              {shiftBusy ? "Generating…" : "Generate shift briefing"}
            </Button>
            {shiftStats ? (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">Active: {shiftStats.incompleteOrders}</Badge>
                <Badge variant="secondary">STAT: {shiftStats.statIncomplete}</Badge>
                <Badge variant="outline">On track: {shiftStats.onTrackVsEta}</Badge>
                <Badge variant="outline">Warning: {shiftStats.warningVsEta}</Badge>
                <Badge variant="destructive">Late vs ETA: {shiftStats.overdueVsEta}</Badge>
                <Badge variant="secondary">
                  Auth queue: {shiftStats.pendingVerificationLines}
                </Badge>
                {shiftSource ? (
                  <Badge variant="outline" className="font-normal">
                    {shiftSource === "openai" ? "AI narrative" : "Heuristic narrative"}
                  </Badge>
                ) : null}
              </div>
            ) : null}
            {shiftNarrative ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{shiftNarrative}</p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Run a briefing to populate workload vs ETA buckets and a short narrative.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

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
          hint="Cash recorded today"
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
                    <li key={p.id} className="flex items-center justify-between gap-2">
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
                  <li key={o.id} className="flex items-center justify-between gap-2">
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
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">Trend charts</span>
            <span className="hidden sm:inline"> — volume &amp; revenue </span>
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
              <CardTitle className="text-base">Department volume (all time in demo)</CardTitle>
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

function ChironStatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "warning";
}) {
  return (
    <Card
      className={cn(
        "border-border/80 shadow-sm overflow-hidden",
        tone === "warning" && "border-amber-500/25 bg-amber-500/[0.04]",
      )}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
            tone === "warning" && "bg-amber-500/15 text-amber-700",
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground leading-snug">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums mt-0.5">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RollingTatChip({ title, value }: { title: string; value: number | null }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground leading-snug">{title}</p>
        <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
          {value != null ? `${value.toFixed(1)} hrs` : "—"}
        </p>
      </CardContent>
    </Card>
  );
}

function RequestList({
  rows,
  empty,
}: {
  rows: { name: string; count: number }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">{empty}</p>;
  }
  return (
    <ol className="space-y-2 text-sm">
      {rows.map((r, i) => (
        <li key={r.name} className="flex justify-between gap-2 border-b border-border/40 pb-2 last:border-0">
          <span className="text-muted-foreground tabular-nums w-6">{i + 1}.</span>
          <span className="flex-1 min-w-0 truncate">{r.name}</span>
          <span className="font-medium tabular-nums">{r.count}</span>
        </li>
      ))}
    </ol>
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
        <CardDescription>Frequent workflows from the operational desk.</CardDescription>
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
