import Link from "next/link";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function SendReceivePage() {
  return (
    <ModulePlaceholder
      title="Send / receive"
      description="Inbound and outbound specimen and result messages (HL7 v2, FHIR bundles, or flat-file bridges). Connects your instruments and hospital PAS / EMR."
    >
      <p>
        Use{" "}
        <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/interoperability">
          FHIR &amp; export
        </Link>{" "}
        for resource bundles and verification links already implemented in this demo.
      </p>
      <p className="text-xs">
        A production deployment would add message queues, ACK tracking, and mapping
        profiles per referral site.
      </p>
    </ModulePlaceholder>
  );
}
