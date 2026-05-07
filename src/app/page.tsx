"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { ArrowRight, FlaskConical, LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Stock photography: laboratory microscopes (Unsplash). */
const HERO_SRC =
  "https://images.unsplash.com/photo-1631549916768-4119b382e760?auto=format&fit=crop&q=85&w=2400";

export default function Home() {
  const { user, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (user) router.replace("/dashboard");
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Opening workspace…
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <Image
        src={HERO_SRC}
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-950/92 via-slate-950/75 to-primary/25"
        aria-hidden
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_55%)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-white/12 text-white ring-1 ring-white/20 shadow-lg backdrop-blur-md">
              <FlaskConical className="size-6" strokeWidth={1.75} />
            </div>
            <div className="leading-tight">
              <p className="text-base font-semibold tracking-tight text-white">
                LabLIMS
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/55">
                Laboratory workspace
              </p>
            </div>
          </div>
          <Button
            asChild
            variant="secondary"
            className="gap-2 rounded-full border-0 bg-white/95 text-slate-900 shadow-md hover:bg-white"
          >
            <Link href="/login">
              <LogIn className="size-4" />
              Sign in
            </Link>
          </Button>
        </header>

        <main className="flex flex-1 flex-col justify-center px-5 pb-16 pt-4 sm:px-8 sm:pb-20">
          <div className="mx-auto w-full max-w-2xl text-center sm:text-left lg:mx-0">
            <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/80 backdrop-blur-md">
              Demo laboratory information system
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.1] lg:text-6xl">
              Clear tools for every shift.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-white/75 sm:mx-0">
              Orders, results, and billing in one calm layout. Sign in to open
              the session picker and choose a demo role.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:items-stretch sm:justify-start">
              <Button
                asChild
                size="lg"
                className="h-12 min-w-[200px] rounded-full px-8 text-base shadow-lg shadow-primary/25"
              >
                <Link href="/login" className="gap-2">
                  Sign in to LabLIMS
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 min-w-[200px] rounded-full border-white/35 bg-white/10 text-white backdrop-blur-md hover:bg-white/15 hover:text-white"
              >
                <Link href="/login">Choose demo role</Link>
              </Button>
            </div>

            <p className="mt-10 text-xs leading-relaxed text-white/45">
              Background stock photography via{" "}
              <a
                href="https://unsplash.com?utm_source=lablims-demo&utm_medium=referral"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/30 underline-offset-2 hover:text-white/70"
              >
                Unsplash
              </a>
              . Demonstration only — not for real patient care.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
