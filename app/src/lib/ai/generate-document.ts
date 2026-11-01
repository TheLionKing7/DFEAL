import { buildFirmSystemPrompt } from "@/lib/firms/prompt";
import type { FirmProfile } from "@/lib/firms/types";
import { llmComplete } from "@/lib/ai/complete";
import { saveDocument } from "@/lib/db/documents";
import { getFilledTemplate } from "@/lib/documents/template-loader";
import { sanitizeMarkdownOutput } from "@/lib/export/markdown";
import { getDocumentTypeLabel, type DocumentType } from "@/shared/document-types";
import type { Opportunity } from "@/shared/types/opportunity";

const MAX_TOKENS: Record<DocumentType, number> = {
  capability_statement: 8000,
  contract_proposal: 7500,
  rfi_response: 5000,
  sources_sought_response: 5000,
  cta_proposal: 4500,
};

function draftingRules(firm: FirmProfile) {
  const name = firm.shortName;
  return [
  `Write as a senior federal proposal specialist for ${firm.legalName} — human, precise, compliance-aware, persuasive.`,
  "Follow the TEMPLATE STRUCTURE exactly: use the same section headings and order.",
  `Populate EVERY section with REAL ${name} company data from the profile — never use placeholders, brackets, or [Insert ...] text. If a fact is not in the profile, omit it rather than inventing it.`,
  "Tailor win themes, technical approach, and past performance to this specific opportunity and agency mission.",
  "Mirror the tone, depth, and structure of professional federal capability statements, RFI responses, sources-sought responses, and proposals.",
  "",
  "OUTPUT FORMAT — write clean, submission-ready prose. Only these structures are allowed:",
  "- Use `# Document Title` once, as the very first line",
  "- Use `## Section Heading` for major sections (e.g. ## Executive Summary)",
  "- Use `### Subsection` for sub-headings within a section",
  "- Use `-` bullets for short non-ordered lists",
  "- Use `1.` numbered lists only for ordered steps or explicit lists",
  "- Write full, professional paragraphs everywhere else",
  "",
  "DO NOT use any other markdown syntax:",
  "- No **bold**, *italic*, or `code` (write plain words)",
  "- No > blockquotes, no ``` code fences, no --- or *** dividers",
  "- No pipe tables (write 'Field: value' on its own line instead)",
  "- No meta commentary, no 'Here is the document', no JSON",
  "",
  "SUBSTANCE RULES:",
  "- For Capability Statement: deliver one cohesive document covering cover letter through management plan with agency-specific win themes",
  "- For Contract Proposal: follow Volumes I-IV structure with technical depth",
  "- For RFI Response: directly answer each implied question from the solicitation",
  "- For Sources Sought: emphasize capability, past performance, and socioeconomic status",
  `- For CTA Proposal: clearly define ${name}'s proposed role and contribution to the team`,
  `- Reference specific ${name} past performance contracts by name and agency (only those listed in the profile)`,
  "- Show deep understanding of the agency's mission and procurement objectives",
  "- Include UEI, CAGE, NAICS, certifications, and contact block where the template specifies",
  ].join("\n");
}

export async function generateProposalDocument(input: {
  opp: Opportunity;
  firm: FirmProfile;
  documentType: DocumentType;
  userEmail: string;
  analysisSummary?: string;
}) {
  const { opp, firm, documentType, userEmail, analysisSummary } = input;
  const templateOutline = getFilledTemplate(documentType, opp, firm);
  const label = getDocumentTypeLabel(documentType);

  // Build a structured context block from opportunity data
  const oppContext = [
    "---",
    "OPPORTUNITY CONTEXT",
    `Title: ${opp.title}`,
    `Agency: ${opp.agency_name ?? "TBD"}`,
    `Notice #: ${opp.external_id}`,
    `Notice type: ${opp.notice_type}`,
    `NAICS: ${opp.naics ?? firm.primaryNaics}`,
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
    `Draft a complete, submission-ready ${label} for ${firm.legalName}.`,
    "",
    "=== TEMPLATE STRUCTURE (follow this outline and maintain these headings) ===",
    templateOutline,
    "",
    oppContext,
    "",
    "=== DRAFTING RULES ===",
    draftingRules(firm),
    "",
    `Produce the full ${label} now. Begin directly with the document title.`,
  ]
    .filter(Boolean)
    .join("\n");

  const { text, provider } = await llmComplete({
    system: buildFirmSystemPrompt(firm),
    userPrompt,
    maxTokens: MAX_TOKENS[documentType],
  });

  // Strip any residual markdown jargon (code fences, blockquotes, dividers)
  // so the stored document reads as clean, professional prose.
  const content = sanitizeMarkdownOutput(text).trim();

  const title = `${label} — ${opp.title.slice(0, 80)}`;

  const doc = await saveDocument({
    firm_id: firm.id,
    opportunity_id: opp.id,
    document_type: documentType,
    title,
    content_text: content,
    provider,
    created_by: userEmail,
  });

  return { document: doc, provider };
}
