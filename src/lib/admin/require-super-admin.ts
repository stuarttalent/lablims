import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export type SuperAdminContext = {
  userId: string;
  laboratoryId: string;
  role: UserRole;
};

type AuthFail = { ok: false; status: number; message: string };
type AuthOk = { ok: true; ctx: SuperAdminContext };

export async function requireSuperAdmin(): Promise<AuthOk | AuthFail> {
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

    if (profile.role !== "super_admin") {
      return {
        ok: false,
        status: 403,
        message: "Only a super administrator can manage user accounts.",
      };
    }

    return {
      ok: true,
      ctx: {
        userId: user.id,
        laboratoryId: profile.laboratory_id,
        role: profile.role as UserRole,
      },
    };
  } catch {
    return { ok: false, status: 503, message: "Supabase is not configured." };
  }
}
