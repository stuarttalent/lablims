import { MOCK_USERS } from "@/data/mock-users";
import type { LabStaffMember, CreateStaffInput, UpdateStaffInput } from "@/lib/users/roster-types";
import type { MockUser, UserRole } from "@/types";

const STORAGE_KEY = "lablims-extra-staff-v1";

function readExtra(): MockUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MockUser[];
  } catch {
    return [];
  }
}

function writeExtra(users: MockUser[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function toMember(u: MockUser): LabStaffMember {
  return {
    id: u.id,
    email: u.email,
    fullName: u.name,
    role: u.role,
    professionalCredential: u.professionalCredential,
  };
}

export function listLocalStaff(): LabStaffMember[] {
  const extra = readExtra();
  return [...MOCK_USERS, ...extra].map(toMember);
}

export function createLocalStaff(input: CreateStaffInput): LabStaffMember {
  const email = input.email.trim().toLowerCase();
  const all = [...MOCK_USERS, ...readExtra()];
  if (all.some((u) => u.email.toLowerCase() === email)) {
    throw new Error("A user with this email already exists.");
  }

  const id = `u-${Date.now()}`;
  const user: MockUser = {
    id,
    email: input.email.trim(),
    name: input.fullName.trim(),
    role: input.role,
    professionalCredential: input.professionalCredential?.trim() || undefined,
  };
  const extra = readExtra();
  extra.push(user);
  writeExtra(extra);
  return toMember(user);
}

export function updateLocalStaff(id: string, patch: UpdateStaffInput): LabStaffMember {
  const extra = readExtra();
  const idx = extra.findIndex((u) => u.id === id);
  if (idx >= 0) {
    const u = extra[idx]!;
    if (patch.fullName !== undefined) u.name = patch.fullName.trim();
    if (patch.role !== undefined) u.role = patch.role;
    if (patch.professionalCredential !== undefined) {
      u.professionalCredential = patch.professionalCredential.trim() || undefined;
    }
    extra[idx] = u;
    writeExtra(extra);
    return toMember(u);
  }

  const base = MOCK_USERS.find((u) => u.id === id);
  if (!base) throw new Error("User not found.");
  if (base.role === "super_admin" && patch.role && patch.role !== "super_admin") {
    throw new Error("Built-in demo super administrator role cannot be changed offline.");
  }

  const forked: MockUser = {
    ...base,
    name: patch.fullName?.trim() ?? base.name,
    role: (patch.role as UserRole) ?? base.role,
    professionalCredential:
      patch.professionalCredential !== undefined
        ? patch.professionalCredential.trim() || undefined
        : base.professionalCredential,
  };
  const without = extra.filter((u) => u.id !== id);
  without.push(forked);
  writeExtra(without);
  return toMember(forked);
}
