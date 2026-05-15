import Link from "next/link";
import { LabModulePage } from "@/components/layout/lab-module-page";
import { SETUP_CHECKLIST } from "@/data/lab-module-demo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, LayoutGrid } from "lucide-react";

export default function SetupHomePage() {
  const done = SETUP_CHECKLIST.filter((s) => s.done).length;
  const total = SETUP_CHECKLIST.length;

  return (
    <LabModulePage
      title="Setup"
      description="First-run and ongoing configuration — lab profile, catalogue, reference data, interfaces, and user provisioning."
      stats={[
        { label: "Checklist", value: `${done}/${total}`, icon: LayoutGrid },
        { label: "Departments", value: "5", icon: LayoutGrid },
        { label: "Templates", value: "4", icon: LayoutGrid },
        { label: "Interfaces", value: "2", hint: "Demo bridges", icon: LayoutGrid },
      ]}
    >
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Implementation checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {SETUP_CHECKLIST.map((step) => (
            <Link
              key={step.step}
              href={step.href}
              className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
            >
              {step.done ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="size-5 shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1 font-medium">{step.step}</span>
              <Badge variant={step.done ? "secondary" : "outline"}>
                {step.done ? "Done" : "Pending"}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </LabModulePage>
  );
}
