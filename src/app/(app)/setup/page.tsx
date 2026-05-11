import Link from "next/link";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function SetupHomePage() {
  return (
    <ModulePlaceholder
      title="Setup"
      description="First-run and ongoing configuration — departments, templates, integrations, and defaults."
    >
      <ul className="list-disc pl-5 space-y-1 text-foreground">
        <li>
          <Link className="text-primary underline-offset-4 hover:underline" href="/settings">
            Lab profile &amp; branding
          </Link>
        </li>
        <li>
          <Link className="text-primary underline-offset-4 hover:underline" href="/catalogue">
            Catalogue
          </Link>
        </li>
        <li>
          <Link className="text-primary underline-offset-4 hover:underline" href="/interoperability">
            FHIR / interoperability
          </Link>
        </li>
      </ul>
    </ModulePlaceholder>
  );
}
