"use client";

import { cn } from "@/lib/utils";
import { canAccessRoute } from "@/lib/permissions";
import type { UserRole } from "@/types";
import {
  CHIRON_NAV_TREE,
  type ChironNavEntry,
  entryIsSingle,
  type NavChild,
} from "@/components/layout/chiron-nav-data";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  startTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ChevronRight,
  LogOut,
  Menu,
  Settings,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function pathMatches(pathname: string, href: string): boolean {
  if (href === "/catalogue") {
    return pathname === "/catalogue" && !pathname.startsWith("/catalogue/edit");
  }
  if (href === "/results") {
    return pathname === "/results" || pathname.startsWith("/results/");
  }
  if (pathname === href) return true;
  if (href === "/") return pathname === "/";
  return pathname.startsWith(`${href}/`);
}

function groupActive(pathname: string, children: NavChild[]): boolean {
  return children.some((c) => pathMatches(pathname, c.href));
}

function filterChildren(role: UserRole, children: NavChild[]): NavChild[] {
  return children.filter((c) => canAccessRoute(role, c.href));
}

function useDefaultOpenKeys(
  pathname: string,
  role: UserRole,
): Record<string, boolean> {
  return useMemo(() => {
    const next: Record<string, boolean> = {};
    for (const entry of CHIRON_NAV_TREE) {
      if (entryIsSingle(entry)) continue;
      const kids = filterChildren(role, entry.children);
      if (kids.length > 0 && groupActive(pathname, kids)) {
        next[entry.id] = true;
      }
    }
    return next;
  }, [pathname, role]);
}

export function SidebarNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const defaultOpen = useDefaultOpenKeys(pathname, role);
  const [open, setOpen] = useState<Record<string, boolean>>(defaultOpen);

  useEffect(() => {
    startTransition(() => {
      setOpen(defaultOpen);
    });
  }, [defaultOpen]);

  if (!user) return null;

  return (
    <nav className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-white/10 px-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {user.name}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] leading-snug">
              <Link
                href="/settings"
                className="text-sidebar-foreground/75 underline-offset-2 hover:text-sidebar-foreground hover:underline"
              >
                Change profile
              </Link>
              <Link
                href="/security"
                className="text-sidebar-foreground/75 underline-offset-2 hover:text-sidebar-foreground hover:underline"
              >
                Change password
              </Link>
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground outline-none ring-offset-background transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[var(--chiron-nav-active)]/50"
            >
              <Menu className="size-4" />
              <span className="sr-only">Account menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="size-4 mr-2" />
                Lab settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={async () => {
                  await logout();
                  window.location.assign("/login");
                }}
              >
                <LogOut className="size-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
          Menu
        </p>
        <div className="flex flex-col gap-0.5">
          {CHIRON_NAV_TREE.map((entry) => (
            <NavTreeEntry
              key={entryIsSingle(entry) ? entry.href : entry.id}
              entry={entry}
              role={role}
              pathname={pathname}
              open={open}
              setOpen={setOpen}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavTreeEntry({
  entry,
  role,
  pathname,
  open,
  setOpen,
}: {
  entry: ChironNavEntry;
  role: UserRole;
  pathname: string;
  open: Record<string, boolean>;
  setOpen: Dispatch<SetStateAction<Record<string, boolean>>>;
}) {
  if (entryIsSingle(entry)) {
    const allowed = canAccessRoute(role, entry.href);
    if (!allowed) return null;
    const active = pathMatches(pathname, entry.href);
    const Icon = entry.icon;
    return (
      <Link
        href={entry.href}
        className={cn(
          navRowClass(active, false),
          "border-l-2",
          active
            ? "border-[var(--chiron-nav-active)]"
            : "border-transparent",
        )}
      >
        <Icon className="size-4 shrink-0 opacity-90" />
        <span className="min-w-0 flex-1 truncate">{entry.label}</span>
        <span className="w-4 shrink-0" aria-hidden />
      </Link>
    );
  }

  const children = filterChildren(role, entry.children);
  if (children.length === 0) return null;

  const Icon = entry.icon;
  const isOpen = open[entry.id] ?? groupActive(pathname, children);
  const groupHasActive = groupActive(pathname, children);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(next) =>
        setOpen((m) => ({ ...m, [entry.id]: next }))
      }
      className="group/coll"
    >
      <CollapsibleTrigger
        type="button"
        className={cn(
          navRowClass(groupHasActive, true),
          "w-full cursor-pointer text-left",
        )}
      >
        <Icon className="size-4 shrink-0 opacity-90" />
        <span className="min-w-0 flex-1 truncate">{entry.label}</span>
        <ChevronRight
          className={cn(
            "size-4 shrink-0 text-sidebar-foreground/50 transition-transform duration-200",
            isOpen && "rotate-90",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[starting-style]:animate-none">
        <ul className="ml-4 mt-0.5 border-l border-white/10 pl-2">
          {children.map((c) => {
            const active = pathMatches(pathname, c.href);
            return (
              <li key={c.href}>
                <Link
                  href={c.href}
                  className={cn(
                    "-ml-px block rounded-md border-l-2 border-transparent py-1.5 pl-3 pr-2 text-[13px] transition-colors",
                    active
                      ? "border-[var(--chiron-nav-active)] bg-white/[0.07] font-medium text-sidebar-foreground"
                      : "text-sidebar-foreground/75 hover:bg-white/[0.05] hover:text-sidebar-foreground",
                  )}
                >
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function navRowClass(active: boolean, isTrigger: boolean) {
  return cn(
    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
    active
      ? "bg-white/[0.08] font-medium text-sidebar-foreground shadow-sm"
      : "text-sidebar-foreground/85 hover:bg-white/[0.06] hover:text-sidebar-foreground",
    isTrigger &&
      "outline-none focus-visible:ring-2 focus-visible:ring-[var(--chiron-nav-active)]/50",
  );
}
