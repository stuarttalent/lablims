"use client";

import { useAuth } from "@/contexts/auth-context";
import { canAccessRoute } from "@/lib/permissions";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const shown = useRef(false);

  useEffect(() => {
    if (!hydrated || !user) return;
    if (!canAccessRoute(user.role, pathname)) {
      if (!shown.current) {
        toast.message("Access restricted", {
          description: "That module is not enabled for your demo role.",
        });
        shown.current = true;
      }
      router.replace("/dashboard");
    } else {
      shown.current = false;
    }
  }, [hydrated, user, pathname, router]);

  return <>{children}</>;
}
