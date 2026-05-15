"use client";

import { MOCK_USERS } from "@/data/mock-users";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/app-brand";
import { ChevronDown, FlaskConical, KeyRound, Stethoscope } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLE_ORDER: UserRole[] = [
  "super_admin",
  "admin",
  "scientist",
  "tech",
  "biller",
  "doctor",
];

type SignInPanelProps = {
  variant?: "marketing" | "page";
  onSignedIn?: () => void;
};

export function SignInPanel({
  variant = "page",
  onSignedIn,
}: SignInPanelProps) {
  const { login } = useAuth();
  const router = useRouter();
  const [demoOpen, setDemoOpen] = useState(false);

  const isMarketing = variant === "marketing";

  function signInAs(userId: string) {
    login(userId);
    onSignedIn?.();
    router.push("/dashboard");
  }

  const cardClass = isMarketing
    ? "border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl"
    : "border-border/70 shadow-sm";

  const titleClass = isMarketing ? "text-white" : "text-foreground";
  const descClass = isMarketing ? "text-white/65" : "text-muted-foreground";

  return (
    <Card className={cardClass}>
      <CardHeader className="space-y-2 pb-3">
        <div className={cn("flex items-center gap-2", titleClass)}>
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              isMarketing
                ? "bg-primary/90 text-primary-foreground"
                : "bg-primary text-primary-foreground",
            )}
          >
            <FlaskConical className="size-4" />
          </div>
          <div>
            <CardTitle className={cn("text-lg", titleClass)}>Sign in</CardTitle>
            <CardDescription className={cn("text-sm", descClass)}>
              {APP_NAME} — choose a staff profile or referrer access
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="staff" className="w-full">
          <TabsList
            className={cn(
              "w-full",
              isMarketing && "bg-white/10 border border-white/15",
            )}
          >
            <TabsTrigger value="staff" className="flex-1">
              Staff profiles
            </TabsTrigger>
            <TabsTrigger value="referrer" className="flex-1">
              Referrer portal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staff" className="mt-4 space-y-3">
            <p className={cn("text-xs", descClass)}>
              Select your role card — permissions apply immediately on this
              workstation.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ROLE_ORDER.map((role) => {
                const u = MOCK_USERS.find((x) => x.role === role)!;
                return (
                  <Button
                    key={role}
                    variant="outline"
                    className={cn(
                      "h-auto min-h-[4.5rem] flex-col items-start gap-1 rounded-xl py-3 px-3 text-left",
                      isMarketing
                        ? "border-white/20 bg-white/90 hover:bg-white"
                        : "hover:border-primary/40",
                    )}
                    onClick={() => signInAs(u.id)}
                  >
                    <span className="font-semibold text-foreground">{u.name}</span>
                    <span className="line-clamp-1 w-full text-[11px] text-muted-foreground">
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
            </div>
          </TabsContent>

          <TabsContent value="referrer" className="mt-4 space-y-3">
            <p className={cn("text-xs", descClass)}>
              Requesting clinicians can review released results and place orders
              for their patients.
            </p>
            {(() => {
              const doc = MOCK_USERS.find((u) => u.role === "doctor")!;
              return (
                <Button
                  variant="outline"
                  className={cn(
                    "h-auto w-full justify-start gap-3 rounded-xl py-3 px-3",
                    isMarketing
                      ? "border-white/20 bg-white/90 hover:bg-white"
                      : "",
                  )}
                  onClick={() => signInAs(doc.id)}
                >
                  <Stethoscope className="size-5 shrink-0 text-primary" />
                  <div className="text-left">
                    <p className="font-semibold text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.email}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {doc.professionalCredential}
                    </p>
                  </div>
                </Button>
              );
            })()}
          </TabsContent>
        </Tabs>

        <Collapsible open={demoOpen} onOpenChange={setDemoOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant={isMarketing ? "secondary" : "outline"}
              className={cn(
                "w-full gap-2 rounded-xl",
                isMarketing && "border-white/20 bg-white/15 text-white hover:bg-white/20",
              )}
            >
              <KeyRound className="size-4" />
              Demo credentials
              <ChevronDown
                className={cn(
                  "ml-auto size-4 transition-transform",
                  demoOpen && "rotate-180",
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div
              className={cn(
                "rounded-xl border p-3 text-xs space-y-2",
                isMarketing
                  ? "border-white/15 bg-black/25 text-white/90"
                  : "border-border bg-muted/40",
              )}
            >
              <p className={cn("font-medium", isMarketing ? "text-white" : "")}>
                Mock sign-in (no password). Click a role above or use these IDs:
              </p>
              <ul className="space-y-2 font-mono text-[11px] leading-relaxed">
                {MOCK_USERS.map((u) => (
                  <li
                    key={u.id}
                    className={cn(
                      "flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between border-b pb-2 last:border-0 last:pb-0",
                      isMarketing ? "border-white/10" : "border-border/60",
                    )}
                  >
                    <span>
                      <span
                        className={cn(
                          isMarketing ? "text-white/50" : "text-muted-foreground",
                        )}
                      >
                        {u.id}
                      </span>{" "}
                      · {u.email}
                    </span>
                    <Badge variant="outline" className="w-fit text-[10px]">
                      {ROLE_LABELS[u.role]}
                    </Badge>
                  </li>
                ))}
              </ul>
              <p className={cn("text-[10px]", isMarketing ? "text-white/55" : "text-muted-foreground")}>
                Demo only — not for real patient care. Data is stored locally in
                your browser.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
