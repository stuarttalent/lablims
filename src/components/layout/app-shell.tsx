"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleBadge } from "@/components/auth/role-badge";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Menu, Search, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen w-full">
        <aside className="hidden lg:flex w-[272px] shrink-0 flex-col border-r border-sidebar-border/90 bg-sidebar text-sidebar-foreground shadow-xl">
          <SidebarNav role={user.role} />
          <div className="mt-auto shrink-0 border-t border-white/10 px-3 py-2.5 text-[10px] leading-relaxed text-sidebar-foreground/55">
            Modules match your role. Some links open a placeholder where a full module
            would integrate (instruments, QC stains, inventory).
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md shadow-sm">
            <div className="flex h-14 items-center gap-3 px-3 sm:px-5 lg:px-6">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden shrink-0"
                    />
                  }
                >
                  <Menu className="size-5" />
                  <span className="sr-only">Open navigation</span>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[272px] border-sidebar-border/90 bg-sidebar p-0 text-sidebar-foreground"
                >
                  <SidebarNav role={user.role} />
                </SheetContent>
              </Sheet>

              <div className="relative flex-1 max-w-xl hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && q.trim()) {
                      router.push(
                        `/patients?q=${encodeURIComponent(q.trim())}`,
                      );
                    }
                  }}
                  placeholder="Find a patient (name or ID, Enter)…"
                  className="pl-9 h-9 bg-background border-input"
                />
              </div>

              <div className="flex flex-1 sm:flex-none items-center justify-end gap-2 min-w-0">
                <RoleBadge role={user.role} className="hidden sm:inline-flex" />
                <div className="hidden md:block lg:hidden text-right min-w-0">
                  <p className="text-sm font-medium truncate max-w-[12rem]">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate max-w-[12rem]">
                    {user.email}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await logout();
                    window.location.assign("/login");
                  }}
                >
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </div>
            </div>
            <div className="sm:hidden px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && q.trim()) {
                      router.push(
                        `/patients?q=${encodeURIComponent(q.trim())}`,
                      );
                    }
                  }}
                  placeholder="Find a patient…"
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </header>

          <main className="flex-1 px-3 py-5 sm:px-6 sm:py-7 max-w-[1680px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
