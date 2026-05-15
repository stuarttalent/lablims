import Link from "next/link";
import { LabModulePage } from "@/components/layout/lab-module-page";
import { LabModuleTableCard } from "@/components/layout/lab-module-table-card";
import { SECURITY_POLICIES } from "@/data/lab-module-demo";
import { Button } from "@/components/ui/button";
import { Eye, Shield } from "lucide-react";

export default function SecurityPage() {
  return (
    <LabModulePage
      title="Security"
      description="Authentication policies, access control, audit expectations, and PHI handling for this laboratory information system."
      stats={[
        { label: "Active sessions", value: "1", hint: "This workstation", icon: Shield },
        { label: "Roles defined", value: "6", icon: Eye },
        { label: "MFA", value: "Demo off", icon: Shield },
        { label: "Audit log", value: "Local", hint: "Production: SIEM", icon: Eye },
      ]}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href="/users">Access control</Link>
        </Button>
      }
    >
      <LabModuleTableCard
        title="Security policies"
        description="This demo uses profile-based mock sign-in. Production would integrate SSO, MFA, and centralized audit."
        columns={["Policy", "Setting", "Scope"]}
        rows={SECURITY_POLICIES.map((p) => [p.policy, p.value, p.scope])}
      />
    </LabModulePage>
  );
}
