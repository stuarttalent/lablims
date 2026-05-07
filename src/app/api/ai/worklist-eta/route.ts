import {
  buildHeuristicWorklistPredictions,
  enrichOrdersForEtaApi,
  parsePunctualityToken,
  type WorklistEtaPrediction,
} from "@/lib/worklist-eta";
import type { LabOrder } from "@/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AiNoteRow = {
  orderId: string;
  note?: string;
  punctuality?: string;
  punctualityDetail?: string;
};

type NotesPayload = { notes?: AiNoteRow[] };

async function openAiNotes(
  payload: string,
): Promise<AiNoteRow[] | null> {
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
      max_tokens: 1600,
      messages: [
        {
          role: "system",
          content: `You assist laboratory operations.

For each order in the user JSON you must output:
- note: one concise sentence (max 28 words) explaining the ETA — reference controlling test / TAT when helpful. Do NOT contradict computedReadyIso.
- punctuality: exactly one of "on_time", "warning", "late" — based on comparing currentTimeIso to computedReadyIso AND order status/priority (STAT may warrant "warning" if tight). "late" if clearly past due; "warning" if within roughly 2 hours of deadline or risky; otherwise "on_time".
- punctualityDetail: one short sentence (max 22 words) explaining the punctuality call for bench staff.

Output ONLY valid JSON: {"notes":[{"orderId":"string","note":"string","punctuality":"on_time|warning|late","punctualityDetail":"string"}]} — one entry per order.`,
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
      {
        currentTimeIso: new Date().toISOString(),
        orders: enriched.orders.map((o, i) => ({
          ...o,
          computedReadyIso: enriched.baselines[i]?.readyIso,
          controllingTest: enriched.baselines[i]?.controllingTest,
          catalogueHoursNominal: enriched.baselines[i]?.catalogueHoursRaw,
          hoursAfterPriority: enriched.baselines[i]?.hoursAfterPriority,
        })),
      },
      null,
      2,
    );

    let source: "openai" | "heuristic" = "heuristic";
    let predictions: WorklistEtaPrediction[] = heuristic;

    try {
      const aiNotes = await openAiNotes(userPayload);
      if (aiNotes?.length) {
        const rowById = new Map(aiNotes.map((n) => [n.orderId, n]));
        predictions = heuristic.map((h) => {
          const ai = rowById.get(h.orderId);
          if (!ai) return h;
          const punc = parsePunctualityToken(ai.punctuality);
          return {
            ...h,
            note: ai.note?.trim() || h.note,
            punctualityAi: punc,
            punctualityAiDetail: ai.punctualityDetail?.trim() || null,
          };
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
