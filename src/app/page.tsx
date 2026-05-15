"use client";

import { useAuth } from "@/contexts/auth-context";
import { LabMarketingShell } from "@/components/layout/lab-marketing-shell";
import { Button } from "@/components/ui/button";
import { LabLoader } from "@/components/ui/lab-loader";
import { FlaskConical, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { APP_NAME } from "@/lib/app-brand";

export default function Home() {
  const { user, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (user) router.replace("/dashboard");
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LabLoader message={`Starting ${APP_NAME}…`} />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Opening workspace…
      </div>
    );
  }

  return (
    <LabMarketingShell variant="landing">
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div className="flex flex-col items-center text-center max-w-lg">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-white/12 text-white ring-1 ring-white/20 shadow-lg backdrop-blur-md">
            <FlaskConical className="size-8" strokeWidth={1.75} />
          </div>
          <p className="mt-6 text-lg font-semibold tracking-tight text-white">
            {APP_NAME}
          </p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/55">
            Laboratory information system
          </p>
          <h1 className="mt-8 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Welcome
          </h1>
          <p className="mt-3 text-pretty text-base text-white/70">
            Sign in to open your laboratory workspace.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-10 h-12 min-w-[200px] rounded-full px-10 text-base shadow-lg shadow-primary/25"
          >
            <Link href="/login" className="gap-2">
              <LogIn className="size-5" />
              Sign in
            </Link>
          </Button>
        </div>
      </div>
    </LabMarketingShell>
  );
}
