"use client";

import { useAuth } from "@/contexts/auth-context";
import { useData } from "@/contexts/data-context";
import { canVerifyResults } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function ResultsVerifyPage() {
  const { store } = useData();
  const { user } = useAuth();

  const rows = store.orders.filter(
    (o) =>
      o.status === "Pending Verification" ||
      o.tests.some((t) => t.resultStatus === "Pending Verification"),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Result verification queue</h1>
        <p className="text-sm text-muted-foreground">
          Orders awaiting laboratory scientist sign-off.
        </p>
      </div>
      {user && !canVerifyResults(user.role) && (
        <p className="text-sm text-muted-foreground">
          Your role can view this list but cannot verify in the workspace.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing in the queue.</p>
          ) : (
            rows.map((o) => {
              const p = store.patients.find((x) => x.id === o.patientId);
              return (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-mono text-xs">{o.id}</p>
                    <p className="font-medium">{p?.fullName ?? o.patientId}</p>
                    <Badge variant="secondary" className="mt-1">
                      {o.status}
                    </Badge>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/results/${o.id}`}>Open workspace</Link>
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
