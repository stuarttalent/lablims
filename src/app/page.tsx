"use client";

import { useAuth } from "@/contexts/auth-context";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { LabMarketingShell } from "@/components/layout/lab-marketing-shell";
import { LabLoader } from "@/components/ui/lab-loader";
import { FlaskConical } from "lucide-react";
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
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center gap-3 px-5 py-5 sm:px-8">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/12 text-white ring-1 ring-white/20 shadow-lg backdrop-blur-md">
            <FlaskConical className="size-6" strokeWidth={1.75} />
          </div>
          <div className="leading-tight">
            <p className="text-base font-semibold tracking-tight text-white">
              {APP_NAME}
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/55">
              Laboratory information system
            </p>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-10 px-5 pb-12 pt-2 sm:px-8 lg:flex-row lg:items-start lg:gap-12 lg:pb-16">
          <div className="flex-1 lg:max-w-xl lg:pt-6">
            <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/80 backdrop-blur-md">
              Medical laboratory workspace
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl sm:leading-[1.12] lg:text-5xl">
              Orders, results, and billing in one place.
            </h1>
            <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-white/75 sm:text-lg">
              Sign in with your staff profile to open the worklist, authorize
              results, manage inventory, and run quality programmes — built for
              hospital and reference lab workflows.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/60">
              <li>· Front-office ticket desk &amp; specimen tracking</li>
              <li>· HL7 / FHIR send &amp; receive bridges</li>
              <li>· Cumulative results &amp; printable slips</li>
            </ul>
          </div>

          <div className="w-full lg:max-w-md lg:shrink-0">
            <SignInPanel variant="marketing" />
          </div>
        </main>
      </div>
    </LabMarketingShell>
  );
}
