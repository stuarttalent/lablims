"use client";

import { useData } from "@/contexts/data-context";
import { useAuth } from "@/contexts/auth-context";
import { canCreateOrder } from "@/lib/permissions";
import {
  buildHeuristicWorklistPredictions,
  type WorklistEtaPrediction,
} from "@/lib/worklist-eta";
import { isOrderTatComplete } from "@/lib/tat-predict";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function OrdersPage() {
  const { store } = useData();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [aiEtaBatch, setAiEtaBatch] = useState<{
    sig: string;
    list: WorklistEtaPrediction[];
    source: "openai" | "heuristic";
  } | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = [...store.orders].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    if (user?.role === "tech") {
      list = list.filter((o) => o.assignedTechId === user.id);
    }
    if (!needle) return list;
    return list.filter((o) => {
      const patient = store.patients.find((p) => p.id === o.patientId);
      return (
        o.id.toLowerCase().includes(needle) ||
        (patient?.fullName.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [store.orders, store.patients, q, user]);

  const worklistRowSig = useMemo(() => rows.map((o) => o.id).join("|"), [rows]);

  const baselinePredictions = useMemo(
    () => buildHeuristicWorklistPredictions(rows),
    [rows],
  );

  const predictions = useMemo(() => {
    const map = new Map(baselinePredictions.map((p) => [p.orderId, p]));
    if (aiEtaBatch?.sig === worklistRowSig) {
      for (const p of aiEtaBatch.list) {
        map.set(p.orderId, p);
      }
    }
    return [...map.values()];
  }, [baselinePredictions, aiEtaBatch, worklistRowSig]);

  const etaSource = useMemo(() => {
    if (aiEtaBatch?.sig !== worklistRowSig) return null;
    return aiEtaBatch.source;
  }, [aiEtaBatch, worklistRowSig]);

  useEffect(() => {
    if (rows.length === 0) return;
    const eligible = rows.filter((o) => !isOrderTatComplete(o.status));
    if (eligible.length === 0) return;

    const sig = worklistRowSig;
    const ac = new AbortController();

    void (async () => {
      try {
        const res = await fetch("/api/ai/worklist-eta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders: eligible }),
          signal: ac.signal,
        });
        const data = (await res.json()) as {
          predictions?: WorklistEtaPrediction[];
          source?: string;
        };
        if (ac.signal.aborted || !Array.isArray(data.predictions)) return;
        setAiEtaBatch({
          sig,
          list: data.predictions,
          source: data.source === "openai" ? "openai" : "heuristic",
        });
      } catch {
        /* keep catalogue-only ETA */
      }
    })();

    return () => ac.abort();
  }, [worklistRowSig, rows]);

  const predById = useMemo(
    () => new Map(predictions.map((p) => [p.orderId, p])),
    [predictions],
  );

  function formatReady(iso: string): string {
    try {
      return format(parseISO(iso), "MMM d, yyyy · HH:mm");
    } catch {
      return iso;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Worklist</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Each row is one lab request. <span className="inline-flex items-center gap-1 font-medium text-foreground/90"><Sparkles className="size-3.5 text-violet-500" /> Est. ready</span> uses
            catalogue turnaround times (longest test in the panel, parallel workflow) with
            priority weighting; AI adds a one-line explanation when configured.
          </p>
        </div>
        {user && canCreateOrder(user.role) ? (
          <Button asChild className="gap-2">
            <Link href="/orders/new">
              <Plus className="size-4" />
              New request
            </Link>
          </Button>
        ) : (
          <Badge variant="secondary">Assigned work only</Badge>
        )}
      </div>
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Input
              className="max-w-md"
              placeholder="Search order ID or patient…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {etaSource === "openai" ? (
              <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                <Sparkles className="size-3" />
                AI notes on
              </Badge>
            ) : baselinePredictions.length > 0 &&
              rows.some((o) => !isOrderTatComplete(o.status)) ? (
              <span className="text-[11px] text-muted-foreground">
                ETA from catalogue TAT
                {etaSource === "heuristic" ? (
                  <>
                    {" "}
                    (set{" "}
                    <code className="font-mono text-[10px]">OPENAI_API_KEY</code> for
                    richer notes)
                  </>
                ) : null}
              </span>
            ) : null}
          </div>
          <div className="rounded-xl border border-border/70 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[9rem]">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="size-3.5 text-violet-500 opacity-80" />
                      Est. ready
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      No orders to show.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((o) => {
                    const patient = store.patients.find((p) => p.id === o.patientId);
                    const pred = predById.get(o.id);
                    const complete = isOrderTatComplete(o.status);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.id}</TableCell>
                        <TableCell className="font-medium">
                          {patient?.fullName ?? o.patientId}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">{o.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{o.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell align-top text-sm">
                          {complete ? (
                            <span className="text-muted-foreground">—</span>
                          ) : pred ? (
                            <Tooltip>
                              <TooltipTrigger
                                type="button"
                                className="max-w-[220px] cursor-help text-left underline-offset-2 hover:underline"
                              >
                                <span className="block truncate font-medium text-foreground">
                                  {formatReady(pred.readyIso)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-xs text-left text-xs leading-snug"
                              >
                                {pred.note}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/orders/${o.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-[11px] text-muted-foreground lg:hidden">
            <Sparkles className="inline size-3 text-violet-500" /> Est. ready appears on
            wider screens; open an order for full detail.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
