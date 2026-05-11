import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function SecurityPage() {
  return (
    <ModulePlaceholder
      title="Security"
      description="Authentication policies, session review, and audit. This demo uses local mock sign-in only; production would integrate SSO and password rotation."
    >
      <p className="text-xs">
        Use Lab profile for editable lab-wide settings (logo, footer, pricing overrides).
      </p>
    </ModulePlaceholder>
  );
}
