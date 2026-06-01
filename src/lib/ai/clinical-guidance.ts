import {
  buildHeuristicResultComment,
  type AiCommentInput,
} from "@/lib/ai-result-comment";
import {
  applyEdlizLabRules,
  buildEdlizGuidelineReferences,
  EDLIZ_LAB_CONTEXT,
  EDLIZ_PDF_URL,
} from "@/lib/ai/edliz-knowledge";
import type {
  ClinicalGuidance,
  GuidanceSource,
} from "@/lib/ai/clinical-guidance-types";
import {
  CLINICAL_GUIDANCE_DISCLAIMER,
  EDLIZ_SOURCE_LABEL,
} from "@/lib/ai/clinical-guidance-types";
import {
  AI_RESULT_COMMENT_MAX_WORDS,
  truncateToWords,
} from "@/lib/truncate-words";

const CERTAINTY_LABEL = {
  consider: "Consider",
  likely: "Likely",
  consistent_with: "Consistent with",
} as const;

function mergeGuidance(
  base: ClinicalGuidance,
  patch: Partial<ClinicalGuidance>,
): ClinicalGuidance {
  return {
    narrative: patch.narrative ?? base.narrative,
    impressions: patch.impressions?.length ? patch.impressions : base.impressions,
    suggestedFurtherTests: patch.suggestedFurtherTests?.length
      ? patch.suggestedFurtherTests
      : base.suggestedFurtherTests,
    guidelineReferences: patch.guidelineReferences?.length
      ? patch.guidelineReferences
      : base.guidelineReferences,
    disclaimer: patch.disclaimer ?? base.disclaimer,
  };
}

function buildFromRules(input: AiCommentInput): ClinicalGuidance {
  const { impressions, suggestedFurtherTests, sections } = applyEdlizLabRules(input);
  const narrative = buildHeuristicResultComment(input);
  return {
    narrative,
    impressions,
    suggestedFurtherTests,
    guidelineReferences: buildEdlizGuidelineReferences(sections),
    disclaimer: CLINICAL_GUIDANCE_DISCLAIMER,
  };
}

async function openAiClinicalGuidance(
  input: AiCommentInput,
  rulesBaseline: ClinicalGuidance,
): Promise<ClinicalGuidance | null> {
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
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a clinical laboratory specialist in Zimbabwe. Produce structured decision-support from laboratory results using EDLIZ 2015 (Essential Medicines List & Standard Treatment Guidelines).

${EDLIZ_LAB_CONTEXT}

Reference document: ${EDLIZ_PDF_URL}

Return JSON only:
{
  "narrative": "Plain text interpretive summary (max 100 words total for entire report comment)",
  "impressions": [{"label":"","certainty":"consider|likely|consistent_with","rationale":"","edlizSection":""}],
  "suggestedFurtherTests": [{"testName":"","reason":"","priority":"routine|urgent|if_clinically_indicated","edlizSection":""}],
  "guidelineReferences": [{"source":"EDLIZ 2015 (Zimbabwe)","section":"","excerpt":""}]
}

Rules:
- Use ONLY facts from input JSON and EDLIZ excerpts above.
- suggestedFurtherTests: concrete lab tests not already in results.
- impressions: clinical pictures with appropriate certainty — never state definitive diagnosis.
- Align with rule-based suggestions when provided in user message.
- The entire narrative must not exceed 100 words.`,
        },
        {
          role: "user",
          content: `Laboratory JSON:\n${JSON.stringify(input, null, 2)}\n\nRule-based baseline (merge/improve):\n${JSON.stringify({
            impressions: rulesBaseline.impressions,
            suggestedFurtherTests: rulesBaseline.suggestedFurtherTests,
            guidelineReferences: rulesBaseline.guidelineReferences,
          }, null, 2)}`,
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
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;

  const parsed = JSON.parse(raw) as Partial<ClinicalGuidance>;
  return mergeGuidance(rulesBaseline, {
    narrative: typeof parsed.narrative === "string" ? parsed.narrative : undefined,
    impressions: Array.isArray(parsed.impressions) ? parsed.impressions : undefined,
    suggestedFurtherTests: Array.isArray(parsed.suggestedFurtherTests)
      ? parsed.suggestedFurtherTests
      : undefined,
    guidelineReferences: Array.isArray(parsed.guidelineReferences)
      ? parsed.guidelineReferences
      : undefined,
  });
}

export async function produceClinicalGuidance(
  input: AiCommentInput,
): Promise<{ guidance: ClinicalGuidance; source: GuidanceSource }> {
  const rulesBaseline = buildFromRules(input);
  let source: GuidanceSource = "edliz_rules";
  let guidance = rulesBaseline;

  try {
    const ai = await openAiClinicalGuidance(input, rulesBaseline);
    if (ai) {
      guidance = ai;
      source = "openai";
    }
  } catch (e) {
    console.warn("Clinical guidance falling back to EDLIZ rules:", e);
  }

  return { guidance, source };
}

/** Plain-text block for result slip / textarea. */
export function formatGuidanceForSlip(guidance: ClinicalGuidance): string {
  const parts: string[] = [guidance.narrative.trim()];

  if (guidance.impressions.length > 0) {
    parts.push(
      "Clinical considerations (EDLIZ-informed):",
      ...guidance.impressions.map(
        (i) =>
          `• ${CERTAINTY_LABEL[i.certainty] ?? i.certainty}: ${i.label} — ${i.rationale}${i.edlizSection ? ` [${i.edlizSection}]` : ""}`,
      ),
    );
  }

  if (guidance.suggestedFurtherTests.length > 0) {
    parts.push(
      "Suggested further investigations:",
      ...guidance.suggestedFurtherTests.map(
        (t) =>
          `• ${t.testName} (${t.priority.replace(/_/g, " ")}): ${t.reason}`,
      ),
    );
  }

  if (guidance.guidelineReferences.length > 0) {
    parts.push(
      `Guidelines: ${EDLIZ_SOURCE_LABEL}.`,
      ...guidance.guidelineReferences.map((r) => `• ${r.section}: ${r.excerpt}`),
    );
  }

  parts.push(guidance.disclaimer);
  return truncateToWords(parts.join("\n\n"), AI_RESULT_COMMENT_MAX_WORDS);
}
