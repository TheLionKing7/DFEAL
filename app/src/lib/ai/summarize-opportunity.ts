import { buildFirmSystemPrompt } from "@/lib/firms/prompt";
import type { FirmProfile } from "@/lib/firms/types";
import { llmComplete } from "@/lib/ai/complete";
import { parseJsonFromLlm } from "@/lib/ai/parse-json";
import { enrichOpportunityDetails } from "@/lib/opportunity/enrich";
import { saveAnalysisRun } from "@/lib/db/analysis";
import type { Opportunity } from "@/shared/types/opportunity";

export interface OpportunityOverviewSummary {
  executive_summary: string;
  scope_of_work: string;
  key_requirements: string[];
  important_dates: string[];
  firm_fit: string;
  recommended_next_steps: string[];
  provider: string;
  run_id: string;
}

export async function summarizeOpportunityOverview(
  opp: Opportunity,
  firm: FirmProfile,
  userEmail?: string,
): Promise<OpportunityOverviewSummary> {
  const details = enrichOpportunityDetails(opp);

  const userPrompt = [
    `Produce an opportunity overview for the ${firm.shortName} capture team.`,
    "Return ONLY JSON with keys:",
    "executive_summary (2-3 sentences), scope_of_work (paragraph),",
    "key_requirements (string[]), important_dates (string[]),",
    "firm_fit (paragraph on NAICS/certs/set-aside fit for this firm), recommended_next_steps (string[]).",
    "",
    `Title: ${opp.title}`,
    `Agency: ${opp.agency_name ?? "TBD"}`,
    `Source: ${opp.source} · NAICS: ${opp.naics ?? "TBD"} · Set-aside: ${opp.set_aside ?? "TBD"}`,
    `Posted: ${opp.posted_date ?? "TBD"} · Response due: ${opp.response_deadline ?? "TBD"}`,
    details.placeLabel ? `Place of performance: ${details.placeLabel}` : "",
    details.department ? `Department path: ${details.department}` : "",
    "",
    "Description:",
    details.description?.slice(0, 5000) ?? details.synopsis ?? "(limited description in feed)",
    "",
    `Assess fit for ${firm.legalName} using its NAICS focus, certifications, and set-aside eligibility.`,
  ]
    .filter(Boolean)
    .join("\n");

  const { text, provider } = await llmComplete({
    system: buildFirmSystemPrompt(firm),
    userPrompt,
    maxTokens: 2000,
  });

  const parsed = parseJsonFromLlm(text);

  const run = await saveAnalysisRun({
    firm_id: firm.id,
    opportunity_id: opp.id,
    user_email: userEmail,
    provider,
    fit_score: 0,
    go_no_go: "review",
    result_json: { ...parsed, kind: "overview_summary" },
  });

  return {
    executive_summary: String(parsed.executive_summary ?? ""),
    scope_of_work: String(parsed.scope_of_work ?? ""),
    key_requirements: Array.isArray(parsed.key_requirements)
      ? parsed.key_requirements.map(String)
      : [],
    important_dates: Array.isArray(parsed.important_dates)
      ? parsed.important_dates.map(String)
      : [],
    firm_fit: String(parsed.firm_fit ?? parsed.dfeal_fit ?? ""),
    recommended_next_steps: Array.isArray(parsed.recommended_next_steps)
      ? parsed.recommended_next_steps.map(String)
      : [],
    provider,
    run_id: run.id,
  };
}
