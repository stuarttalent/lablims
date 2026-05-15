"use client";

import { MOCK_USERS } from "@/data/mock-users";
import { DEMO_PASSWORD } from "@/lib/demo-auth";
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
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const ROLE_ORDER: UserRole[] = [
  "super_admin",
  "admin",
  "scientist",
  "tech",
  "biller",
  "doctor",
];

export function DemoAccountsPanel() {
  const { login } = useAuth();
  const router = useRouter();

  async function signInAs(userId: string) {
    const result = await login(userId);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Demo session started.");
    router.push("/dashboard");
  }

  return (
    <div className="space-y-4">
      <Card className="border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-white">Demo accounts</CardTitle>
          <CardDescription className="text-white/65">
            Select a profile to explore the laboratory system. Password for all
            accounts:{" "}
            <code className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-white">
              {DEMO_PASSWORD}
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {ROLE_ORDER.map((role) => {
            const u = MOCK_USERS.find((x) => x.role === role)!;
            return (
              <Button
                key={role}
                variant="outline"
                className={cn(
                  "h-auto w-full flex-col items-start gap-1 rounded-xl border-white/20 bg-white/90 py-3 px-3 text-left",
                  "hover:border-primary/40 hover:bg-white",
                )}
                onClick={() => signInAs(u.id)}
              >
                <span className="font-semibold text-foreground">{u.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {u.email}
                </span>
                <Badge
                  variant="secondary"
                  className="mt-0.5 text-[10px] font-medium"
                >
                  {ROLE_LABELS[role]}
                </Badge>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-white/50">
        Demo only — not for real patient care. Data is stored locally in your
        browser.
      </p>
    </div>
  );
}
