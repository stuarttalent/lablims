import type { AiCommentInput } from "@/lib/ai-result-comment";
import {
  formatGuidanceForSlip,
  produceClinicalGuidance,
} from "@/lib/ai/clinical-guidance";
import {
  AI_RESULT_COMMENT_MAX_WORDS,
  truncateToWords,
} from "@/lib/truncate-words";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AiCommentInput;
    if (!body || !Array.isArray(body.results)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { guidance, source } = await produceClinicalGuidance(body);
    const comment = truncateToWords(
      formatGuidanceForSlip(guidance),
      AI_RESULT_COMMENT_MAX_WORDS,
    );

    return NextResponse.json({
      comment,
      guidance,
      source,
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
