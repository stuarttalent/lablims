import Link from "next/link";
import { LabModulePage } from "@/components/layout/lab-module-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileStack, FileText, Receipt } from "lucide-react";

const DOC_TYPES = [
  {
    title: "Result slips & PDFs",
    description: "Official reports with verification QR for each accession.",
    href: "/results",
    icon: FileText,
  },
  {
    title: "Invoices & receipts",
    description: "Patient billing documents and payment status.",
    href: "/billing",
    icon: Receipt,
  },
  {
    title: "Cumulative reports",
    description: "Longitudinal comparison slips per patient and test panel.",
    href: "/patients",
    icon: FileStack,
  },
];

export default function DocumentsPage() {
  return (
    <LabModulePage
      title="Document centre"
      description="Archived laboratory documents — result reports, referral letters, invoices, and cumulative summaries for audit and release."
      stats={[
        { label: "Reports (30d)", value: "186", icon: FileStack },
        { label: "Pending release", value: "4", icon: FileText },
        { label: "Invoices open", value: "2", icon: Receipt },
        { label: "Archived", value: "1.2k", hint: "Local demo store", icon: FileStack },
      ]}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {DOC_TYPES.map((d) => (
          <Link key={d.href} href={d.href}>
            <Card className="h-full border-border/70 shadow-sm transition-colors hover:bg-muted/40">
              <CardHeader className="pb-2">
                <d.icon className="size-7 text-primary mb-1" />
                <CardTitle className="text-base">{d.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{d.description}</p>
                <Button variant="link" size="sm" className="mt-2 h-auto p-0">
                  Open →
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </LabModulePage>
  );
}
