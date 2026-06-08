import { buildDfealSystemPrompt, DFEAL_PROFILE } from "@/config/dfeal-profile";
import { llmComplete } from "@/lib/ai/complete";
import { saveDocument } from "@/lib/db/documents";
import { getFilledTemplate } from "@/lib/documents/template-loader";
import { getDocumentTypeLabel, type DocumentType } from "@/shared/document-types";
import type { Opportunity } from "@/shared/types/opportunity";

const MAX_TOKENS: Record<DocumentType, number> = {
  capability_statement: 6500,
  contract_proposal: 6000,
  rfi_response: 4000,
  sources_sought_response: 4000,
  cta_proposal: 3500,
};

const DRAFTING_RULES = [
  "Write as a senior federal proposal specialist for DFEAL LLC — human, precise, compliance-aware.",
  "Follow the TEMPLATE STRUCTURE exactly: use the same section headings and order.",
  "Populate every section with real DFEAL company data from the profile — never use placeholders.",
  "Tailor win themes, technical approach, and past performance to this specific opportunity.",
  "Use markdown: # document title, ## major sections, ### subsections, bullet lists.",
  "Include UEI, CAGE, NAICS, certifications, and contact block where the template specifies.",
  "For Capability Statement: deliver one cohesive document covering cover letter through management plan.",
  "Output markdown only — no JSON, no code fences, no meta commentary.",
].join("\n");

export async function generateProposalDocument(input: {
  opp: Opportunity;
  documentType: DocumentType;
  userEmail: string;
  analysisSummary?: string;
}) {
  const { opp, documentType, userEmail, analysisSummary } = input;
  const templateOutline = getFilledTemplate(documentType, opp);
  const label = getDocumentTypeLabel(documentType);

  const userPrompt = [
    `Draft a complete ${label} for ${DFEAL_PROFILE.legalName}.`,
    "",
    "TEMPLATE STRUCTURE (follow this outline and headings):",
    templateOutline,
    "",
    "---",
    "OPPORTUNITY CONTEXT",
    `Title: ${opp.title}`,
    `Agency: ${opp.agency_name ?? "TBD"}`,
    `Notice #: ${opp.external_id}`,
    `Notice type: ${opp.notice_type}`,
    `NAICS: ${opp.naics ?? DFEAL_PROFILE.primaryNaics}`,
    `Set-aside: ${opp.set_aside ?? "Unrestricted"}`,
    `Response deadline: ${opp.response_deadline ?? "TBD"}`,
    analysisSummary ? `Capture analysis: ${analysisSummary}` : "",
    "",
    "Solicitation excerpt:",
    opp.description?.slice(0, 4000) ?? "(No description available — use agency and title context)",
    "",
    "DRAFTING RULES:",
    DRAFTING_RULES,
    "",
    `Produce the full ${label} now.`,
  ]
    .filter(Boolean)
    .join("\n");

  const { text, provider } = await llmComplete({
    userPrompt: `${buildDfealSystemPrompt()}\n\n${userPrompt}`,
    maxTokens: MAX_TOKENS[documentType],
  });

  const title = `${label} — ${opp.title.slice(0, 80)}`;
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
