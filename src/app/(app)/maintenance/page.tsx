import Link from "next/link";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function MaintenancePage() {
  return (
    <ModulePlaceholder
      title="Maintenance"
      description="Laboratory maintenance schedules, analyser service logs, and configuration checkpoints."
    >
      <p>
        Align analyser QC and reference rules under{" "}
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href="/catalogue/edit"
        >
          Configure tests
        </Link>
        .
      </p>
    </ModulePlaceholder>
  );
}
