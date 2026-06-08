import { buildDfealSystemPrompt, DFEAL_PROFILE } from "@/config/dfeal-profile";
import { llmComplete } from "@/lib/ai/complete";
import { parseJsonFromLlm } from "@/lib/ai/parse-json";
import { saveAnalysisRun } from "@/lib/db/analysis";
import { scoreOpportunity } from "@/lib/scoring/score-opportunity";
import type { Opportunity } from "@/shared/types/opportunity";

export interface OpportunityAnalysis {
  fit_score: number;
  go_no_go: "go" | "no_go" | "review";
  summary: string;
  strengths: string[];
  risks: string[];
  recommended_actions: string[];
  teaming_notes: string;
  provider: string;
  run_id: string;
}

function normalizeGoNoGo(value: unknown): "go" | "no_go" | "review" {
  const v = String(value ?? "review").toLowerCase();
  if (v === "go" || v === "no_go") return v;
  return "review";
}

export async function analyzeOpportunityWithAi(
  opp: Opportunity,
  userEmail?: string,
): Promise<OpportunityAnalysis> {
  const ruleScore = scoreOpportunity(opp);
  const userPrompt = [
    "You are the DFEAL capture analyst. Evaluate this opportunity for bid/no-bid.",
    "Return ONLY valid JSON (no markdown) with keys:",
    "fit_score (0-100 number), go_no_go (go|no_go|review), summary (string),",
    "strengths (string[]), risks (string[]), recommended_actions (string[]), teaming_notes (string).",
    "",
    `Company: ${DFEAL_PROFILE.legalName} UEI ${DFEAL_PROFILE.uei}`,
    `Rule-based pre-score: ${ruleScore.fit_score} (${ruleScore.go_no_go}) — ${ruleScore.rationale}`,
    "",
    "Opportunity:",
    JSON.stringify(
      {
        title: opp.title,
        description: opp.description?.slice(0, 4000),
        agency: opp.agency_name,
        naics: opp.naics,
        set_aside: opp.set_aside,
        estimated_value_usd: opp.estimated_value_usd,
        response_deadline: opp.response_deadline,
        place_of_performance: opp.place_of_performance,
      },
      null,
      2,
    ),
  ].join("\n");

  const { text, provider } = await llmComplete({
    userPrompt: `${buildDfealSystemPrompt()}\n\n${userPrompt}`,
    maxTokens: 2500,
  });

  const parsed = parseJsonFromLlm(text);
  const fitScore = Number(parsed.fit_score ?? ruleScore.fit_score);
  const goNoGo = normalizeGoNoGo(parsed.go_no_go ?? ruleScore.go_no_go);

  const run = await saveAnalysisRun({
    opportunity_id: opp.id,
    user_email: userEmail,
    provider,
    fit_score: fitScore,
    go_no_go: goNoGo,
    result_json: parsed,
  });

  return {
    fit_score: fitScore,
    go_no_go: goNoGo,
    summary: String(parsed.summary ?? ruleScore.rationale),
    strengths: Array.isArray(parsed.strengths)
      ? parsed.strengths.map(String)
      : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : [],
    recommended_actions: Array.isArray(parsed.recommended_actions)
      ? parsed.recommended_actions.map(String)
      : [],
    teaming_notes: String(parsed.teaming_notes ?? ""),
    provider,
    run_id: run.id,
  };
}
