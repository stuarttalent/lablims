"use client";

import { catalogueWithPrices } from "@/lib/pricing";
import { useData } from "@/contexts/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import type { TestDepartment } from "@/types";
import { FlaskConical, Search } from "lucide-react";

const DEPT_ORDER: TestDepartment[] = [
  "Haematology",
  "Chemistry",
  "Microbiology",
  "Serology/Immunology",
  "Molecular",
];

export default function CataloguePage() {
  const { store } = useData();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const list = catalogueWithPrices(store.settings);
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        t.department.toLowerCase().includes(needle) ||
        t.sampleType.toLowerCase().includes(needle) ||
        (t.loincCode?.toLowerCase().includes(needle) ?? false),
    );
  }, [store.settings, q]);

  const grouped = useMemo(() => {
    const m = new Map<TestDepartment, typeof rows>();
    for (const d of DEPT_ORDER) m.set(d, []);
    for (const r of rows) {
      const arr = m.get(r.department) ?? [];
      arr.push(r);
      m.set(r.department, arr);
    }
    return m;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Available tests</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          What your lab offers, sample types, and current price list.
          LOINC codes appear for technical use; ranges are illustrative only.
        </p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search tests, departments, sample types…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {DEPT_ORDER.map((dep) => {
          const items = grouped.get(dep) ?? [];
          if (items.length === 0) return null;
          return (
            <Card key={dep} className="border-border shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FlaskConical className="size-4 text-primary" />
                  {dep}
                </CardTitle>
                <Badge variant="outline">{items.length} tests</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{t.name}</p>
                          {t.loincCode ? (
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              LOINC {t.loincCode}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Sample: {t.sampleType} · TAT: {t.turnaroundTime}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">${t.effectivePrice.toFixed(0)}</p>
                        <p className="text-[11px] text-muted-foreground">list price</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                      <div>
                        <p className="text-muted-foreground">Reference / interpretation</p>
                        <p>{t.referenceRange ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Units</p>
                        <p>{t.units ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
