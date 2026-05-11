import Link from "next/link";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, LayoutDashboard, Microscope, Users } from "lucide-react";

export default function TicketDeskPage() {
  return (
    <ModulePlaceholder
      title="Ticket desk"
      description="Front-office queue for requisitions, patient lookups, and routing into the laboratory worklist — similar to a hospital ticket desk in Chiron."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/dashboard">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 p-4">
              <LayoutDashboard className="size-8 text-primary" />
              <div>
                <p className="font-medium text-foreground">Dashboard</p>
                <p className="text-xs text-muted-foreground">Volumes, TAT, alerts</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/patients">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="size-8 text-primary" />
              <div>
                <p className="font-medium text-foreground">Patients</p>
                <p className="text-xs text-muted-foreground">Demographics & history</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/orders">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 p-4">
              <ClipboardList className="size-8 text-primary" />
              <div>
                <p className="font-medium text-foreground">Worklist</p>
                <p className="text-xs text-muted-foreground">Orders & status</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/results">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Microscope className="size-8 text-primary" />
              <div>
                <p className="font-medium text-foreground">Results</p>
                <p className="text-xs text-muted-foreground">Entry & validation</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </ModulePlaceholder>
  );
}
