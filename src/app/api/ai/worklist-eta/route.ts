import {
  buildHeuristicWorklistPredictions,
  enrichOrdersForEtaApi,
  type WorklistEtaPrediction,
} from "@/lib/worklist-eta";
import type { LabOrder } from "@/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type NotesPayload = { notes?: { orderId: string; note: string }[] };

async function openAiNotes(
  payload: string,
): Promise<{ orderId: string; note: string }[] | null> {
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
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content: `You assist laboratory operations. Staff already computed each order's expected result-ready time (readyIso) from catalogue turnaround times: the longest single test TAT in the panel (parallel workflow), scaled for priority (STAT faster, Urgent somewhat faster).
Write one concise sentence per order (max 28 words) explaining that ETA for bench staff — reference the controlling test or longest TAT when helpful. Do NOT invent different times; do NOT contradict readyIso.
Output ONLY valid JSON: {"notes":[{"orderId":"string","note":"string"}]} with exactly one entry per order in the user message.`,
        },
        {
          role: "user",
          content: payload,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) return null;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as NotesPayload;
    return Array.isArray(parsed.notes) ? parsed.notes : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { orders?: LabOrder[] };
    const orders = body.orders;
    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: "orders[] required" }, { status: 400 });
    }

    const enriched = enrichOrdersForEtaApi(orders);
    if (!enriched) {
      return NextResponse.json({
        predictions: [] as WorklistEtaPrediction[],
        source: "heuristic" as const,
      });
    }

    const heuristic = buildHeuristicWorklistPredictions(orders);

    const userPayload = JSON.stringify(
      enriched.orders.map((o, i) => ({
        ...o,
        computedReadyIso: enriched.baselines[i]?.readyIso,
        controllingTest: enriched.baselines[i]?.controllingTest,
        catalogueHoursNominal: enriched.baselines[i]?.catalogueHoursRaw,
        hoursAfterPriority: enriched.baselines[i]?.hoursAfterPriority,
      })),
      null,
      2,
    );

    let source: "openai" | "heuristic" = "heuristic";
    let predictions: WorklistEtaPrediction[] = heuristic;

    try {
      const aiNotes = await openAiNotes(userPayload);
      if (aiNotes?.length) {
        const noteById = new Map(aiNotes.map((n) => [n.orderId, n.note]));
        predictions = heuristic.map((h) => {
          const ai = noteById.get(h.orderId);
          return ai?.trim()
            ? { ...h, note: ai.trim() }
            : h;
        });
        source = "openai";
      }
    } catch (e) {
      console.warn("worklist ETA AI notes fallback:", e);
      predictions = heuristic;
      source = "heuristic";
    }

    return NextResponse.json({ predictions, source });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
