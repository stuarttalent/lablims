"use client";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { DataProvider } from "@/contexts/data-context";
import { SupabaseConfigProvider } from "@/contexts/supabase-config-context";
import type { SupabaseRuntimeConfig } from "@/lib/supabase/config";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({
  children,
  supabaseConfig,
}: {
  children: React.ReactNode;
  supabaseConfig: SupabaseRuntimeConfig;
}) {
  return (
    <SupabaseConfigProvider initialConfig={supabaseConfig}>
      <AuthProvider>
        <DataProvider>
          <TooltipProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </TooltipProvider>
        </DataProvider>
      </AuthProvider>
    </SupabaseConfigProvider>
  );
}
