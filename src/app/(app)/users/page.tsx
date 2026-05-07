"use client";

import { MOCK_USERS } from "@/data/mock-users";
import { ROLE_LABELS } from "@/lib/permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsersPage() {
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User management</h1>
        <p className="text-sm text-muted-foreground">
          Static roster aligned with the login screen — no CRUD or password flows.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Directory</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_USERS.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="font-mono text-xs">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ROLE_LABELS[u.role]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
