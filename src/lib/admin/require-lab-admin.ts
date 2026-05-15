import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasAdminPrivileges } from "@/lib/permissions";
import type { UserRole } from "@/types";

export type LabAdminContext = {
  userId: string;
  laboratoryId: string;
  role: UserRole;
};

type AuthFail = { ok: false; status: number; message: string };
type AuthOk = { ok: true; ctx: LabAdminContext };

/** Administrator or super_admin in the current laboratory. */
export async function requireLabAdmin(): Promise<AuthOk | AuthFail> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, status: 401, message: "Sign in required." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, laboratory_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.laboratory_id) {
      return { ok: false, status: 403, message: "Staff profile not found." };
    }

    const role = profile.role as UserRole;
    if (!hasAdminPrivileges(role)) {
      return { ok: false, status: 403, message: "Administrator access required." };
    }

    return {
      ok: true,
      ctx: {
        userId: user.id,
        laboratoryId: profile.laboratory_id,
        role,
      },
    };
  } catch {
    return { ok: false, status: 503, message: "Supabase is not configured." };
  }
}
