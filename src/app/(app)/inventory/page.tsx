import Link from "next/link";
import { LabModulePage } from "@/components/layout/lab-module-page";
import {
  LabModuleTableCard,
  StatusBadge,
} from "@/components/layout/lab-module-table-card";
import { INVENTORY_STOCK, type DemoStatus } from "@/data/lab-module-demo";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

function stockTone(
  status: DemoStatus,
): "default" | "ok" | "warn" | "critical" {
  if (status === "ok") return "ok";
  if (status === "warn") return "warn";
  if (status === "critical") return "critical";
  return "default";
}

export default function InventoryPage() {
  return (
    <LabModulePage
      title="Inventory"
      description="Consumables, collection devices, and cold-chain stock with reorder thresholds for phlebotomy and laboratory prep areas."
      stats={[
        { label: "SKU tracked", value: "48", icon: Package },
        { label: "Below reorder", value: "2", icon: Package },
        { label: "Critical stock", value: "1", icon: Package },
        { label: "Pending PO", value: "3", icon: Package },
      ]}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href="/inventory/reagents">Reagents</Link>
        </Button>
      }
    >
      <LabModuleTableCard
        title="Stock overview"
        columns={["Item", "SKU", "On hand", "Reorder at", "Location", "Status"]}
        rows={INVENTORY_STOCK.map((i) => [
          i.item,
          <span key="sku" className="font-mono text-xs">{i.sku}</span>,
          String(i.onHand),
          String(i.reorder),
          i.location,
          <StatusBadge
            key="st"
            label={
              i.status === "ok"
                ? "OK"
                : i.status === "warn"
                  ? "Low"
                  : "Critical"
            }
            tone={stockTone(i.status)}
          />,
        ])}
      />
    </LabModulePage>
  );
}
