import { buildDfealSystemPrompt, DFEAL_PROFILE } from "@/config/dfeal-profile";
import { llmComplete } from "@/lib/ai/complete";
import { saveDocument } from "@/lib/db/documents";
import type { DocumentType } from "@/shared/opportunity-lanes";
import type { Opportunity } from "@/shared/types/opportunity";

const SECTION_GUIDANCE: Record<DocumentType, string> = {
  executive_summary:
    "Write a compelling executive summary for a federal proposal (1 page). Lead with DFEAL differentiators.",
  technical_approach:
    "Write a technical approach section aligned to the SOW/PWS. Use clear headings and actionable methodology.",
  past_performance:
    "Write a past performance narrative citing DFEAL certifications and relevant NAICS experience.",
  management_plan:
    "Write a project management plan with staffing, QA, risk mitigation, and communication cadence.",
  cover_letter:
    "Write a professional cover letter to the contracting officer for this opportunity.",
};

export async function generateProposalDocument(input: {
  opp: Opportunity;
  documentType: DocumentType;
  userEmail: string;
  analysisSummary?: string;
}) {
  const { opp, documentType, userEmail, analysisSummary } = input;
  const guidance = SECTION_GUIDANCE[documentType];

  const userPrompt = [
    guidance,
    "",
    `Opportunity: ${opp.title}`,
    `Agency: ${opp.agency_name ?? "TBD"}`,
    `NAICS: ${opp.naics ?? "TBD"} · Set-aside: ${opp.set_aside ?? "TBD"}`,
    `Response deadline: ${opp.response_deadline ?? "TBD"}`,
    analysisSummary ? `Capture analysis: ${analysisSummary}` : "",
    "",
    "Description excerpt:",
    opp.description?.slice(0, 3000) ?? "(No description available)",
    "",
    `Write in professional proposal voice for ${DFEAL_PROFILE.legalName}.`,
    "Output markdown only — no JSON wrapper.",
  ]
    .filter(Boolean)
    .join("\n");

  const { text, provider } = await llmComplete({
    userPrompt: `${buildDfealSystemPrompt()}\n\n${userPrompt}`,
    maxTokens: 3500,
  });

  const title = `${documentType.replace(/_/g, " ")} — ${opp.title.slice(0, 80)}`;
  const doc = await saveDocument({
    opportunity_id: opp.id,
    document_type: documentType,
    title,
    content_text: text.trim(),
    provider,
    created_by: userEmail,
  });

  return { document: doc, provider };
}
