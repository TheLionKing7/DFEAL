import { buildDfealSystemPrompt, DFEAL_PROFILE } from "@/config/dfeal-profile";
import { llmComplete } from "@/lib/ai/complete";
import { saveDocument } from "@/lib/db/documents";
import type { DocumentType } from "@/shared/opportunity-lanes";
import type { Opportunity } from "@/shared/types/opportunity";

const SECTION_GUIDANCE: Record<DocumentType, string> = {
  executive_summary:
    "Write a compelling executive summary (1 page) as a senior capture specialist would. Lead with win themes and DFEAL differentiators. Use ## section headings.",
  technical_approach:
    "Write a technical approach section aligned to the SOW/PWS. Use ## and ### headings, numbered methodology steps, and clear deliverables language.",
  past_performance:
    "Write a past performance narrative citing DFEAL certifications and relevant NAICS experience. Include contract-style references and measurable outcomes.",
  management_plan:
    "Write a project management plan with staffing, QA, risk mitigation, and communication cadence. Use professional proposal tone with structured headings.",
  cover_letter:
    "Write a formal cover letter to the contracting officer. Business letter format with date block, salutation, body paragraphs, and professional close.",
};

const FORMAT_RULES = [
  "Write as a human federal proposal specialist — not generic AI filler.",
  "Use clear markdown: # title, ## sections, ### subsections, bullet lists where appropriate.",
  "Use active voice, specific agency/solicitation references, and compliance-aware language.",
  "Avoid placeholders like [Company Name] — use DFEAL legal name and real profile details.",
  "Target 800–1500 words unless the section type clearly needs less.",
].join("\n");

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
    "",
    "Formatting requirements:",
    FORMAT_RULES,
    "",
    "Output markdown only — no JSON wrapper, no code fences.",
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
