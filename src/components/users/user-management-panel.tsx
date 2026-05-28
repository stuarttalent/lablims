"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import {
  createLocalStaff,
  listLocalStaff,
  updateLocalStaff,
} from "@/lib/users/local-roster";
import {
  ASSIGNABLE_ROLES,
  SUPER_ADMIN_ASSIGNABLE_ROLES,
  type LabStaffMember,
} from "@/lib/users/roster-types";
import { ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@/types";
import { Loader2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type ManagedLab = {
  id: string;
  name: string;
  slug: string;
  branches: { id: string; name: string; code?: string | null; address?: string | null }[];
  managers: { id: string; full_name: string; email: string }[];
};

async function fetchCloudStaff(): Promise<LabStaffMember[]> {
  const res = await fetch("/api/admin/users", { cache: "no-store" });
  const data = (await res.json()) as { users?: LabStaffMember[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Could not load staff.");
  return data.users ?? [];
}

async function fetchLabs(): Promise<ManagedLab[]> {
  const res = await fetch("/api/admin/laboratories", { cache: "no-store" });
  const data = (await res.json()) as { laboratories?: ManagedLab[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Could not load laboratories.");
  return data.laboratories ?? [];
}

export function UserManagementPanel() {
  const { user, supabaseEnabled } = useAuth();
  const [staff, setStaff] = useState<LabStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("tech");
  const [credential, setCredential] = useState("");

  const [labs, setLabs] = useState<ManagedLab[]>([]);
  const [targetLabId, setTargetLabId] = useState("");
  const [targetBranchId, setTargetBranchId] = useState("");
  const [labName, setLabName] = useState("");
  const [labSlug, setLabSlug] = useState("");
  const [branchName, setBranchName] = useState("");
  const assignableRoles =
    user?.role === "super_admin" ? SUPER_ADMIN_ASSIGNABLE_ROLES : ASSIGNABLE_ROLES;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (supabaseEnabled) {
        setStaff(await fetchCloudStaff());
        if (user?.role === "super_admin") {
          const loadedLabs = await fetchLabs();
          setLabs(loadedLabs);
          if (!targetLabId && loadedLabs[0]?.id) {
            setTargetLabId(loadedLabs[0].id);
          }
        }
      } else {
        setStaff(listLocalStaff());
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, [supabaseEnabled, targetLabId, user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password || !fullName.trim()) {
      toast.error("Email, password, and full name are required.");
      return;
    }
    setSaving(true);
    try {
      if (supabaseEnabled) {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
            fullName: fullName.trim(),
            role,
            professionalCredential: credential.trim() || undefined,
            laboratoryId:
              user?.role === "super_admin" ? targetLabId || undefined : undefined,
            branchId:
              user?.role === "super_admin" ? targetBranchId || undefined : undefined,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not create user.");
        toast.success("Staff account created.");
      } else {
        createLocalStaff({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          role,
          professionalCredential: credential.trim() || undefined,
        });
        toast.success("Demo staff added (offline roster).");
      }
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("tech");
      setCredential("");
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateLab(e: React.FormEvent) {
    e.preventDefault();
    if (!labName.trim() || !labSlug.trim()) {
      toast.error("Laboratory name and slug are required.");
      return;
    }
    try {
      const res = await fetch("/api/admin/laboratories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: labName.trim(), slug: labSlug.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create laboratory.");
      toast.success("Laboratory created.");
      setLabName("");
      setLabSlug("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create laboratory.");
    }
  }

  async function handleCreateBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!targetLabId || !branchName.trim()) {
      toast.error("Select laboratory and enter branch name.");
      return;
    }
    try {
      const res = await fetch(`/api/admin/laboratories/${targetLabId}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: branchName.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create branch.");
      toast.success("Branch added.");
      setBranchName("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create branch.");
    }
  }

  async function handleRoleChange(memberId: string, nextRole: UserRole) {
    if (memberId === user?.id && nextRole !== "super_admin") {
      toast.error("You cannot remove your own super administrator role.");
      return;
    }
    try {
      if (supabaseEnabled) {
        const res = await fetch(`/api/admin/users/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: nextRole }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not update role.");
      } else {
        updateLocalStaff(memberId, { role: nextRole });
      }
      toast.success("Role updated.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update role.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground max-w-xl">
          {supabaseEnabled
            ? "Create Supabase Auth accounts for your laboratory and assign access roles. New users can sign in immediately with the password you set."
            : "Offline demo: added users are stored in this browser only. Cloud mode requires Supabase and SUPABASE_SERVICE_ROLE_KEY."}
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="gap-2 shrink-0" />}>
            <UserPlus className="size-4" />
            Add user
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add staff member</DialogTitle>
              <DialogDescription>
                Creates a sign-in account and assigns their role in this laboratory.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="staff-full-name">Full name</Label>
                <Input
                  id="staff-full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tariro Moyo"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-email">Email</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organisation.org"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-password">Temporary password</Label>
                <Input
                  id="staff-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {user?.role === "super_admin" && supabaseEnabled ? (
                <>
                  <div className="space-y-2">
                    <Label>Laboratory</Label>
                    <Select
                      value={targetLabId}
                      onValueChange={(v) => {
                        const next = v ?? "";
                        setTargetLabId(next);
                        setTargetBranchId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select laboratory" />
                      </SelectTrigger>
                      <SelectContent>
                        {labs.map((lab) => (
                          <SelectItem key={lab.id} value={lab.id}>
                            {lab.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Branch (optional)</Label>
                    <Select
                      value={targetBranchId || "none"}
                      onValueChange={(v) => setTargetBranchId(!v || v === "none" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No branch</SelectItem>
                        {(labs.find((lab) => lab.id === targetLabId)?.branches ?? []).map(
                          (branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="staff-credential">Professional credential (optional)</Label>
                <Input
                  id="staff-credential"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  placeholder="BMLS · HPCZ L8841"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  Create account
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {user?.role === "super_admin" && supabaseEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Laboratories & branches</CardTitle>
            <CardDescription>
              Create laboratories, add branches, and then assign lab managers or staff.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form className="grid gap-3 sm:grid-cols-3" onSubmit={handleCreateLab}>
              <Input
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                placeholder="Laboratory name"
              />
              <Input
                value={labSlug}
                onChange={(e) => setLabSlug(e.target.value)}
                placeholder="laboratory-slug"
              />
              <Button type="submit">Add laboratory</Button>
            </form>
            <form className="grid gap-3 sm:grid-cols-3" onSubmit={handleCreateBranch}>
              <Select value={targetLabId} onValueChange={(v) => setTargetLabId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Laboratory" />
                </SelectTrigger>
                <SelectContent>
                  {labs.map((lab) => (
                    <SelectItem key={lab.id} value={lab.id}>
                      {lab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Branch name"
              />
              <Button type="submit" variant="secondary">
                Add branch
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff directory</CardTitle>
          <CardDescription>
            {loading ? "Loading…" : `${staff.length} account${staff.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="size-4 animate-spin" />
              Loading staff…
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
                {staff.map((member) => {
                  const isSelf = user?.id === member.id;
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.fullName}
                        {isSelf ? (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{member.email}</TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          onValueChange={(v) =>
                            void handleRoleChange(member.id, v as UserRole)
                          }
                          disabled={isSelf && member.role === "super_admin"}
                        >
                          <SelectTrigger className="h-9 w-[220px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableRoles.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
