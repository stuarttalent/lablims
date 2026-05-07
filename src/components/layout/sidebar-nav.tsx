"use client";

import { cn } from "@/lib/utils";
import { canAccessRoute } from "@/lib/permissions";
import type { UserRole } from "@/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  FlaskConical,
  LayoutDashboard,
  Network,
  Receipt,
  Settings,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/catalogue", label: "Test catalogue", icon: FlaskConical },
  { href: "/interoperability", label: "FHIR / Interop", icon: Network },
  { href: "/orders", label: "Test requests", icon: ClipboardList },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/results", label: "Results", icon: Activity },
  { href: "/results/verify", label: "Verification", icon: ClipboardCheck },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/users", label: "User management", icon: UserCog },
];

export function SidebarNav({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-2 py-3">
      <div className="mb-3 flex items-center gap-2 px-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
          <Stethoscope className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            LabLIMS
          </p>
          <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
            Laboratory · LIS
          </p>
        </div>
      </div>
      {ITEMS.map((item) => {
        const allowed = canAccessRoute(role, item.href);
        const active =
          pathname === item.href ||
          (item.href !== "/results" &&
            pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={allowed ? item.href : "#"}
            aria-disabled={!allowed}
            onClick={(e) => {
              if (!allowed) e.preventDefault();
            }}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors border-l-2 border-transparent",
              active
                ? "bg-sidebar-accent/90 text-sidebar-accent-foreground border-l-sidebar-primary shadow-sm font-medium"
                : "text-sidebar-foreground/85 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              !allowed && "pointer-events-none opacity-40",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
