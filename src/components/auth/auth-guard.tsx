"use client";

import { useAuth } from "@/contexts/auth-context";
import { LabLoader } from "@/components/ui/lab-loader";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hydrated) return;
    if (!user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [user, hydrated, pathname, router]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50/80 via-background to-slate-50 dark:from-cyan-950/20 dark:via-background dark:to-slate-950/40">
        <LabLoader className="min-h-0 py-12" message="Preparing your LabLIMS session…" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
