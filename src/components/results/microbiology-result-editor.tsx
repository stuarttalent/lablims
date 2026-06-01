"use client";

import {
  CULTURE_OUTCOMES,
  DEFAULT_ANTIBIOTICS,
  emptyMicrobiologyResult,
  emptyOrganism,
} from "@/lib/microbiology";
import type {
  MicroAntibioticResult,
  MicrobiologyResult,
  MicroOrganismResult,
  MicroSusceptibility,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const SUSCEPT_OPTIONS: MicroSusceptibility[] = ["S", "I", "R", "NA"];

export function MicrobiologyResultEditor({
  value,
  onChange,
  disabled,
}: {
  value: MicrobiologyResult;
  onChange: (next: MicrobiologyResult) => void;
  disabled?: boolean;
}) {
  const micro = value ?? emptyMicrobiologyResult();

  function update(patch: Partial<MicrobiologyResult>) {
    onChange({ ...micro, ...patch });
  }

  function updateOrganism(index: number, patch: Partial<MicroOrganismResult>) {
    const organisms = micro.organisms.map((o, i) =>
      i === index ? { ...o, ...patch } : o,
    );
    update({ organisms });
  }

  function updateAntibiotic(
    orgIndex: number,
    abIndex: number,
    patch: Partial<MicroAntibioticResult>,
  ) {
    const organisms = micro.organisms.map((o, i) => {
      if (i !== orgIndex) return o;
      const antibiotics = o.antibiotics.map((a, j) =>
        j === abIndex ? { ...a, ...patch } : a,
      );
      return { ...o, antibiotics };
    });
    update({ organisms });
  }

  function addOrganism() {
    update({ organisms: [...micro.organisms, emptyOrganism()] });
  }

  function removeOrganism(index: number) {
    update({ organisms: micro.organisms.filter((_, i) => i !== index) });
  }

  const showOrganisms =
    micro.cultureOutcome === "Growth" || micro.cultureOutcome === "Mixed growth";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Culture result</Label>
          <Select
            value={micro.cultureOutcome ?? "No growth"}
            onValueChange={(v) =>
              v && update({ cultureOutcome: v as MicrobiologyResult["cultureOutcome"] })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CULTURE_OUTCOMES.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Colony count / density</Label>
          <Input
            disabled={disabled}
            placeholder="e.g. >10⁵ CFU/mL, scanty growth"
            value={micro.colonyCount ?? ""}
            onChange={(e) => update({ colonyCount: e.target.value })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Gram stain / microscopy</Label>
          <Input
            disabled={disabled}
            placeholder="e.g. Gram negative bacilli seen"
            value={micro.gramStain ?? ""}
            onChange={(e) => update({ gramStain: e.target.value })}
          />
        </div>
      </div>

      {showOrganisms ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-semibold">Organisms &amp; susceptibility</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={addOrganism}
            >
              <Plus className="size-4" />
              Add organism
            </Button>
          </div>

          {micro.organisms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No organisms added yet. Click &quot;Add organism&quot; to record culture
              isolates and antibiogram.
            </p>
          ) : null}

          {micro.organisms.map((org, orgIndex) => (
            <div
              key={orgIndex}
              className="rounded-xl border border-border/80 bg-background p-4 space-y-3"
            >
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[200px] space-y-1">
                  <Label className="text-xs">Organism</Label>
                  <Input
                    disabled={disabled}
                    placeholder="e.g. Escherichia coli"
                    value={org.name}
                    onChange={(e) =>
                      updateOrganism(orgIndex, { name: e.target.value })
                    }
                  />
                </div>
                <div className="w-40 space-y-1">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    disabled={disabled}
                    placeholder="Heavy / moderate"
                    value={org.quantity ?? ""}
                    onChange={(e) =>
                      updateOrganism(orgIndex, { quantity: e.target.value })
                    }
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => removeOrganism(orgIndex)}
                  aria-label="Remove organism"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/60 text-left">
                      <th className="px-2 py-2 font-semibold">Antimicrobial</th>
                      <th className="px-2 py-2 font-semibold w-16">S/I/R</th>
                      <th className="px-2 py-2 font-semibold w-24">MIC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {org.antibiotics.map((ab, abIndex) => (
                      <tr key={`${ab.drug}-${abIndex}`} className="border-t">
                        <td className="px-2 py-1.5">
                          <Input
                            disabled={disabled}
                            className="h-8 text-xs"
                            value={ab.drug}
                            onChange={(e) =>
                              updateAntibiotic(orgIndex, abIndex, {
                                drug: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Select
                            value={ab.result}
                            onValueChange={(v) =>
                              v &&
                              updateAntibiotic(orgIndex, abIndex, {
                                result: v as MicroSusceptibility,
                              })
                            }
                            disabled={disabled}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SUSCEPT_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            disabled={disabled}
                            className="h-8 text-xs"
                            placeholder="—"
                            value={ab.mic ?? ""}
                            onChange={(e) =>
                              updateAntibiotic(orgIndex, abIndex, {
                                mic: e.target.value,
                              })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled}
                onClick={() => {
                  const antibiotics = [
                    ...org.antibiotics,
                    { drug: "", result: "NA" as MicroSusceptibility },
                  ];
                  updateOrganism(orgIndex, { antibiotics });
                }}
              >
                Add drug
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Additional notes</Label>
        <Textarea
          disabled={disabled}
          rows={2}
          placeholder="Clinical correlation, reporting comments…"
          value={micro.additionalNotes ?? ""}
          onChange={(e) => update({ additionalNotes: e.target.value })}
        />
      </div>
    </div>
  );
}
