import { heuristicPreAuthSummary } from "@/lib/pre-auth-checklist";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function openAiPreAuthSummary(
  issues: string[],
  context: { orderId: string; testId?: string; testName?: string },
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
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `Laboratory QA assistant. The user sends a JSON object with "issues": string[] from deterministic rules (missing fields, flags, sibling line states) before result authorization.
Write 2–4 sentences as a concise staff briefing: restate what's incomplete or risky, tone professional, no blame. If issues is empty, confirm the rule pass in one sentence.
Do not invent issues not in the list. No diagnosis. Plain text only.`,
        },
        {
          role: "user",
          content: JSON.stringify({ ...context, issues }),
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
    const body = (await req.json()) as {
      issues?: string[];
      orderId?: string;
      testId?: string;
      testName?: string;
    };
    if (!Array.isArray(body.issues) || !body.orderId) {
      return NextResponse.json({ error: "issues[] and orderId required" }, { status: 400 });
    }

    const rulesSummary = heuristicPreAuthSummary(body.issues);
    let source: "openai" | "heuristic" = "heuristic";
    let summary = rulesSummary;

    try {
      const ai = await openAiPreAuthSummary(body.issues, {
        orderId: body.orderId,
        testId: body.testId,
        testName: body.testName,
      });
      if (ai) {
        summary = ai;
        source = "openai";
      }
    } catch (e) {
      console.warn("pre-auth AI fallback:", e);
    }

    return NextResponse.json({ summary, rulesSummary, source });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
