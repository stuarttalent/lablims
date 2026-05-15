import { LabModulePage } from "@/components/layout/lab-module-page";
import {
  LabModuleTableCard,
  StatusBadge,
} from "@/components/layout/lab-module-table-card";
import { INSTRUMENT_QC } from "@/data/lab-module-demo";
import { BadgeCheck } from "lucide-react";

export default function QualityInstrumentsPage() {
  return (
    <LabModulePage
      title="Quality instruments"
      description="Analyser-level internal QC: control lots, Levey–Jennings review, calibration events, and maintenance windows per instrument."
      stats={[
        { label: "Instruments", value: "8", icon: BadgeCheck },
        { label: "QC runs today", value: "14", icon: BadgeCheck },
        { label: "Out of range", value: "1", hint: "Maccura 560", icon: BadgeCheck },
        { label: "Calibrations due", value: "2", icon: BadgeCheck },
      ]}
    >
      <LabModuleTableCard
        title="Internal QC log"
        columns={["Instrument", "Control", "Lot", "Last run", "Status"]}
        rows={INSTRUMENT_QC.map((r) => [
          r.instrument,
          r.control,
          r.lot,
          r.lastRun,
          <StatusBadge
            key="s"
            label={r.status}
            tone={r.status === "In range" ? "ok" : "warn"}
          />,
        ])}
      />
    </LabModulePage>
  );
}
