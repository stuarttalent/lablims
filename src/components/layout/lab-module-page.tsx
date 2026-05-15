import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export type LabModuleStat = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
};

export function LabModulePage({
  title,
  description,
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
  actions,
  stats,
  children,
}: {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  stats?: LabModuleStat[];
  children?: ReactNode;
}) {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={backHref}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-3"
          >
            <ArrowLeft className="size-3.5" />
            {backLabel}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>

      {stats && stats.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="border-border/70 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardDescription className="text-xs font-medium uppercase tracking-wide">
                  {s.label}
                </CardDescription>
                {s.icon ? (
                  <s.icon className="size-4 text-muted-foreground" aria-hidden />
                ) : null}
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
                {s.hint ? (
                  <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {children}
    </div>
  );
}
