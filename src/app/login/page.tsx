"use client";

import { SignInPanel } from "@/components/auth/sign-in-panel";
import { LabMarketingShell } from "@/components/layout/lab-marketing-shell";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/app-brand";
import { ArrowLeft, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && user) router.replace("/dashboard");
  }, [hydrated, user, router]);

  return (
    <LabMarketingShell variant="auth">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 flex flex-col gap-4">
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
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 shadow-lg backdrop-blur-md">
              <Stethoscope className="size-7" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {APP_NAME}
              </h1>
              <p className="text-sm text-white/65">Staff &amp; referrer sign in</p>
            </div>
          </div>
        </header>

        <SignInPanel variant="marketing" />

        <p className="mt-8 text-center text-xs text-white/50">
          For authorized laboratory staff only. Activity may be logged according
          to your organisation&apos;s policy.
        </p>
      </div>
    </LabMarketingShell>
  );
}
