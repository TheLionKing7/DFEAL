import type { NoticeType } from "@/shared/types/opportunity";

export const DOCUMENT_TYPES = [
  {
    id: "capability_statement",
    label: "Capability Statement",
    description:
      "Full qualifications package: cover letter, executive summary, technical approach, past performance, and management plan.",
    noticeTypes: ["special_notice", "presolicitation", "other"] as NoticeType[],
    keywords: [
      "capability statement",
      "capabilities brief",
      "qualifications package",
      "company profile",
      "vendor registration",
    ],
  },
  {
    id: "rfi_response",
    label: "RFI Response",
    description: "Structured response to a Request for Information with capability and approach narrative.",
    noticeTypes: ["sources_sought", "presolicitation", "special_notice"] as NoticeType[],
    keywords: ["rfi", "request for information", "information request", "market survey"],
  },
  {
    id: "sources_sought_response",
    label: "Sources Sought Response",
    description: "Capability-focused response for sources sought / market research notices.",
    noticeTypes: ["sources_sought"] as NoticeType[],
    keywords: [
      "sources sought",
      "source sought",
      "ssn",
      "market research",
      "industry day",
      "capability review",
    ],
  },
  {
    id: "cta_proposal",
    label: "CTA Proposal",
    description: "Call-to-action / teaming proposal for subcontractor or partner solicitations.",
    noticeTypes: ["special_notice", "presolicitation", "solicitation"] as NoticeType[],
    keywords: [
      "cta",
      "call to action",
      "teaming",
      "subcontract",
      "partner",
      "joint venture",
      "mentor-protege",
    ],
  },
  {
    id: "contract_proposal",
    label: "Contract Proposal",
    description: "Full technical and management proposal for RFP/RFQ/IFB solicitations.",
    noticeTypes: ["solicitation"] as NoticeType[],
    keywords: [
      "rfp",
      "rfq",
      "ifb",
      "invitation for bid",
      "request for proposal",
      "solicitation",
      "proposal due",
      "volume",
      "section l",
      "section m",
    ],
  },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]["id"];

/** Legacy section types — still readable in document history */
export const LEGACY_DOCUMENT_LABELS: Record<string, string> = {
  executive_summary: "Executive summary (legacy)",
  technical_approach: "Technical approach (legacy)",
  past_performance: "Past performance (legacy)",
  management_plan: "Management plan (legacy)",
  cover_letter: "Cover letter (legacy)",
};

export function getDocumentTypeLabel(id: string): string {
  const found = DOCUMENT_TYPES.find((d) => d.id === id);
  if (found) return found.label;
  return LEGACY_DOCUMENT_LABELS[id] ?? id.replace(/_/g, " ");
}

export function getDocumentTypeMeta(id: DocumentType) {
  return DOCUMENT_TYPES.find((d) => d.id === id);
}
