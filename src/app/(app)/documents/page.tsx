import Link from "next/link";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function DocumentsPage() {
  return (
    <ModulePlaceholder
      title="Document centre"
      description="Archived result PDFs, referral letters, and instrument batch records — placeholder for enterprise document management."
    >
      <p>
        For now, open{" "}
        <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/results">
          Results
        </Link>{" "}
        to print or export a slip, or use{" "}
        <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/reports">
          Reports
        </Link>{" "}
        for operational summaries.
      </p>
    </ModulePlaceholder>
  );
}
