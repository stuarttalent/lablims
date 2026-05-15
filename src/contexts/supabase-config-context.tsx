"use client";

import type { SupabaseRuntimeConfig } from "@/lib/supabase/config";
import { seedSupabaseConfig } from "@/lib/supabase/config";
import { createContext, useContext, useLayoutEffect } from "react";

const SupabaseConfigContext = createContext<SupabaseRuntimeConfig | null>(null);

export function SupabaseConfigProvider({
  initialConfig,
  children,
}: {
  initialConfig: SupabaseRuntimeConfig;
  children: React.ReactNode;
}) {
  if (initialConfig.enabled) seedSupabaseConfig(initialConfig);

  useLayoutEffect(() => {
    seedSupabaseConfig(initialConfig);
  }, [initialConfig]);

  return (
    <SupabaseConfigContext.Provider value={initialConfig}>
      {children}
    </SupabaseConfigContext.Provider>
  );
}

export function useInitialSupabaseConfig() {
  return useContext(SupabaseConfigContext);
}
