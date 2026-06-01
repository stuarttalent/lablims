"use client";

import {
  getCatalogueOverride,
  getCatalogueTests,
} from "@/lib/catalogue-access";
import {
  applyTestKindToCatalogueTest,
  QUALITATIVE_RESULTS,
  resolveTestKind,
} from "@/lib/test-kind";
import type {
  CatalogueTest,
  CatalogueTestOverride,
  LabSettings,
  TestDepartment,
  TestKind,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

const TEST_KINDS: { id: TestKind; label: string }[] = [
  { id: "quantitative", label: "Quantitative (numeric result)" },
  { id: "qualitative", label: "Qualitative (Positive / Negative / …)" },
  { id: "microbiology", label: "Microbiology (culture & sensitivity)" },
  { id: "profile", label: "Profile (panel of tests)" },
];

const DEPTS: TestDepartment[] = [
  "Haematology",
  "Chemistry",
  "Microbiology",
  "Serology/Immunology",
  "Molecular",
];

export function ConfigureTestCard({
  test,
  isCustom,
  settings,
  onPatchCustom,
  onPatchOverride,
  onDeleteCustom,
  onPatchPrice,
}: {
  test: CatalogueTest;
  isCustom: boolean;
  settings: LabSettings;
  onPatchCustom: (id: string, patch: Partial<CatalogueTest>) => void;
  onPatchOverride: (testId: string, patch: Partial<CatalogueTestOverride>) => void;
  onDeleteCustom?: (id: string) => void;
  onPatchPrice: (testId: string, price: number | null) => void;
}) {
  const override = getCatalogueOverride(test.id, settings);
  const kind = resolveTestKind(test, override);
  const effectivePrice =
    settings.priceOverrides[test.id] !== undefined
      ? settings.priceOverrides[test.id]
      : test.price;
  const allTests = getCatalogueTests(settings);
  const profileCandidates = allTests.filter(
    (t) => t.id !== test.id && !t.panelAnalyte,
  );

  function setKind(nextKind: TestKind) {
    if (isCustom) {
      onPatchCustom(test.id, applyTestKindToCatalogueTest(test, nextKind));
      return;
    }
    onPatchOverride(test.id, { testKind: nextKind });
  }

  function patch(patch: Partial<CatalogueTest>) {
    if (isCustom) onPatchCustom(test.id, patch);
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {isCustom ? (
            <Input
              className="max-w-md font-semibold text-base h-9"
              value={test.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          ) : (
            <CardTitle className="text-base">{test.name}</CardTitle>
          )}
          <Badge variant="outline" className="font-mono text-[10px]">
            {test.id}
          </Badge>
          {isCustom ? (
            <Badge variant="secondary" className="text-[10px]">
              Custom test
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm">Result type</Label>
            <Select value={kind} onValueChange={(v) => v && setKind(v as TestKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEST_KINDS.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Price ({settings.priceOverrides[test.id] !== undefined ? "override" : "catalogue"})</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={effectivePrice}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  onPatchPrice(test.id, null);
                  return;
                }
                const n = parseFloat(v);
                onPatchPrice(test.id, Number.isFinite(n) ? n : 0);
              }}
            />
          </div>
        </div>

        {isCustom ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm">Department</Label>
              <Select
                value={test.department}
                onValueChange={(v) => v && patch({ department: v as TestDepartment })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Sample type</Label>
              <Input
                value={test.sampleType}
                onChange={(e) => patch({ sampleType: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Turnaround</Label>
              <Input
                value={test.turnaroundTime}
                onChange={(e) => patch({ turnaroundTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">LOINC (optional)</Label>
              <Input
                value={test.loincCode ?? ""}
                onChange={(e) => patch({ loincCode: e.target.value || undefined })}
              />
            </div>
          </div>
        ) : null}

        {kind === "quantitative" || kind === "qualitative" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm">Reference / interpretive text</Label>
              <Textarea
                rows={2}
                value={test.referenceRange ?? ""}
                onChange={(e) =>
                  isCustom
                    ? patch({ referenceRange: e.target.value || undefined })
                    : undefined
                }
                readOnly={!isCustom}
                className={!isCustom ? "bg-muted/40" : undefined}
              />
              {!isCustom ? (
                <p className="text-[10px] text-muted-foreground">
                  Built-in reference text — use age/gender bands below to override per patient.
                </p>
              ) : null}
            </div>
            {kind === "quantitative" ? (
              <div className="space-y-2">
                <Label className="text-sm">Units</Label>
                <Input
                  value={test.units ?? ""}
                  onChange={(e) =>
                    isCustom ? patch({ units: e.target.value || undefined }) : undefined
                  }
                  readOnly={!isCustom}
                  className={!isCustom ? "bg-muted/40" : undefined}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm">Qualitative values</Label>
                <p className="text-xs text-muted-foreground rounded-lg border border-dashed p-2">
                  {QUALITATIVE_RESULTS.join(" · ")}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {kind === "profile" ? (
          <div className="space-y-2">
            <Label className="text-sm">Constituent tests</Label>
            <p className="text-[11px] text-muted-foreground">
              When this profile is ordered, each selected test becomes a separate result line.
            </p>
            <div className="max-h-48 overflow-y-auto rounded-lg border p-2 space-y-1">
              {profileCandidates.map((c) => {
                const checked = test.constituentTestIds?.includes(c.id) ?? false;
                return (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 text-xs cursor-pointer py-1"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(on) => {
                        const ids = new Set(test.constituentTestIds ?? []);
                        if (on === true) ids.add(c.id);
                        else ids.delete(c.id);
                        const next = [...ids];
                        if (isCustom) {
                          onPatchCustom(test.id, { constituentTestIds: next });
                        } else {
                          onPatchCustom(test.id, { constituentTestIds: next });
                        }
                      }}
                      disabled={!isCustom}
                    />
                    <span>{c.name}</span>
                    <span className="text-muted-foreground font-mono">{c.id}</span>
                  </label>
                );
              })}
            </div>
            {!isCustom ? (
              <p className="text-[10px] text-muted-foreground italic">
                Constituents for built-in profiles are defined in the application catalogue.
              </p>
            ) : null}
          </div>
        ) : null}

        {isCustom && onDeleteCustom ? (
          <div className="flex justify-end border-t pt-3">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => onDeleteCustom(test.id)}
            >
              <Trash2 className="size-4 mr-1" />
              Remove custom test
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
