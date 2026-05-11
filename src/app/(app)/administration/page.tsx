import Link from "next/link";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function AdministrationPage() {
  return (
    <ModulePlaceholder
      title="Administration"
      description="Central place for user provisioning, catalogue governance, and integration policies."
    >
      <ul className="list-disc pl-5 space-y-1 text-foreground">
        <li>
          <Link className="text-primary underline-offset-4 hover:underline" href="/users">
            User accounts
          </Link>
        </li>
        <li>
          <Link className="text-primary underline-offset-4 hover:underline" href="/catalogue">
            Test catalogue
          </Link>
        </li>
        <li>
          <Link className="text-primary underline-offset-4 hover:underline" href="/catalogue/edit">
            Configure tests
          </Link>
        </li>
        <li>
          <Link className="text-primary underline-offset-4 hover:underline" href="/settings">
            Lab profile
          </Link>
        </li>
      </ul>
    </ModulePlaceholder>
  );
}
