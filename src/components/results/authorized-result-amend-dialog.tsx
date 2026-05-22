"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export function AuthorizedResultAmendDialog({
  open,
  testName,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  testName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  function handleConfirm() {
    const trimmed = reason.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    setReason("");
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) setReason("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Amend authorized result</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{testName}</span> is already
            authorized. Laboratory scientists and higher ranks must document why this
            result is being changed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="amend-reason">Reason for amendment</Label>
          <Textarea
            id="amend-reason"
            rows={4}
            placeholder="e.g. Transcription error corrected after QC review; repeat analysis on diluted sample…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!reason.trim()} onClick={handleConfirm}>
            Confirm amendment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
