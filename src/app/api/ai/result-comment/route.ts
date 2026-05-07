import {
  buildHeuristicResultComment,
  type AiCommentInput,
} from "@/lib/ai-result-comment";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function openAiNarrative(input: AiCommentInput): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const userPayload = JSON.stringify(input, null, 2);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.25,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `You are an expert clinical laboratory specialist writing a concise interpretive comment for clinicians.
Rules:
- Base the narrative only on the JSON facts provided (patient demographics, symptoms/notes, and laboratory results).
- Use professional laboratory language; 2–5 short paragraphs or bullet-style sentences.
- Flag abnormal or critical results explicitly; do not invent diagnoses.
- Mention relevant demographics when interpreting reference ranges.
- End with a clear disclaimer that correlation with clinical findings is required.
Do not output markdown code fences. Plain text only.`,
        },
        {
          role: "user",
          content: `Produce an overall laboratory comment from this JSON:\n${userPayload}`,
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
  return text || null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AiCommentInput;
    if (!body || !Array.isArray(body.results)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    let source: "openai" | "heuristic" = "heuristic";
    let comment = buildHeuristicResultComment(body);

    try {
      const ai = await openAiNarrative(body);
      if (ai) {
        comment = ai;
        source = "openai";
      }
    } catch (e) {
      console.warn("AI comment falling back to heuristic:", e);
      comment = buildHeuristicResultComment(body);
      source = "heuristic";
    }

    return NextResponse.json({ comment, source });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
