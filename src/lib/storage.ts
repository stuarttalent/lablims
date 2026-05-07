import { createInitialStore } from "@/data/seed";
import type { DemoStore } from "@/types";

export const STORAGE_KEY = "lablims-store-v2";

export function loadStoredStore(): DemoStore | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DemoStore;
  } catch {
    return null;
  }
}

export function persistStore(store: DemoStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function clearStoredStore() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function freshDemoStore(): DemoStore {
  return createInitialStore();
}
