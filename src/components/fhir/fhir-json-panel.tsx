"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function FhirJsonPanel({
  title,
  data,
}: {
  title: string;
  data: unknown;
}) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("FHIR JSON copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy.");
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 bg-muted/40">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1" onClick={copy}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          Copy JSON
        </Button>
      </div>
      <ScrollArea className="h-[min(420px,55vh)]">
        <pre className="p-3 text-[11px] leading-relaxed font-mono text-foreground/90 whitespace-pre-wrap break-all">
          {text}
        </pre>
      </ScrollArea>
    </div>
  );
}
