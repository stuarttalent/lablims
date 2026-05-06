"use client";

import { useData } from "@/contexts/data-context";
import { useAuth } from "@/contexts/auth-context";
import { canCreatePatient } from "@/lib/permissions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { differenceInYears, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoDisclaimer } from "@/components/demo/demo-disclaimer";
import Link from "next/link";

export default function NewPatientPage() {
  const { addPatient } = useData();
  const { user } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Female");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [referringDoctor, setReferringDoctor] = useState("");
  const [medicalAid, setMedicalAid] = useState("Self-pay");

  if (!user || !canCreatePatient(user.role)) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Your role cannot register patients in this demo.
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/patients">Back</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function submit() {
    if (!fullName.trim() || !dob) {
      toast.error("Please provide at least full name and date of birth.");
      return;
    }
    let age = 0;
    try {
      age = differenceInYears(new Date(), parseISO(dob));
    } catch {
      toast.error("Invalid date of birth.");
      return;
    }
    const p = addPatient({
      fullName: fullName.trim(),
      dateOfBirth: dob,
      age,
      gender,
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      referringDoctor: referringDoctor.trim(),
      medicalAid: medicalAid.trim(),
    });
    toast.success("Patient saved locally (demo).");
    router.push(`/patients/${p.id}`);
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Register patient</h1>
        <p className="text-sm text-muted-foreground">
          Information is stored only in this browser for the demo.
        </p>
      </div>
      <DemoDisclaimer variant="compact" />

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Demographics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="fn">Full name</Label>
            <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={gender}
              onValueChange={(v) => setGender(v ?? "Female")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="addr">Address</Label>
            <Textarea id="addr" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ref">Referring doctor</Label>
            <Input
              id="ref"
              value={referringDoctor}
              onChange={(e) => setReferringDoctor(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aid">Medical aid / scheme</Label>
            <Input id="aid" value={medicalAid} onChange={(e) => setMedicalAid(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={submit}>Save patient</Button>
        <Button variant="outline" asChild>
          <Link href="/patients">Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
