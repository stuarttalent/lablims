"use client";

import { ROLE_LABELS, canAccessRoute } from "@/lib/permissions";
import type { UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-violet-600/15 text-violet-800 dark:text-violet-200 border-violet-500/30",
  scientist: "bg-sky-600/15 text-sky-900 dark:text-sky-100 border-sky-500/35",
  tech: "bg-emerald-600/15 text-emerald-900 dark:text-emerald-100 border-emerald-500/35",
  biller: "bg-amber-600/15 text-amber-950 dark:text-amber-100 border-amber-500/40",
  doctor: "bg-rose-600/12 text-rose-900 dark:text-rose-100 border-rose-500/30",
};

export function RoleBadge({
  role,
  className,
}: {
  role: UserRole;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium border", ROLE_COLORS[role], className)}
    >
      <Shield className="size-3.5" />
      {ROLE_LABELS[role]}
    </Badge>
  );
}

export function RouteAccessHint({
  role,
  path,
}: {
  role: UserRole;
  path: string;
}) {
  const ok = canAccessRoute(role, path);
  if (ok) return null;
  return (
    <span className="text-xs text-muted-foreground">
      (not available for {ROLE_LABELS[role]})
    </span>
  );
}
