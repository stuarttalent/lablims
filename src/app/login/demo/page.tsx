"use client";

import { DemoAccountsPanel } from "@/components/auth/demo-accounts-panel";
import { LabMarketingShell } from "@/components/layout/lab-marketing-shell";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/app-brand";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginDemoPage() {
  const { user, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && user) router.replace("/dashboard");
  }, [hydrated, user, router]);

  return (
    <LabMarketingShell variant="auth">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-fit gap-2 rounded-full border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/15 hover:text-white"
          >
            <Link href="/login">
              <ArrowLeft className="size-4" />
              Back to sign in
            </Link>
          </Button>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white">
            {APP_NAME} demo
          </h1>
          <p className="mt-1 text-sm text-white/65">
            Choose a demo account to continue
          </p>
        </header>

        <DemoAccountsPanel />
      </div>
    </LabMarketingShell>
  );
}
