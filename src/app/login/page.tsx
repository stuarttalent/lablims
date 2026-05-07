"use client";

import { LabMarketingShell } from "@/components/layout/lab-marketing-shell";
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
import {
  ArrowLeft,
  ClipboardList,
  FlaskConical,
  Shield,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const ROLE_ORDER: UserRole[] = [
  "super_admin",
  "admin",
  "scientist",
  "tech",
  "biller",
  "doctor",
];

const ROLE_HINT: Record<UserRole, string> = {
  super_admin: "Highest access — all areas including users and catalogue.",
  admin: "Full access — users, reports, settings.",
  scientist: "Authorize and edit results; clinical oversight.",
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
    <LabMarketingShell variant="auth">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 flex flex-col gap-4 sm:mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-fit gap-2 rounded-full border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/15 hover:text-white"
            >
              <Link href="/">
                <ArrowLeft className="size-4" />
                Back to home
              </Link>
            </Button>
            <div className="flex items-center gap-3 sm:justify-end">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 shadow-lg backdrop-blur-md">
                <Stethoscope className="size-7" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  LabLIMS
                </h1>
                <p className="text-sm text-white/65">
                  Secure sign in — select your account profile
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <Card className="border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl">
            <CardHeader className="space-y-2 pb-4">
              <div className="flex items-center gap-2 text-white">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/90 text-primary-foreground">
                  <FlaskConical className="size-4" />
                </div>
                <CardTitle className="text-xl text-white">
                  Session selection
                </CardTitle>
              </div>
              <CardDescription className="text-base text-white/65">
                Choose your profile to continue. Session and permissions are
                applied automatically for this workstation.
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
                      "group h-auto min-h-[5rem] flex-col items-start gap-1.5 rounded-xl border-white/20 bg-white/90 py-3.5 px-3.5 text-left shadow-sm",
                      "transition hover:border-primary/40 hover:bg-white hover:shadow-md",
                    )}
                    onClick={() => {
                      login(u.id);
                      router.push("/dashboard");
                    }}
                  >
                    <span className="font-semibold text-foreground">
                      {u.name}
                    </span>
                    <span className="line-clamp-1 w-full text-xs text-muted-foreground">
                      {u.email}
                    </span>
                    <Badge
                      variant="secondary"
                      className="mt-1 border border-border/60 bg-muted/80 text-[10px] font-medium"
                    >
                      {ROLE_LABELS[role]}
                    </Badge>
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="flex flex-col border-white/15 bg-white/[0.07] shadow-xl backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center gap-2 text-white">
                <Shield className="size-5 text-cyan-200/90" />
                <CardTitle className="text-lg text-white">
                  What each role can do
                </CardTitle>
              </div>
              <CardDescription className="text-white/60">
                The app hides menu items and buttons your role cannot use —
                same as a production LIS.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 text-sm">
              {ROLE_ORDER.map((role) => (
                <div
                  key={role}
                  className="flex gap-3 rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-white/90 backdrop-blur-sm"
                >
                  <ClipboardList className="mt-0.5 size-4 shrink-0 text-cyan-200/80" />
                  <div>
                    <p className="font-medium text-white">
                      {ROLE_LABELS[role]}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-snug text-white/65">
                      {ROLE_HINT[role]}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <p className="mt-10 text-center text-xs text-white/50">
          For authorized laboratory staff only. Activity may be logged according
          to your organisation&apos;s policy.
        </p>
      </div>
    </LabMarketingShell>
  );
}
