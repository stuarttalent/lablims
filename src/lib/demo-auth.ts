import { MOCK_USERS } from "@/data/mock-users";

/** Shared demo password for all mock accounts (shown on the demo access page). */
export const DEMO_PASSWORD = "demo";

export function findMockUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return MOCK_USERS.find((u) => u.email.toLowerCase() === normalized);
}

export function validateDemoCredentials(
  email: string,
  password: string,
): { ok: true; userId: string } | { ok: false; message: string } {
  const user = findMockUserByEmail(email);
  if (!user) {
    return { ok: false, message: "No account found for this email address." };
  }
  if (password !== DEMO_PASSWORD) {
    return { ok: false, message: "Incorrect password." };
  }
  return { ok: true, userId: user.id };
}
