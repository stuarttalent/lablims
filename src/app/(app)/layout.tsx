"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { RouteGuard } from "@/components/auth/route-guard";
import { AppShell } from "@/components/layout/app-shell";

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppShell>
        <RouteGuard>{children}</RouteGuard>
      </AppShell>
    </AuthGuard>
  );
}
