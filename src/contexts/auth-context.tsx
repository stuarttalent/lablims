"use client";

import { MOCK_USERS } from "@/data/mock-users";
import { validateDemoCredentials } from "@/lib/demo-auth";
import { useInitialSupabaseConfig } from "@/contexts/supabase-config-context";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseClient } from "@/lib/supabase/client";
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
  const supabase = await getSupabaseClient();
  if (!supabase) return { user: null, laboratoryId: null };

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

const LOCAL_LOGIN_HINT =
  'Create a file named .env.local in the project root (same folder as package.json) with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from Supabase → Project Settings → API, then restart "npm run dev". Or use Access demo (password "demo").';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialSupabase = useInitialSupabaseConfig();
  const [user, setUser] = useState<MockUser | null>(null);
  const [laboratoryId, setLaboratoryId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [supabaseEnabled, setSupabaseEnabled] = useState(
    () => initialSupabase?.enabled ?? false,
  );

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function init() {
      const config = await getSupabaseConfig();
      if (!cancelled) setSupabaseEnabled(config.enabled);

      if (config.enabled) {
        try {
          const { user: u, laboratoryId: labId } = await loadUserFromSession();
          if (!cancelled) {
            setUser(u);
            setLaboratoryId(labId);
          }
        } catch (e) {
          console.error("Supabase auth init failed:", e);
        }

        const supabase = await getSupabaseClient();
        if (supabase && !cancelled) {
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange(async () => {
            const { user: u, laboratoryId: labId } = await loadUserFromSession();
            if (!cancelled) {
              setUser(u);
              setLaboratoryId(labId);
            }
          });
          unsubscribe = () => subscription.unsubscribe();
          setHydrated(true);
          return;
        }
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

    void init();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const login = useCallback(async (userId: string) => {
    const mock = MOCK_USERS.find((x) => x.id === userId);
    if (!mock) {
      return { ok: false as const, message: "Unknown demo profile." };
    }

    const supabase = await getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({
        email: mock.email,
        password: "demo",
      });
      if (error) {
        return { ok: false as const, message: error.message };
      }
      const { user: u, laboratoryId: labId } = await loadUserFromSession();
      if (!u) {
        return {
          ok: false as const,
          message:
            "Signed in but no staff profile found. Run the profiles SQL in supabase/migrations/00003_demo_auth_users.sql.",
        };
      }
      setUser(u);
      setLaboratoryId(labId);
      return { ok: true as const };
    }

    setUser(mock);
    localStorage.setItem(AUTH_KEY, mock.id);
    return { ok: true as const };
  }, []);

  const loginWithCredentials = useCallback(
    async (email: string, password: string) => {
      const supabase = await getSupabaseClient();
      if (supabase) {
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
              "Signed in to Supabase, but no row in public.profiles for this user. In Supabase SQL Editor, link your auth user to profiles (see supabase/migrations/00003_demo_auth_users.sql).",
          };
        }
        setUser(u);
        setLaboratoryId(labId);
        return { ok: true as const };
      }

      const result = validateDemoCredentials(email, password);
      if (!result.ok) {
        if (result.message === "No account found for this email address.") {
          return { ok: false as const, message: `${result.message} ${LOCAL_LOGIN_HINT}` };
        }
        return result;
      }
      const u = MOCK_USERS.find((x) => x.id === result.userId);
      if (!u) {
        return { ok: false as const, message: "Account could not be loaded." };
      }
      setUser(u);
      localStorage.setItem(AUTH_KEY, u.id);
      return { ok: true as const };
    },
    [],
  );

  const logout = useCallback(async () => {
    const supabase = await getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setLaboratoryId(null);
    localStorage.removeItem(AUTH_KEY);
  }, []);

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
