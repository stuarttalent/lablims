import Link from "next/link";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function InventoryPage() {
  return (
    <ModulePlaceholder
      title="Inventory"
      description="Stock levels for consumables, cards, and collection devices — placeholder for ERP integration."
    >
      <p>
        See also{" "}
        <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/inventory/reagents">
          Reagents
        </Link>
        .
      </p>
    </ModulePlaceholder>
  );
}
