import Link from "next/link";
import { LabModulePage } from "@/components/layout/lab-module-page";
import {
  LabModuleTableCard,
  StatusBadge,
} from "@/components/layout/lab-module-table-card";
import { MAINTENANCE_TASKS } from "@/data/lab-module-demo";
import { Button } from "@/components/ui/button";
import { CalendarClock, Wrench } from "lucide-react";

function taskTone(status: string): "default" | "ok" | "warn" | "critical" {
  if (status === "Scheduled") return "ok";
  if (status === "Due today") return "warn";
  if (status === "Overdue") return "critical";
  return "default";
}

export default function MaintenancePage() {
  return (
    <LabModulePage
      title="Maintenance"
      description="Analyser service schedules, calibration verification, environmental checks, and configuration checkpoints for ISO 15189 readiness."
      stats={[
        { label: "Due this week", value: "4", icon: CalendarClock },
        { label: "Overdue", value: "1", hint: "Haematology QC lot", icon: Wrench },
        { label: "Assets tracked", value: "12", icon: Wrench },
        { label: "Open work orders", value: "2", icon: CalendarClock },
      ]}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href="/catalogue/edit">Test rules &amp; ranges</Link>
        </Button>
      }
    >
      <LabModuleTableCard
        title="Maintenance schedule"
        columns={["Asset", "Task", "Due", "Owner", "Status"]}
        rows={MAINTENANCE_TASKS.map((t) => [
          t.asset,
          t.task,
          t.due,
          t.owner,
          <StatusBadge key="s" label={t.status} tone={taskTone(t.status)} />,
        ])}
      />
    </LabModulePage>
  );
}
