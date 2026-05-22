"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PatientClinicalSection({
  symptoms,
  history,
  editing,
  onSymptomsChange,
  onHistoryChange,
}: {
  symptoms: string;
  history: string;
  editing: boolean;
  onSymptomsChange: (value: string) => void;
  onHistoryChange: (value: string) => void;
}) {
  return (
    <Card className="border-border/70 shadow-sm border-violet-500/20 bg-violet-50/15 dark:bg-violet-950/15 lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Clinical information</CardTitle>
        <CardDescription>
          Recorded on the patient chart. Used for AI interpretive comments and clinical
          correlation across all laboratory visits.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="clinical-symptoms">Symptoms &amp; clinical indication</Label>
          {editing ? (
            <Textarea
              id="clinical-symptoms"
              rows={3}
              placeholder="e.g. polyuria, weight loss, fever, screening for diabetes…"
              value={symptoms}
              onChange={(e) => onSymptomsChange(e.target.value)}
            />
          ) : (
            <p className="text-sm font-medium whitespace-pre-wrap min-h-[2.5rem] text-muted-foreground">
              {symptoms.trim() || "—"}
            </p>
          )}
        </div>
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="clinical-history">History, allergies &amp; chronic conditions</Label>
          {editing ? (
            <Textarea
              id="clinical-history"
              rows={3}
              placeholder="e.g. type 2 diabetes on metformin; penicillin allergy; HIV on ART…"
              value={history}
              onChange={(e) => onHistoryChange(e.target.value)}
            />
          ) : (
            <p className="text-sm font-medium whitespace-pre-wrap min-h-[2.5rem] text-muted-foreground">
              {history.trim() || "—"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
