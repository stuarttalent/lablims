"use client";

import { DemoDisclaimer } from "@/components/demo/demo-disclaimer";
import { MOCK_USERS } from "@/data/mock-users";
import { ROLE_LABELS } from "@/lib/permissions";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types";
import { FlaskConical, Stethoscope } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const ROLE_ORDER: UserRole[] = [
  "admin",
  "scientist",
  "tech",
  "biller",
  "doctor",
];

const ROLE_HINT: Record<UserRole, string> = {
  admin: "Full access — users, reports, settings.",
  scientist: "Verify and edit results; clinical oversight.",
  tech: "Enter results and follow assigned work.",
  biller: "Invoices, payments, and receivables.",
  doctor: "Request tests and review released results.",
};

export default function LoginPage() {
  const { login, user, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && user) router.replace("/dashboard");
  }, [hydrated, user, router]);

  return (
    <div className="relative min-h-screen bg-muted/40">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,oklch(0.97_0.015_250)_0%,transparent_45%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25 shadow-sm">
              <Stethoscope className="size-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                LabLIMS
              </h1>
              <p className="text-sm text-muted-foreground">
                Calm, modern LIMS workspace — demonstration build
              </p>
            </div>
          </div>
          <DemoDisclaimer variant="banner" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <Card className="border-border shadow-md bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FlaskConical className="size-5 text-primary" />
                Session selection
              </CardTitle>
              <CardDescription>
                No authentication server — choose a role to enforce demo permissions. Data stays in this browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {ROLE_ORDER.map((role) => {
                const u = MOCK_USERS.find((x) => x.role === role)!;
                return (
                  <Button
                    key={role}
                    variant="outline"
                    className={cn(
                      "h-auto min-h-[4.5rem] flex-col items-start gap-1 py-3 px-3 text-left rounded-xl border-border/80 bg-background/70 hover:bg-accent/70",
                    )}
                    onClick={() => {
                      login(u.id);
                      router.push("/dashboard");
                    }}
                  >
                    <span className="font-medium">{u.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {u.email}
                    </span>
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      {ROLE_LABELS[role]}
                    </Badge>
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-dashed border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/15">
            <CardHeader>
              <CardTitle>Role capabilities</CardTitle>
              <CardDescription>
                Permissions are enforced in navigation, tables, and action
                buttons.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {ROLE_ORDER.map((role) => (
                <div
                  key={role}
                  className="rounded-lg border border-border/60 bg-background/70 px-3 py-2"
                >
                  <p className="font-medium">{ROLE_LABELS[role]}</p>
                  <p className="text-muted-foreground">{ROLE_HINT[role]}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          LabLIMS demo — not a regulated medical device. Do not use for real
          diagnostic decisions.
        </p>
      </div>
    </div>
  );
}
