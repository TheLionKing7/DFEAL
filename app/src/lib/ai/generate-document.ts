import { buildDfealSystemPrompt, DFEAL_PROFILE } from "@/config/dfeal-profile";
import { llmComplete } from "@/lib/ai/complete";
import { saveDocument } from "@/lib/db/documents";
import { getFilledTemplate } from "@/lib/documents/template-loader";
import { getDocumentTypeLabel, type DocumentType } from "@/shared/document-types";
import type { Opportunity } from "@/shared/types/opportunity";

const MAX_TOKENS: Record<DocumentType, number> = {
  capability_statement: 8000,
  contract_proposal: 7500,
  rfi_response: 5000,
  sources_sought_response: 5000,
  cta_proposal: 4500,
};

const DRAFTING_RULES = [
  "Write as a senior federal proposal specialist for DFEAL LLC — human, precise, compliance-aware, persuasive.",
  "Follow the TEMPLATE STRUCTURE exactly: use the same section headings and order.",
  "Populate EVERY section with REAL DFEAL company data from the profile — never use placeholders, brackets, or [Insert ...] text.",
  "Tailor win themes, technical approach, and past performance to this specific opportunity and agency mission.",
  "",
  "FORMATTING RULES (critical for PDF/DOCX output):",
  "- Use `# Document Title` for the main title on page 1",
  "- Use `## Major Section` for primary section headings (e.g. ## 1. Executive Summary)",
  "- Use `### Subsection` for sub-headings within sections",
  "- Use pipe tables for structured data like contact info, NAICS codes, past performance summaries:",
  "  | Field | Value |",
  "  |-------|-------|",
  "  | Name | DFEAL LLC |",
  "- Use bullet lists with `-` for non-ordered items",
  "- Use `---` as horizontal dividers between major sections",
  "- Write in full paragraphs with professional justification-friendly prose",
  "- Include UEI, CAGE, NAICS, certifications, and contact block where the template specifies",
  "",
  "SUBSTANCE RULES:",
  "- For Capability Statement: deliver one cohesive document covering cover letter through management plan with agency-specific win themes",
  "- For Contract Proposal: follow Volumes I-IV structure with technical depth",
  "- For RFI Response: directly answer each implied question from the solicitation",
  "- For Sources Sought: emphasize capability, past performance, and socioeconomic status",
  "- For CTA Proposal: clearly define DFEAL's proposed role and contribution to the team",
  "- Reference specific DFEAL past performance contracts by name and agency",
  "- Show deep understanding of the agency's mission and procurement objectives",
  "",
  "Output markdown only — no JSON, no code fences, no meta commentary, no 'Here is the document' preamble.",
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

  // Build a structured context block from opportunity data
  const oppContext = [
    "---",
    "OPPORTUNITY CONTEXT",
    `Title: ${opp.title}`,
    `Agency: ${opp.agency_name ?? "TBD"}`,
    `Notice #: ${opp.external_id}`,
    `Notice type: ${opp.notice_type}`,
    `NAICS: ${opp.naics ?? DFEAL_PROFILE.primaryNaics}`,
    `PSC: ${opp.psc ?? "N/A"}`,
    `Set-aside: ${opp.set_aside ?? "Unrestricted"}`,
    `Est. value: ${opp.estimated_value_usd ? `$${opp.estimated_value_usd.toLocaleString()}` : "Not specified"}`,
    `Response deadline: ${opp.response_deadline ?? "TBD"}`,
    `Place of performance: ${
      opp.place_of_performance
        ? [opp.place_of_performance.city, opp.place_of_performance.state]
            .filter(Boolean)
            .join(", ")
        : "Not specified"
    }`,
    `Source: ${opp.source}`,
    `Status: ${opp.status}`,
    analysisSummary ? `\nCAPTURE ANALYSIS INPUT:\n${analysisSummary}` : "",
    "",
    "SOLICITATION DESCRIPTION:",
    opp.description?.slice(0, 5000) ?? "(No description available — use agency and title context)",
    "",
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = [
    `Draft a complete, submission-ready ${label} for ${DFEAL_PROFILE.legalName}.`,
    "",
    "=== TEMPLATE STRUCTURE (follow this outline and maintain these headings) ===",
    templateOutline,
    "",
    oppContext,
    "",
    "=== DRAFTING RULES ===",
    DRAFTING_RULES,
    "",
    `Produce the full ${label} now. Begin directly with the document title.`,
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
