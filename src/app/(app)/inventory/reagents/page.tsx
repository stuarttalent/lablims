import Link from "next/link";
import { LabModulePage } from "@/components/layout/lab-module-page";
import {
  LabModuleTableCard,
  StatusBadge,
} from "@/components/layout/lab-module-table-card";
import { REAGENT_LOTS } from "@/data/lab-module-demo";
import { Button } from "@/components/ui/button";
import { Droplets } from "lucide-react";

export default function InventoryReagentsPage() {
  return (
    <LabModulePage
      title="Reagents"
      description="Open-vial stability, lot traceability, and expiry management for chemistry, immunology, and molecular reagents."
      backHref="/inventory"
      backLabel="Back to inventory"
      stats={[
        { label: "Open vials", value: "12", icon: Droplets },
        { label: "Expiring (14d)", value: "2", icon: Droplets },
        { label: "Expired", value: "1", icon: Droplets },
        { label: "Cold-chain alerts", value: "0", icon: Droplets },
      ]}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href="/inventory">Stock overview</Link>
        </Button>
      }
    >
      <LabModuleTableCard
        title="Reagent lots"
        columns={[
          "Reagent",
          "Lot",
          "Opened",
          "Stability (days)",
          "Expiry",
          "Status",
        ]}
        rows={REAGENT_LOTS.map((r) => [
          r.reagent,
          <span key="lot" className="font-mono text-xs">{r.lot}</span>,
          r.opened,
          String(r.stabilityDays),
          r.expiry,
          <StatusBadge
            key="st"
            label={r.status}
            tone={r.status.includes("Expired") ? "critical" : "ok"}
          />,
        ])}
      />
    </LabModulePage>
  );
}
