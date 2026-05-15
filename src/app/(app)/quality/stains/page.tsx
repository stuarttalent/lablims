import { LabModulePage } from "@/components/layout/lab-module-page";
import {
  LabModuleTableCard,
  StatusBadge,
} from "@/components/layout/lab-module-table-card";
import { STAIN_QC } from "@/data/lab-module-demo";
import { Droplets } from "lucide-react";

export default function QualityStainsPage() {
  return (
    <LabModulePage
      title="Quality stains"
      description="Histology and microbiology stain batches, shelf-life tracking, and periodic QC checks on staining intensity and background."
      stats={[
        { label: "Active batches", value: "6", icon: Droplets },
        { label: "QC due", value: "1", icon: Droplets },
        { label: "Expired lots", value: "0", icon: Droplets },
        { label: "Repeat QC", value: "1", hint: "Gram stain", icon: Droplets },
      ]}
    >
      <LabModuleTableCard
        title="Stain & reagent QC"
        columns={["Stain", "Batch", "Expiry", "Last check", "Status"]}
        rows={STAIN_QC.map((s) => [
          s.stain,
          s.batch,
          s.expiry,
          s.lastCheck,
          <StatusBadge
            key="st"
            label={s.status}
            tone={s.status === "Pass" ? "ok" : "warn"}
          />,
        ])}
      />
    </LabModulePage>
  );
}
