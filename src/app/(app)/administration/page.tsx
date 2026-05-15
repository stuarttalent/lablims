import Link from "next/link";
import { LabModulePage } from "@/components/layout/lab-module-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Settings, TestTube, Users } from "lucide-react";

const LINKS = [
  { href: "/users", label: "User accounts", desc: "Roles, credentials, access", icon: Users },
  { href: "/catalogue", label: "Test catalogue", desc: "Panels, LOINC, pricing", icon: TestTube },
  { href: "/catalogue/edit", label: "Configure tests", desc: "Ranges & comment rules", icon: TestTube },
  { href: "/settings", label: "Lab profile", desc: "Branding & integrations", icon: Settings },
];

export default function AdministrationPage() {
  return (
    <LabModulePage
      title="Administration"
      description="Governance for users, catalogue, pricing, and integration policies — central control for laboratory directors and managers."
      stats={[
        { label: "Staff accounts", value: "6", icon: Users },
        { label: "Catalogue tests", value: "40+", icon: TestTube },
        { label: "Price overrides", value: "0", icon: Settings },
        { label: "FHIR exports", value: "On", icon: Lightbulb },
      ]}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="h-full border-border/70 shadow-sm transition-colors hover:bg-muted/40">
              <CardContent className="flex items-start gap-3 p-4">
                <l.icon className="size-8 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">{l.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </LabModulePage>
  );
}
