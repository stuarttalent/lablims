"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ShieldCheck } from "lucide-react";
import { LabModulePage } from "@/components/layout/lab-module-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type QCType = "IQC" | "EQC";

type QCEntry = {
  id: string;
  date: string;
  qcType: QCType;
  programme: string;
  analyte: string;
  target: number;
  result: number;
};

type QCFormState = {
  date: string;
  programme: string;
  analyte: string;
  target: string;
  result: string;
};

const DEFAULT_PROGRAMMES: Record<QCType, string[]> = {
  IQC: ["Chemistry L1", "Chemistry L2", "Haematology Low", "Haematology High"],
  EQC: ["UK NEQAS", "RIQAS", "AfriLab EQA"],
};

const DEFAULT_ANALYTES = ["Glucose", "Creatinine", "ALT", "Hb", "WBC"];

const INITIAL_ENTRIES: QCEntry[] = [
  { id: "qc-1", date: "2026-05-24", qcType: "IQC", programme: "Chemistry L1", analyte: "Glucose", target: 5.5, result: 5.4 },
  { id: "qc-2", date: "2026-05-25", qcType: "IQC", programme: "Chemistry L1", analyte: "Glucose", target: 5.5, result: 5.7 },
  { id: "qc-3", date: "2026-05-26", qcType: "IQC", programme: "Chemistry L1", analyte: "Glucose", target: 5.5, result: 5.3 },
  { id: "qc-4", date: "2026-05-27", qcType: "IQC", programme: "Chemistry L1", analyte: "Glucose", target: 5.5, result: 5.9 },
];

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 1;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance) || 1;
}

function ljStatus(delta: number, sd: number): string {
  const z = sd > 0 ? Math.abs(delta / sd) : 0;
  if (z > 3) return "Out >3SD";
  if (z > 2) return "Warn >2SD";
  return "In range";
}

export default function QualityProgrammesPage() {
  const [activeType, setActiveType] = useState<QCType>("IQC");
  const [entries, setEntries] = useState<QCEntry[]>(INITIAL_ENTRIES);
  const [form, setForm] = useState<QCFormState>({
    date: format(new Date(), "yyyy-MM-dd"),
    programme: DEFAULT_PROGRAMMES.IQC[0],
    analyte: DEFAULT_ANALYTES[0],
    target: "",
    result: "",
  });

  const visibleEntries = useMemo(() => {
    return entries
      .filter((e) => e.qcType === activeType)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, activeType]);

  const selectedProgramme = form.programme;
  const selectedAnalyte = form.analyte;

  const chartSource = useMemo(() => {
    return visibleEntries.filter(
      (e) => e.programme === selectedProgramme && e.analyte === selectedAnalyte,
    );
  }, [visibleEntries, selectedProgramme, selectedAnalyte]);

  const chartStats = useMemo(() => {
    if (chartSource.length === 0) return null;
    const avgTarget =
      chartSource.reduce((acc, e) => acc + e.target, 0) / chartSource.length;
    const sd = standardDeviation(chartSource.map((e) => e.result));
    return { target: avgTarget, sd };
  }, [chartSource]);

  const chartData = useMemo(() => {
    if (!chartStats) return [];
    return chartSource.map((e) => ({
      day: e.date.slice(5),
      result: e.result,
      target: chartStats.target,
      plus1: chartStats.target + chartStats.sd,
      minus1: chartStats.target - chartStats.sd,
      plus2: chartStats.target + chartStats.sd * 2,
      minus2: chartStats.target - chartStats.sd * 2,
      plus3: chartStats.target + chartStats.sd * 3,
      minus3: chartStats.target - chartStats.sd * 3,
    }));
  }, [chartSource, chartStats]);

  function setType(next: QCType) {
    setActiveType(next);
    setForm((prev) => ({
      ...prev,
      programme: DEFAULT_PROGRAMMES[next][0],
    }));
  }

  function addEntry() {
    const target = Number(form.target);
    const result = Number(form.result);
    if (!form.date || !form.programme || !form.analyte) {
      toast.error("Date, programme and analyte are required.");
      return;
    }
    if (!Number.isFinite(target) || !Number.isFinite(result)) {
      toast.error("Enter numeric target and result values.");
      return;
    }
    const newEntry: QCEntry = {
      id: crypto.randomUUID(),
      date: form.date,
      qcType: activeType,
      programme: form.programme,
      analyte: form.analyte,
      target,
      result,
    };
    setEntries((prev) => [...prev, newEntry]);
    setForm((prev) => ({ ...prev, target: "", result: "" }));
    toast.success(`${activeType} result captured.`);
  }

  return (
    <LabModulePage
      title="Quality programmes"
      description="Track IQC and EQC daily target/result entries and automatically plot Levey-Jennings trends."
      stats={[
        { label: "QC mode", value: activeType, icon: ShieldCheck },
        { label: "Entries (visible)", value: String(visibleEntries.length), icon: ShieldCheck },
        { label: "Programme", value: selectedProgramme || "None", icon: ShieldCheck },
        { label: "Analyte", value: selectedAnalyte || "None", icon: ShieldCheck },
      ]}
    >
      <Tabs value={activeType} onValueChange={(v) => setType(v as QCType)}>
        <TabsList>
          <TabsTrigger value="IQC">IQC</TabsTrigger>
          <TabsTrigger value="EQC">EQC</TabsTrigger>
        </TabsList>
        <TabsContent value="IQC" className="space-y-4" />
        <TabsContent value="EQC" className="space-y-4" />
      </Tabs>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Daily QC entry</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Programme</Label>
            <Select
              value={form.programme}
              onValueChange={(v) => setForm((prev) => ({ ...prev, programme: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Programme" />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_PROGRAMMES[activeType].map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Analyte</Label>
            <Select
              value={form.analyte}
              onValueChange={(v) => setForm((prev) => ({ ...prev, analyte: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Analyte" />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_ANALYTES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Target value</Label>
            <Input
              inputMode="decimal"
              placeholder="e.g. 5.5"
              value={form.target}
              onChange={(e) => setForm((prev) => ({ ...prev, target: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>QC result</Label>
            <Input
              inputMode="decimal"
              placeholder="e.g. 5.7"
              value={form.result}
              onChange={(e) => setForm((prev) => ({ ...prev, result: e.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <Button type="button" className="w-full" onClick={addEntry}>
              Save daily QC
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Levey-Jennings chart</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add daily entries for {activeType} ({selectedProgramme} / {selectedAnalyte}) to display the LJ chart.
            </p>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={chartStats?.target} stroke="#64748b" strokeDasharray="5 5" label="Target" />
                  <Line type="monotone" dataKey="result" stroke="#2563eb" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="plus1" stroke="#059669" dot={false} />
                  <Line type="monotone" dataKey="minus1" stroke="#059669" dot={false} />
                  <Line type="monotone" dataKey="plus2" stroke="#d97706" dot={false} />
                  <Line type="monotone" dataKey="minus2" stroke="#d97706" dot={false} />
                  <Line type="monotone" dataKey="plus3" stroke="#dc2626" dot={false} />
                  <Line type="monotone" dataKey="minus3" stroke="#dc2626" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{activeType} daily log</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <div className="overflow-x-auto rounded-b-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Programme</TableHead>
                  <TableHead>Analyte</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No {activeType} entries yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleEntries.map((row) => {
                    const sameGroup = visibleEntries.filter(
                      (e) => e.programme === row.programme && e.analyte === row.analyte,
                    );
                    const sd = standardDeviation(sameGroup.map((e) => e.result));
                    const delta = row.result - row.target;
                    return (
                      <TableRow key={row.id}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.programme}</TableCell>
                        <TableCell>{row.analyte}</TableCell>
                        <TableCell className="text-right">{row.target.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{row.result.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{delta.toFixed(2)}</TableCell>
                        <TableCell>{ljStatus(delta, sd)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </LabModulePage>
  );
}
