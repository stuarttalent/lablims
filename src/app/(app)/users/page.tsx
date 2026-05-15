"use client";

import { UserManagementPanel } from "@/components/users/user-management-panel";
import { StaffDirectoryReadonly } from "@/components/users/staff-directory-readonly";
import { useAuth } from "@/contexts/auth-context";
import { canManageUsers, hasAdminPrivileges } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UsersPage() {
  const { user } = useAuth();

  if (!user) return null;

  if (!hasAdminPrivileges(user.role)) {
    return (
      <Card className="max-w-lg">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Your role cannot access user management.
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (canManageUsers(user.role)) {
    return (
      <div className="space-y-4 max-w-5xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add staff accounts, assign roles, and control who can access each module.
          </p>
        </div>
        <UserManagementPanel />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Directory view — only a super administrator can add users or change roles.
        </p>
      </div>
      <StaffDirectoryReadonly />
    </div>
  );
}
