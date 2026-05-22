"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MedicalAidDetails } from "@/types";

export function MedicalAidDetailsForm({
  value,
  onChange,
  patientFullName,
  disabled,
}: {
  value: MedicalAidDetails;
  onChange: (next: MedicalAidDetails) => void;
  patientFullName: string;
  disabled?: boolean;
}) {
  function patch(partial: Partial<MedicalAidDetails>) {
    const next = { ...value, ...partial };
    if (partial.principalSameAsPatient === true) {
      next.principalMember = patientFullName;
    }
    onChange(next);
  }

  const principalDisplay = value.principalSameAsPatient
    ? patientFullName
    : value.principalMember;

  return (
    <Card className="border-border/70 shadow-sm border-sky-500/20 bg-sky-50/15 dark:bg-sky-950/15">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Medical aid details</CardTitle>
        <CardDescription>
          For medical aid claims and remittance. Required when billing to a medical aid scheme.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ma-society">Medical aid society</Label>
          <Input
            id="ma-society"
            disabled={disabled}
            placeholder="e.g. CIMAS, PSMAS, First Mutual"
            value={value.society}
            onChange={(e) => patch({ society: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ma-plan">Plan</Label>
          <Input
            id="ma-plan"
            disabled={disabled}
            placeholder="e.g. Classic, Value, Private"
            value={value.plan}
            onChange={(e) => patch({ plan: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ma-number">Medical aid number</Label>
          <Input
            id="ma-number"
            disabled={disabled}
            placeholder="Member / policy number"
            value={value.memberNumber}
            onChange={(e) => patch({ memberNumber: e.target.value })}
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ma-suffix">Suffix</Label>
          <Input
            id="ma-suffix"
            disabled={disabled}
            placeholder="e.g. 00 (principal), 01 (dependant)"
            value={value.suffix}
            onChange={(e) => patch({ suffix: e.target.value })}
            className="font-mono max-w-[8rem]"
          />
        </div>
        <div className="sm:col-span-2 space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox
              disabled={disabled}
              checked={value.principalSameAsPatient}
              onCheckedChange={(c) =>
                patch({
                  principalSameAsPatient: c === true,
                  principalMember: c === true ? patientFullName : value.principalMember,
                })
              }
            />
            Principal member is the same as patient
          </label>
          <div className="space-y-2">
            <Label htmlFor="ma-principal">Principal member</Label>
            <Input
              id="ma-principal"
              disabled={disabled || value.principalSameAsPatient}
              placeholder="Name of principal member on the scheme"
              value={principalDisplay}
              onChange={(e) => patch({ principalMember: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
