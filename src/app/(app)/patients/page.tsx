"use client";

import { useData } from "@/contexts/data-context";
import { useAuth } from "@/contexts/auth-context";
import { canCreatePatient } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UserPlus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientsPage() {
  const { store, hydrated } = useData();
  const { user } = useAuth();
  const params = useSearchParams();
  const qInit = params.get("q") ?? "";
  const [q, setQ] = useState(qInit);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return store.patients;
    return store.patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(needle) ||
        p.id.toLowerCase().includes(needle) ||
        p.phone.toLowerCase().includes(needle) ||
        p.email.toLowerCase().includes(needle),
    );
  }, [store.patients, q]);

  if (!hydrated || !user) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Look someone up or open their chart. New people use{" "}
            <span className="font-medium text-foreground/90">Add patient</span>{" "}
            or <span className="font-medium text-foreground/90">Quick actions</span>{" "}
            on Home.
          </p>
        </div>
        {canCreatePatient(user.role) ? (
          <Button asChild className="gap-2">
            <Link href="/patients/new">
              <UserPlus className="size-4" />
              Add patient
            </Link>
          </Button>
        ) : (
          <Badge variant="secondary">View-only for your role</Badge>
        )}
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Filter by name, ID, phone, or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="rounded-xl border border-border/70 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Gender</TableHead>
                  <TableHead className="hidden sm:table-cell">Age</TableHead>
                  <TableHead className="hidden lg:table-cell">Medical aid</TableHead>
                  <TableHead className="text-right">Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">
                      No patients match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.id}</TableCell>
                      <TableCell className="font-medium">{p.fullName}</TableCell>
                      <TableCell className="hidden md:table-cell">{p.gender}</TableCell>
                      <TableCell className="hidden sm:table-cell">{p.age}</TableCell>
                      <TableCell className="hidden lg:table-cell">{p.medicalAid}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/patients/${p.id}`}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
