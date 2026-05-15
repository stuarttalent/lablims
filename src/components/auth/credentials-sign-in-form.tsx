"use client";

import { useAuth } from "@/contexts/auth-context";
import { useInitialSupabaseConfig } from "@/contexts/supabase-config-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/app-brand";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function CredentialsSignInForm() {
  const { loginWithCredentials, supabaseEnabled, hydrated } = useAuth();
  const initialSupabase = useInitialSupabaseConfig();
  const cloudConnected = supabaseEnabled || initialSupabase?.enabled;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    const result = await loginWithCredentials(email, password);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Signed in.");
    router.push("/dashboard");
  }

  return (
    <div className="space-y-4">
      {hydrated ? (
        <p
          className={`rounded-lg border px-3 py-2 text-center text-xs ${
            cloudConnected
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
              : "border-amber-400/30 bg-amber-500/10 text-amber-100"
          }`}
        >
          {cloudConnected
            ? "Cloud database connected — sign in with your Supabase account."
            : "Offline mode — add .env.local in the project root with your Supabase URL and anon key, then restart the dev server."}
        </p>
      ) : null}
      <Card className="border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl text-white">Sign in</CardTitle>
          <CardDescription className="text-white/65">
            Use your {APP_NAME} staff or referrer account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@organisation.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/20 bg-white/95"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-white/20 bg-white/95"
              />
            </div>
            <Button
              type="submit"
              className="w-full gap-2 rounded-xl"
              disabled={submitting}
            >
              <LogIn className="size-4" />
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>

      <Button
        type="button"
        variant="outline"
        className="w-full rounded-xl border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/15 hover:text-white"
        asChild
      >
        <Link href="/login/demo">Access demo</Link>
      </Button>
    </div>
  );
}
