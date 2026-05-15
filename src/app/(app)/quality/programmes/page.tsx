import { LabModulePage } from "@/components/layout/lab-module-page";
import {
  LabModuleTableCard,
  StatusBadge,
} from "@/components/layout/lab-module-table-card";
import { QA_PROGRAMMES } from "@/data/lab-module-demo";
import { ShieldCheck } from "lucide-react";

function qaTone(status: string): "default" | "ok" | "warn" | "critical" {
  if (status === "Submitted" || status === "Satisfactory") return "ok";
  if (status === "Open") return "warn";
  if (status === "Action required") return "critical";
  return "default";
}

export default function QualityProgrammesPage() {
  return (
    <LabModulePage
      title="Quality programmes"
      description="External quality assessment (EQA) schemes, proficiency testing cycles, submission deadlines, and corrective action tracking."
      stats={[
        { label: "Active schemes", value: "3", icon: ShieldCheck },
        { label: "Due in 7 days", value: "2", icon: ShieldCheck },
        { label: "Action required", value: "1", hint: "Serology EQA", icon: ShieldCheck },
        { label: "Satisfactory (YTD)", value: "94%", icon: ShieldCheck },
      ]}
    >
      <LabModuleTableCard
        title="EQA & proficiency testing"
        columns={["Scheme", "Analyte", "Cycle", "Due", "Last result", "Status"]}
        rows={QA_PROGRAMMES.map((p) => [
          p.scheme,
          p.analyte,
          p.cycle,
          p.due,
          p.lastResult,
          <StatusBadge key="s" label={p.status} tone={qaTone(p.status)} />,
        ])}
      />
    </LabModulePage>
  );
}
