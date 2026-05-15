import Link from "next/link";
import { LabModulePage } from "@/components/layout/lab-module-page";
import {
  LabModuleTableCard,
  StatusBadge,
} from "@/components/layout/lab-module-table-card";
import { SEND_RECEIVE_MESSAGES } from "@/data/lab-module-demo";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Radio } from "lucide-react";

function msgTone(
  status: string,
): "default" | "ok" | "warn" | "critical" {
  if (status === "Acknowledged" || status === "Processed") return "ok";
  if (status === "Queued") return "warn";
  if (status === "Failed") return "critical";
  return "default";
}

export default function SendReceivePage() {
  return (
    <LabModulePage
      title="Send / receive"
      description="Inbound and outbound specimen and result messages — HL7 v2, FHIR bundles, and flat-file bridges between your LIS, hospital PAS, and referral sites."
      stats={[
        { label: "Queue depth", value: "1", hint: "Awaiting processing", icon: Radio },
        { label: "Today inbound", value: "12", hint: "ORM / specimens", icon: ArrowLeftRight },
        { label: "Today outbound", value: "9", hint: "ORU / results", icon: ArrowLeftRight },
        { label: "Failed (24h)", value: "1", hint: "Retry or manual fix", icon: Radio },
      ]}
      actions={
        <Button asChild size="sm">
          <Link href="/interoperability">FHIR &amp; export</Link>
        </Button>
      }
    >
      <LabModuleTableCard
        title="Message log"
        description="Recent interface traffic for this laboratory instance."
        columns={["ID", "Direction", "Type", "Source", "Accession", "Received", "Status"]}
        rows={SEND_RECEIVE_MESSAGES.map((m) => [
          <span key="id" className="font-mono text-xs">{m.id}</span>,
          m.direction,
          m.type,
          m.source,
          <span key="acc" className="font-mono text-xs">{m.accession}</span>,
          m.received,
          <StatusBadge key="st" label={m.status} tone={msgTone(m.status)} />,
        ])}
      />
    </LabModulePage>
  );
}
