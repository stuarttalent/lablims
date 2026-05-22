import {
  buildHeuristicCumulativeComment,
  type CumulativeAiInput,
} from "@/lib/cumulative-ai-comment";
import { EDLIZ_LAB_CONTEXT, EDLIZ_PDF_URL } from "@/lib/ai/edliz-knowledge";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function openAiCumulativeComment(
  input: CumulativeAiInput,
): Promise<string | null> {
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
      max_tokens: 650,
      messages: [
        {
          role: "system",
          content: `You are a clinical laboratory specialist in Zimbabwe writing a cumulative (longitudinal) interpretive comment.

${EDLIZ_LAB_CONTEXT}

Reference: ${EDLIZ_PDF_URL}

Rules:
- Use only the JSON provided: same test run repeated on multiple dates for one patient.
- For each parameter, state progression (worsening), regression (improvement), or no meaningful change.
- Suggest further tests aligned with EDLIZ when trends imply metabolic, infectious, or cardiovascular follow-up.
- Mention clinical considerations (consider/likely/consistent_with) — not definitive diagnosis.
- 2–4 short paragraphs plain text, then a bullet list "Suggested further investigations:" if applicable.
- End with a brief disclaimer that clinical correlation is required.`,
        },
        {
          role: "user",
          content: `Write a cumulative EDLIZ-informed trend comment from this JSON:\n${JSON.stringify(input, null, 2)}`,
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
  return data.choices?.[0]?.message?.content?.trim() || null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CumulativeAiInput;
    if (!body?.parameters || !Array.isArray(body.parameters)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    let source: "openai" | "heuristic" = "heuristic";
    let comment = buildHeuristicCumulativeComment(body);

    try {
      const ai = await openAiCumulativeComment(body);
      if (ai) {
        comment = ai;
        source = "openai";
      }
    } catch (e) {
      console.warn("Cumulative AI comment falling back to heuristic:", e);
      comment = buildHeuristicCumulativeComment(body);
      source = "heuristic";
    }

    return NextResponse.json({ comment, source });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate comment" },
      { status: 500 },
    );
  }
}
