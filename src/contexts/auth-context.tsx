"use client";

import { MOCK_USERS } from "@/data/mock-users";
import { validateDemoCredentials } from "@/lib/demo-auth";
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
  hydrated: boolean;
  login: (userId: string) => void;
  loginWithCredentials: (
    email: string,
    password: string,
  ) => { ok: true } | { ok: false; message: string };
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const id = localStorage.getItem(AUTH_KEY);
      if (id) {
        const u = MOCK_USERS.find((x) => x.id === id);
        if (u) setUser(u);
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  const login = useCallback((userId: string) => {
    const u = MOCK_USERS.find((x) => x.id === userId);
    if (!u) return;
    setUser(u);
    localStorage.setItem(AUTH_KEY, u.id);
  }, []);

  const loginWithCredentials = useCallback(
    (email: string, password: string) => {
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
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  }, []);

  const value = useMemo(
    () => ({ user, hydrated, login, loginWithCredentials, logout }),
    [user, hydrated, login, loginWithCredentials, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
