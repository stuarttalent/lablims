"use client";

import { getCatalogueTests, nextCustomTestId } from "@/data/catalogue";
import { ConfigureTestCard } from "@/components/catalogue/configure-test-card";
import { useData } from "@/contexts/data-context";
import { applyTestKindToCatalogueTest } from "@/lib/test-kind";
import { useAuth } from "@/contexts/auth-context";
import { hasAdminPrivileges } from "@/lib/permissions";
import type {
  CatalogueGenderScope,
  CatalogueTestOverride,
  ReferenceRangeBand,
  ResultCommentRule,
  ResultFlag,
  TestDepartment,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LabLoader } from "@/components/ui/lab-loader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { FlaskConical, Plus, Trash2 } from "lucide-react";

const DEPT_ORDER: TestDepartment[] = [
  "Haematology",
  "Chemistry",
  "Microbiology",
  "Serology/Immunology",
  "Molecular",
];

const FLAG_OPTIONS: (ResultFlag | "none")[] = [
  "none",
  "Normal",
  "Low",
  "High",
  "Critical",
];

const GENDER_LABELS: { id: CatalogueGenderScope; label: string }[] = [
  { id: "all", label: "All" },
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];

function emptyBand(): ReferenceRangeBand {
  return { genders: ["all"], rangeText: "" };
}

function emptyRule(): ResultCommentRule {
  return { id: crypto.randomUUID(), comment: "" };
}

export default function ConfigureCataloguePage() {
  const { store, updateSettings } = useData();
  const { user, hydrated } = useAuth();
  const router = useRouter();
  const ok = user && hasAdminPrivileges(user.role);

  useEffect(() => {
    if (!hydrated) return;
    if (!ok) router.replace("/dashboard");
  }, [hydrated, ok, router]);

  if (!hydrated) {
    return (
      <LabLoader className="min-h-[35vh]" message="Opening test configuration…" />
    );
  }

  if (!ok) {
    return null;
  }

  const overrides = store.settings.catalogueOverrides;
  const catalogue = getCatalogueTests(store.settings);
  const customIds = new Set(store.settings.customTests.map((t) => t.id));

  function addCustomTest() {
    const id = nextCustomTestId(store.settings.customTests);
    const test = applyTestKindToCatalogueTest(
      {
        id,
        name: "New laboratory test",
        department: "Chemistry",
        sampleType: "Serum",
        turnaroundTime: "24 hours",
        price: 0,
      },
      "quantitative",
    );
    updateSettings({
      customTests: [...store.settings.customTests, test],
    });
    toast.success("Custom test added — configure name, type, and price.");
  }

  function patchCustomTest(id: string, patch: Partial<(typeof catalogue)[0]>) {
    updateSettings({
      customTests: store.settings.customTests.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    });
  }

  function deleteCustomTest(id: string) {
    const customTests = store.settings.customTests.filter((t) => t.id !== id);
    const priceOverrides = { ...store.settings.priceOverrides };
    delete priceOverrides[id];
    const catalogueOverrides = { ...overrides };
    delete catalogueOverrides[id];
    updateSettings({ customTests, priceOverrides, catalogueOverrides });
    toast.message("Custom test removed");
  }

  function patchPrice(testId: string, price: number | null) {
    const priceOverrides = { ...store.settings.priceOverrides };
    if (price === null) delete priceOverrides[testId];
    else priceOverrides[testId] = price;
    updateSettings({ priceOverrides });
  }

  function setOverride(testId: string, next: CatalogueTestOverride | null) {
    const copy = { ...overrides };
    if (
      !next ||
      (!next.referenceBands?.length && !next.defaultCommentRules?.length)
    ) {
      delete copy[testId];
    } else {
      copy[testId] = next;
    }
    updateSettings({ catalogueOverrides: copy });
  }

  function patchOverride(testId: string, patch: Partial<CatalogueTestOverride>) {
    const prev = overrides[testId] ?? {};
    setOverride(testId, { ...prev, ...patch });
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configure tests</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Add tests, set result type (profile, quantitative, qualitative, or
            microbiology), pricing, reference intervals, and auto-comments. AI and the
            results workspace use these rules.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="gap-1" onClick={addCustomTest}>
            <Plus className="size-4" />
            Add test
          </Button>
          <Button variant="outline" asChild>
            <Link href="/catalogue">View catalogue</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {DEPT_ORDER.map((dep) => {
          const tests = catalogue.filter((t) => t.department === dep);
          if (tests.length === 0) return null;
          return (
            <div key={dep} className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FlaskConical className="size-4 text-primary" />
                {dep}
              </div>
              {tests.map((t) => {
                const o = overrides[t.id] ?? {};
                const bands = o.referenceBands ?? [];
                const rules = o.defaultCommentRules ?? [];
                const isCustom = customIds.has(t.id);

                return (
                  <div key={t.id} className="space-y-0">
                    <ConfigureTestCard
                      test={t}
                      isCustom={isCustom}
                      settings={store.settings}
                      onPatchCustom={patchCustomTest}
                      onPatchOverride={(testId, patch) =>
                        patchOverride(testId, patch)
                      }
                      onDeleteCustom={isCustom ? deleteCustomTest : undefined}
                      onPatchPrice={patchPrice}
                    />
                    <Card className="border-border/80 shadow-sm border-t-0 rounded-t-none -mt-px">
                    <CardContent className="space-y-6 pt-6">
                      {(bands.length || rules.length) && !isCustom ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Custom reference / comment rules active
                        </Badge>
                      ) : null}
                      <section className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium">
                            Reference range by age &amp; gender
                          </Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() =>
                              patchOverride(t.id, {
                                referenceBands: [...bands, emptyBand()],
                              })
                            }
                          >
                            <Plus className="size-3.5" />
                            Add band
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Bands are evaluated top to bottom. Leave age empty for open-ended.
                          Patient sex matches Male / Female / Other from the registration record.
                        </p>
                        {bands.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            No custom bands — the static catalogue text is used for every patient.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {bands.map((band, bi) => (
                              <div
                                key={bi}
                                className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-3"
                              >
                                <div className="grid gap-3 sm:grid-cols-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Min age (years)</Label>
                                    <Input
                                      type="number"
                                      placeholder="e.g. 18"
                                      value={band.minAgeYears ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        const next = [...bands];
                                        const n = parseInt(v, 10);
                                        next[bi] = {
                                          ...band,
                                          minAgeYears:
                                            v === "" || Number.isNaN(n) ? undefined : n,
                                        };
                                        patchOverride(t.id, {
                                          referenceBands: next,
                                        });
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Max age (years)</Label>
                                    <Input
                                      type="number"
                                      placeholder="e.g. 120"
                                      value={band.maxAgeYears ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        const next = [...bands];
                                        const n = parseInt(v, 10);
                                        next[bi] = {
                                          ...band,
                                          maxAgeYears:
                                            v === "" || Number.isNaN(n) ? undefined : n,
                                        };
                                        patchOverride(t.id, {
                                          referenceBands: next,
                                        });
                                      }}
                                    />
                                  </div>
                                  <div className="flex items-end justify-end">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive"
                                      onClick={() => {
                                        const next = bands.filter((_, i) => i !== bi);
                                        patchOverride(t.id, { referenceBands: next });
                                        toast.message("Band removed");
                                      }}
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Applies to</Label>
                                  <div className="flex flex-wrap gap-3">
                                    {GENDER_LABELS.map(({ id, label }) => (
                                      <label
                                        key={id}
                                        className="flex items-center gap-2 text-xs cursor-pointer"
                                      >
                                        <Checkbox
                                          checked={band.genders.includes(id)}
                                          onCheckedChange={(c) => {
                                            const on = c === true;
                                            let g = [...band.genders];
                                            if (id === "all") {
                                              g = on ? ["all"] : [];
                                            } else {
                                              g = g.filter((x) => x !== "all");
                                              if (on) g.push(id);
                                              else g = g.filter((x) => x !== id);
                                              if (g.length === 0) g = ["all"];
                                            }
                                            const next = [...bands];
                                            next[bi] = { ...band, genders: g };
                                            patchOverride(t.id, {
                                              referenceBands: next,
                                            });
                                          }}
                                        />
                                        {label}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Interval / interpretive text</Label>
                                  <Textarea
                                    rows={2}
                                    value={band.rangeText}
                                    onChange={(e) => {
                                      const next = [...bands];
                                      next[bi] = {
                                        ...band,
                                        rangeText: e.target.value,
                                      };
                                      patchOverride(t.id, { referenceBands: next });
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>

                      <section className="space-y-3 border-t border-border/60 pt-5">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium">
                            Default comments for results
                          </Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() =>
                              patchOverride(t.id, {
                                defaultCommentRules: [...rules, emptyRule()],
                              })
                            }
                          >
                            <Plus className="size-3.5" />
                            Add rule
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          A rule applies when the flag matches (if set) and the result value
                          contains the phrase (if set). All set conditions must match.
                        </p>
                        {rules.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            No auto-comments configured for this test.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {rules.map((rule, ri) => (
                              <div
                                key={rule.id}
                                className="rounded-xl border border-border/70 p-3 space-y-3"
                              >
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Flag (optional)</Label>
                                    <Select
                                      value={(rule.flag ?? "none") as ResultFlag | "none"}
                                      onValueChange={(v) => {
                                        const next = [...rules];
                                        next[ri] = {
                                          ...rule,
                                          flag: v === "none" ? undefined : (v as ResultFlag),
                                        };
                                        patchOverride(t.id, {
                                          defaultCommentRules: next,
                                        });
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {FLAG_OPTIONS.map((f) => (
                                          <SelectItem key={f} value={f}>
                                            {f === "none" ? "Any flag" : f}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Result contains (optional)</Label>
                                    <Input
                                      placeholder="e.g. positive"
                                      value={rule.valueContains ?? ""}
                                      onChange={(e) => {
                                        const next = [...rules];
                                        next[ri] = {
                                          ...rule,
                                          valueContains: e.target.value || undefined,
                                        };
                                        patchOverride(t.id, {
                                          defaultCommentRules: next,
                                        });
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Comment to insert</Label>
                                  <Textarea
                                    rows={2}
                                    value={rule.comment}
                                    onChange={(e) => {
                                      const next = [...rules];
                                      next[ri] = {
                                        ...rule,
                                        comment: e.target.value,
                                      };
                                      patchOverride(t.id, {
                                        defaultCommentRules: next,
                                      });
                                    }}
                                  />
                                </div>
                                <div className="flex justify-end">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive"
                                    onClick={() => {
                                      const next = rules.filter((_, i) => i !== ri);
                                      patchOverride(t.id, {
                                        defaultCommentRules: next,
                                      });
                                    }}
                                  >
                                    Remove rule
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </CardContent>
                  </Card>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
