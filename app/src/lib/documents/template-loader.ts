import { readFileSync } from "fs";
import { join } from "path";
import { DFEAL_PROFILE } from "@/config/dfeal-profile";
import type { DocumentType } from "@/shared/document-types";
import type { Opportunity } from "@/shared/types/opportunity";

const TEMPLATE_FILES: Record<DocumentType, string> = {
  capability_statement: "capability-statement.md",
  rfi_response: "rfi-response.md",
  sources_sought_response: "sources-sought-response.md",
  cta_proposal: "cta-proposal.md",
  contract_proposal: "contract-proposal.md",
};

function templatesDir() {
  return join(process.cwd(), "templates");
}

export function loadDocumentTemplate(documentType: DocumentType): string {
  const filename = TEMPLATE_FILES[documentType];
  const path = join(templatesDir(), filename);
  return readFileSync(path, "utf-8");
}

export function fillTemplatePlaceholders(
  template: string,
  opp: Opportunity,
): string {
  const p = DFEAL_PROFILE;
  const replacements: Record<string, string> = {
    "{{LEGAL_NAME}}": p.legalName,
    "{{UEI}}": p.uei,
    "{{CAGE}}": p.cage,
    "{{SAM_STATUS}}": p.samStatus,
    "{{PRIMARY_NAICS}}": p.primaryNaics,
    "{{CONTACT_EMAIL}}": p.teamContactEmail,
    "{{PHONE}}": p.phone,
    "{{WEBSITE}}": p.website,
    "{{ADDRESS}}": p.address,
    "{{AGENCY_NAME}}": opp.agency_name ?? "Contracting Agency",
    "{{OPPORTUNITY_TITLE}}": opp.title,
    "{{NOTICE_ID}}": opp.external_id,
    "{{NAICS}}": opp.naics ?? p.primaryNaics,
    "{{SET_ASIDE}}": opp.set_aside ?? "Unrestricted",
    "{{RESPONSE_DEADLINE}}": opp.response_deadline
      ? new Date(opp.response_deadline).toLocaleDateString()
      : "TBD",
  };

  let out = template;
  for (const [key, value] of Object.entries(replacements)) {
    out = out.split(key).join(value);
  }
  return out;
}

export function getFilledTemplate(documentType: DocumentType, opp: Opportunity) {
  const raw = loadDocumentTemplate(documentType);
  return fillTemplatePlaceholders(raw, opp);
}
