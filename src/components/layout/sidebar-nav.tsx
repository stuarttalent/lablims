"use client";

import { cn } from "@/lib/utils";
import { canAccessRoute } from "@/lib/permissions";
import type { UserRole } from "@/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, startTransition } from "react";
import {
  Activity,
  ChevronDown,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type NavItem = {
  href: string;
  label: string;
  shortDescription?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PRIMARY_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    shortDescription: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/patients",
    label: "Patients",
    shortDescription: "Records",
    icon: Users,
  },
  {
    href: "/orders",
    label: "Orders",
    shortDescription: "Test requests",
    icon: ClipboardList,
  },
  {
    href: "/catalogue",
    label: "Available tests",
    shortDescription: "What we offer",
    icon: FlaskConical,
  },
  {
    href: "/results",
    label: "Results",
    shortDescription: "Enter & release",
    icon: Activity,
  },
];

const MORE_ITEMS: NavItem[] = [
  {
    href: "/results/verify",
    label: "Verify results",
    shortDescription: "Scientist sign-off",
    icon: ClipboardCheck,
  },
  {
    href: "/reports",
    label: "Reports",
    shortDescription: "Summaries",
    icon: FileBarChart,
  },
  {
    href: "/billing",
    label: "Billing",
    shortDescription: "Invoices",
    icon: Receipt,
  },
  {
    href: "/interoperability",
    label: "FHIR export",
    shortDescription: "For IT / EHR",
    icon: Network,
  },
  {
    href: "/settings",
    label: "Settings",
    shortDescription: "Lab profile",
    icon: Settings,
  },
  {
    href: "/users",
    label: "Users",
    shortDescription: "Who can sign in",
    icon: UserCog,
  },
];

function pathIsActive(pathname: string, href: string): boolean {
  if (href === "/results") {
    if (pathname.startsWith("/results/verify")) return false;
    return pathname === "/results" || pathname.startsWith("/results/");
  }
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

function isMoreSectionPath(pathname: string): boolean {
  return MORE_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}

export function SidebarNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(() => isMoreSectionPath(pathname));

  useEffect(() => {
    startTransition(() => {
      if (isMoreSectionPath(pathname)) setMoreOpen(true);
      else setMoreOpen(false);
    });
  }, [pathname]);

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

      <p className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/45">
        Everyday
      </p>
      {PRIMARY_ITEMS.map((item) => renderLink(role, pathname, item))}

      <Collapsible open={moreOpen} onOpenChange={setMoreOpen} className="mt-2">
        <CollapsibleTrigger
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/55 outline-none hover:text-sidebar-foreground/80 focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          )}
        >
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 transition-transform",
              moreOpen && "rotate-180",
            )}
          />
          More tools
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-0.5 pt-0.5 data-[ending-style]:animate-none">
          {MORE_ITEMS.map((item) => renderLink(role, pathname, item))}
        </CollapsibleContent>
      </Collapsible>
    </nav>
  );
}

function renderLink(role: UserRole, pathname: string, item: NavItem) {
  const allowed = canAccessRoute(role, item.href);
  const active = pathIsActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      key={item.href}
      href={allowed ? item.href : "#"}
      title={item.shortDescription}
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
}
