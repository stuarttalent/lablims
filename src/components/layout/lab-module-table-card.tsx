import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function LabModuleTableCard({
  title,
  description,
  columns,
  rows,
}: {
  title: string;
  description?: string;
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <div className="overflow-x-auto rounded-b-xl">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c} className="text-xs">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((cells, i) => (
                <TableRow key={i}>
                  {cells.map((cell, j) => (
                    <TableCell key={j} className="text-sm">
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "ok" | "warn" | "critical";
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-[10px] font-medium",
        tone === "ok" && "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50",
        tone === "warn" && "bg-amber-100 text-amber-900 dark:bg-amber-950/50",
        tone === "critical" && "bg-red-100 text-red-900 dark:bg-red-950/50",
      )}
    >
      {label}
    </Badge>
  );
}
