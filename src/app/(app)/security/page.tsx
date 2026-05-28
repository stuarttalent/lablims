"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@/types";
import { toast } from "sonner";

type Staff = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  laboratoryId?: string;
  laboratoryName?: string;
  branchId?: string;
  branchName?: string;
  suspendedAt?: string;
  assignedBranchIds?: string[];
};

type Lab = {
  id: string;
  slug: string;
  name: string;
  branches: {
    id: string;
    name: string;
    code?: string | null;
    address?: string | null;
    active?: boolean;
    letterhead_pdf_data_url?: string | null;
  }[];
  managers: { id: string; full_name: string; email: string }[];
};

export default function SecurityPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Staff[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState<Record<string, string>>({});
  const [editRole, setEditRole] = useState<Record<string, UserRole>>({});
  const [pdfDraftByBranch, setPdfDraftByBranch] = useState<Record<string, string>>({});

  const roleOptions = useMemo(() => {
    if (user?.role === "super_admin") {
      return ["super_admin", "lab_manager", "admin", "scientist", "tech", "biller", "doctor"] as UserRole[];
    }
    return ["lab_manager", "admin", "scientist", "tech", "biller", "doctor"] as UserRole[];
  }, [user?.role]);

  async function loadAll() {
    setLoading(true);
    try {
      const [usersRes, labsRes] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/laboratories", { cache: "no-store" }),
      ]);
      const usersData = (await usersRes.json()) as { users?: Staff[]; error?: string };
      const labsData = (await labsRes.json()) as { laboratories?: Lab[]; error?: string };
      if (!usersRes.ok) throw new Error(usersData.error ?? "Could not load users.");
      if (!labsRes.ok) throw new Error(labsData.error ?? "Could not load laboratories.");
      setUsers(usersData.users ?? []);
      setLabs(labsData.laboratories ?? []);
      setEditName(
        Object.fromEntries((usersData.users ?? []).map((u) => [u.id, u.fullName])) as Record<string, string>,
      );
      setEditRole(
        Object.fromEntries((usersData.users ?? []).map((u) => [u.id, u.role])) as Record<string, UserRole>,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load access control.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    void loadAll();
  }, [user?.id]);

  async function saveUser(u: Staff) {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editName[u.id] ?? u.fullName,
          role: editRole[u.id] ?? u.role,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update user.");
      toast.success("User updated.");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update user.");
    }
  }

  async function suspendUser(u: Staff, suspend: boolean) {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: suspend }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update suspension.");
      toast.success(suspend ? "User suspended." : "User unsuspended.");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update suspension.");
    }
  }

  async function deleteUser(u: Staff) {
    if (!confirm(`Delete user ${u.fullName}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete user.");
      toast.success("User deleted.");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete user.");
    }
  }

  async function assignUserBranches(u: Staff) {
    const lab = labs.find((l) => l.id === u.laboratoryId);
    if (!lab) {
      toast.error("No laboratory found for this user.");
      return;
    }
    const options = lab.branches.map((b) => b.name).join(", ");
    const initial = (u.assignedBranchIds ?? [])
      .map((id) => lab.branches.find((b) => b.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    const input = window.prompt(
      `Assign branches to ${u.fullName}. Enter comma-separated branch names.\nAvailable: ${options}`,
      initial,
    );
    if (input === null) return;
    const wanted = input
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const wantedIds = lab.branches
      .filter((b) => wanted.includes(b.name))
      .map((b) => b.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/branches`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchIds: wantedIds }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not assign branches.");
      toast.success("Branch assignments updated.");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign branches.");
    }
  }

  async function deleteLab(lab: Lab) {
    if (!confirm(`Delete laboratory ${lab.name}? This removes all related data.`)) return;
    try {
      const res = await fetch(`/api/admin/laboratories/${lab.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete laboratory.");
      toast.success("Laboratory deleted.");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete laboratory.");
    }
  }

  async function suspendBranch(branchId: string, active: boolean) {
    try {
      const res = await fetch(`/api/admin/branches/${branchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update branch.");
      toast.success(!active ? "Branch unsuspended." : "Branch suspended.");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update branch.");
    }
  }

  async function deleteBranch(branchId: string) {
    if (!confirm("Delete this branch?")) return;
    try {
      const res = await fetch(`/api/admin/branches/${branchId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete branch.");
      toast.success("Branch deleted.");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete branch.");
    }
  }

  async function uploadBranchLetterhead(branchId: string) {
    const dataUrl = pdfDraftByBranch[branchId];
    try {
      const res = await fetch(`/api/admin/branches/${branchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letterheadPdfDataUrl: dataUrl || null }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save letterhead.");
      toast.success(dataUrl ? "Branch letterhead saved." : "Branch letterhead removed.");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save letterhead.");
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-4 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Security / Access control</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {user.role === "super_admin"
            ? "Platform-wide access control for users, laboratories, and branches."
            : "Laboratory-scoped access control for assigned laboratories and branches."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Lab</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned branches</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="min-w-[180px]">
                      <Input
                        value={editName[u.id] ?? u.fullName}
                        onChange={(e) => setEditName((m) => ({ ...m, [u.id]: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{u.email}</TableCell>
                    <TableCell className="min-w-[170px]">
                      <Select
                        value={editRole[u.id] ?? u.role}
                        onValueChange={(v) => setEditRole((m) => ({ ...m, [u.id]: v as UserRole }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((r) => (
                            <SelectItem
                              key={r}
                              value={r}
                              disabled={user.role !== "super_admin" && r === "super_admin"}
                            >
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{u.laboratoryName ?? "—"}</TableCell>
                    <TableCell>{u.branchName ?? "—"}</TableCell>
                    <TableCell>{u.suspendedAt ? "Suspended" : "Active"}</TableCell>
                    <TableCell className="text-xs">
                      {(u.assignedBranchIds ?? [])
                        .map((id) =>
                          labs
                            .find((l) => l.id === u.laboratoryId)
                            ?.branches.find((b) => b.id === id)?.name,
                        )
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => void saveUser(u)}>Edit</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void assignUserBranches(u)}
                      >
                        Branches
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void suspendUser(u, !u.suspendedAt)}
                      >
                        {u.suspendedAt ? "Unsuspend" : "Suspend"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => void deleteUser(u)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {user.role === "super_admin" ? "Laboratories (platform)" : "Laboratories (assigned)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {labs.map((lab) => (
            <div key={lab.id} className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{lab.name}</p>
                  <p className="text-xs text-muted-foreground">{lab.slug}</p>
                </div>
                {user.role === "super_admin" ? (
                  <Button size="sm" variant="destructive" onClick={() => void deleteLab(lab)}>
                    Delete lab
                  </Button>
                ) : null}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Branches</p>
                <div className="space-y-1">
                  {lab.branches.map((b) => (
                    <div key={b.id} className="rounded border px-2 py-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {b.name} {b.active === false ? "(Suspended)" : ""}
                        </span>
                        <div className="space-x-1">
                          <Button size="sm" variant="outline" onClick={() => void suspendBranch(b.id, b.active !== false)}>
                            {b.active === false ? "Unsuspend" : "Suspend"}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => void deleteBranch(b.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          type="file"
                          accept="application/pdf"
                          className="max-w-xs"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const dataUrl = reader.result;
                              if (typeof dataUrl === "string") {
                                setPdfDraftByBranch((m) => ({ ...m, [b.id]: dataUrl }));
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                        <Button size="sm" variant="outline" onClick={() => void uploadBranchLetterhead(b.id)}>
                          Save letterhead PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPdfDraftByBranch((m) => ({ ...m, [b.id]: "" }));
                            void uploadBranchLetterhead(b.id);
                          }}
                        >
                          Remove letterhead
                        </Button>
                        {b.letterhead_pdf_data_url ? (
                          <span className="text-xs text-muted-foreground">Letterhead uploaded</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {lab.branches.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No branches.</p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
