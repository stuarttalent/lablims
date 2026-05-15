"use client";

import { MOCK_USERS } from "@/data/mock-users";
import { validateDemoCredentials } from "@/lib/demo-auth";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fetchProfileForUser, ensureLaboratoryForUser } from "@/lib/supabase/load-store";
import { profileToMockUser } from "@/lib/supabase/mappers";
import type { MockUser } from "@/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AUTH_KEY = "lablims-session-v1";

type AuthContextValue = {
  user: MockUser | null;
  laboratoryId: string | null;
  hydrated: boolean;
  supabaseEnabled: boolean;
  login: (userId: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  loginWithCredentials: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadUserFromSession(): Promise<{
  user: MockUser | null;
  laboratoryId: string | null;
}> {
  if (!isSupabaseConfigured()) return { user: null, laboratoryId: null };

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return { user: null, laboratoryId: null };

  let profile = await fetchProfileForUser(session.user.id);
  if (!profile) return { user: null, laboratoryId: null };

  const laboratoryId = await ensureLaboratoryForUser(session.user.id);
  profile = (await fetchProfileForUser(session.user.id)) ?? profile;

  return {
    user: profileToMockUser(profile),
    laboratoryId: profile.laboratory_id ?? laboratoryId,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [laboratoryId, setLaboratoryId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const supabaseEnabled = isSupabaseConfigured();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (supabaseEnabled) {
        try {
          const { user: u, laboratoryId: labId } = await loadUserFromSession();
          if (!cancelled) {
            setUser(u);
            setLaboratoryId(labId);
          }
        } catch (e) {
          console.error("Supabase auth init failed:", e);
        } finally {
          if (!cancelled) setHydrated(true);
        }

        const supabase = createClient();
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async () => {
          const { user: u, laboratoryId: labId } = await loadUserFromSession();
          setUser(u);
          setLaboratoryId(labId);
        });
        return () => {
          cancelled = true;
          subscription.unsubscribe();
        };
      }

      try {
        const id = localStorage.getItem(AUTH_KEY);
        if (id) {
          const u = MOCK_USERS.find((x) => x.id === id);
          if (u) setUser(u);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    const cleanup = init();
    return () => {
      cancelled = true;
      void cleanup?.then((fn) => fn?.());
    };
  }, [supabaseEnabled]);

  const login = useCallback(
    async (userId: string) => {
      const mock = MOCK_USERS.find((x) => x.id === userId);
      if (!mock) {
        return { ok: false as const, message: "Unknown demo profile." };
      }

      if (supabaseEnabled) {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
          email: mock.email,
          password: "demo",
        });
        if (error) {
          return { ok: false as const, message: error.message };
        }
        const { user: u, laboratoryId: labId } = await loadUserFromSession();
        setUser(u);
        setLaboratoryId(labId);
        return { ok: true as const };
      }

      setUser(mock);
      localStorage.setItem(AUTH_KEY, mock.id);
      return { ok: true as const };
    },
    [supabaseEnabled],
  );

  const loginWithCredentials = useCallback(
    async (email: string, password: string) => {
      if (supabaseEnabled) {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          return { ok: false as const, message: error.message };
        }
        const { user: u, laboratoryId: labId } = await loadUserFromSession();
        if (!u) {
          return {
            ok: false as const,
            message:
              "Signed in but no staff profile found. Link your user in the profiles table.",
          };
        }
        setUser(u);
        setLaboratoryId(labId);
        return { ok: true as const };
      }

      const result = validateDemoCredentials(email, password);
      if (!result.ok) return result;
      const u = MOCK_USERS.find((x) => x.id === result.userId);
      if (!u) {
        return { ok: false as const, message: "Account could not be loaded." };
      }
      setUser(u);
      localStorage.setItem(AUTH_KEY, u.id);
      return { ok: true as const };
    },
    [supabaseEnabled],
  );

  const logout = useCallback(async () => {
    if (supabaseEnabled) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    setUser(null);
    setLaboratoryId(null);
    localStorage.removeItem(AUTH_KEY);
  }, [supabaseEnabled]);

  const value = useMemo(
    () => ({
      user,
      laboratoryId,
      hydrated,
      supabaseEnabled,
      login,
      loginWithCredentials,
      logout,
    }),
    [
      user,
      laboratoryId,
      hydrated,
      supabaseEnabled,
      login,
      loginWithCredentials,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
