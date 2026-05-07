import {
  buildShiftSummaryStats,
  heuristicShiftNarrative,
  type ShiftSummaryStats,
} from "@/lib/shift-summary-stats";
import type { DemoStore } from "@/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function openAiShift(stats: ShiftSummaryStats): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.25,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content: `You write a short laboratory shift / workload briefing for supervisors (3–5 sentences).
Use ONLY the numeric facts in the JSON. Mention STAT load, versus-ETA buckets (on track / warning / late), authorization queue depth, and top departmental backlogs when present.
Tone: operational, calm, actionable. Do not invent numbers. No patient identities.`,
        },
        {
          role: "user",
          content: JSON.stringify(stats),
        },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { store?: DemoStore };
    const store = body.store;
    if (!store?.orders) {
      return NextResponse.json({ error: "store required" }, { status: 400 });
    }

    const stats = buildShiftSummaryStats(store);
    const heuristic = heuristicShiftNarrative(stats);
    let source: "openai" | "heuristic" = "heuristic";
    let narrative = heuristic;

    try {
      const ai = await openAiShift(stats);
      if (ai) {
        narrative = ai;
        source = "openai";
      }
    } catch (e) {
      console.warn("shift-summary AI fallback:", e);
    }

    return NextResponse.json({ narrative, stats, heuristic, source });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
