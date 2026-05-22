"use client";

import type { ClinicalGuidance } from "@/lib/ai/clinical-guidance-types";
import { EDLIZ_PDF_URL } from "@/lib/ai/edliz-knowledge";
import { EDLIZ_SOURCE_LABEL } from "@/lib/ai/clinical-guidance-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FlaskConical, Stethoscope } from "lucide-react";

const CERTAINTY_TONE: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  consider: "outline",
  likely: "secondary",
  consistent_with: "default",
};

const PRIORITY_LABEL: Record<string, string> = {
  routine: "Routine",
  urgent: "Urgent",
  if_clinically_indicated: "If clinically indicated",
};

export function ClinicalGuidancePanel({
  guidance,
}: {
  guidance: ClinicalGuidance;
}) {
  const hasStructured =
    guidance.impressions.length > 0 ||
    guidance.suggestedFurtherTests.length > 0 ||
    guidance.guidelineReferences.length > 0;

  if (!hasStructured) return null;

  return (
    <Card className="border-teal-500/25 bg-teal-50/20 dark:bg-teal-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BookOpen className="size-4 text-teal-700 dark:text-teal-400" />
          EDLIZ-informed guidance
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {EDLIZ_SOURCE_LABEL}.{" "}
          <a
            href={EDLIZ_PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            View EDLIZ PDF
          </a>
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {guidance.impressions.length > 0 ? (
          <section className="space-y-2">
            <h4 className="font-medium flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <Stethoscope className="size-3.5" />
              Clinical considerations
            </h4>
            <ul className="space-y-2">
              {guidance.impressions.map((item, i) => (
                <li
                  key={`${item.label}-${i}`}
                  className="rounded-lg border border-border/60 bg-background/60 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium">{item.label}</span>
                    <Badge variant={CERTAINTY_TONE[item.certainty] ?? "outline"}>
                      {item.certainty.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {item.rationale}
                  </p>
                  {item.edlizSection ? (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      EDLIZ: {item.edlizSection}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {guidance.suggestedFurtherTests.length > 0 ? (
          <section className="space-y-2">
            <h4 className="font-medium flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <FlaskConical className="size-3.5" />
              Suggested further tests
            </h4>
            <ul className="space-y-2">
              {guidance.suggestedFurtherTests.map((t, i) => (
                <li
                  key={`${t.testName}-${i}`}
                  className="rounded-lg border border-border/60 bg-background/60 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium">{t.testName}</span>
                    <Badge variant="outline">
                      {PRIORITY_LABEL[t.priority] ?? t.priority}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t.reason}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {guidance.guidelineReferences.length > 0 ? (
          <section className="space-y-1">
            <h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
              Guideline references
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {guidance.guidelineReferences.map((r, i) => (
                <li key={`${r.section}-${i}`}>
                  <span className="font-medium text-foreground">{r.section}:</span>{" "}
                  {r.excerpt}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="text-[10px] text-muted-foreground italic border-t pt-2">
          {guidance.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}
