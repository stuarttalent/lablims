import {
  heuristicDeltaSentence,
  type PriorResultHit,
} from "@/lib/prior-results";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function openAiDelta(
  testName: string,
  current: { value: string; flag?: string },
  prior: PriorResultHit,
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const userJson = JSON.stringify({
    testName,
    current,
    prior: {
      orderId: prior.orderId,
      collectionDate: prior.collectionDate,
      value: prior.line.resultValue,
      flag: prior.line.flag,
    },
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.15,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: `You write one short sentence (max 22 words) comparing current vs prior laboratory results for the SAME test on the SAME patient (different accession).
Rules: describe stable vs change direction only; NO diagnosis or clinical advice; no new medical claims; end with period.
Use phrases like "stable vs prior", "higher than prior", "lower than prior", or "differs from prior" when appropriate.
Output plain text only — no quotes, no JSON.`,
        },
        { role: "user", content: userJson },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text ? `${text} Trend context only — not a diagnosis.` : null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      testName?: string;
      current?: { value: string; flag?: string };
      prior?: PriorResultHit;
    };
    if (!body.testName || !body.current || !body.prior) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    let source: "openai" | "heuristic" = "heuristic";
    let sentence = heuristicDeltaSentence(body.testName, body.current, body.prior);

    try {
      const ai = await openAiDelta(body.testName, body.current, body.prior);
      if (ai) {
        sentence = ai;
        source = "openai";
      }
    } catch (e) {
      console.warn("result-delta AI fallback:", e);
    }

    return NextResponse.json({ sentence, source });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
