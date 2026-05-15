"use client";

import { RoleBadge } from "@/components/auth/role-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { MOCK_USERS } from "@/data/mock-users";
import type { LabStaffMember } from "@/lib/users/roster-types";
import { listLocalStaff } from "@/lib/users/local-roster";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function StaffDirectoryReadonly() {
  const { supabaseEnabled } = useAuth();
  const [staff, setStaff] = useState<LabStaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (supabaseEnabled) {
          const res = await fetch("/api/admin/users", { cache: "no-store" });
          const data = (await res.json()) as {
            users?: LabStaffMember[];
          };
          if (!cancelled) setStaff(data.users ?? []);
        } else if (!cancelled) {
          setStaff(listLocalStaff());
        }
      } catch {
        if (!cancelled) setStaff(MOCK_USERS.map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.name,
          role: u.role,
          professionalCredential: u.professionalCredential,
        })));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [supabaseEnabled]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Staff directory</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.fullName}</TableCell>
                  <TableCell className="font-mono text-xs">{member.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={member.role} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
