"use client";

import { MOCK_USERS } from "@/data/mock-users";
import type { MockUser } from "@/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AUTH_KEY = "lablims-demo-session";

type AuthContextValue = {
  user: MockUser | null;
  hydrated: boolean;
  login: (userId: string) => void;
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

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  }, []);

  const value = useMemo(
    () => ({ user, hydrated, login, logout }),
    [user, hydrated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
